import { createClient } from '@supabase/supabase-js'
import { generateId, addDuration } from '@sendbandit/shared/utils'
import { createProvider } from '@sendbandit/channel-providers'
import type { Env, Channel } from '@sendbandit/shared/types'

interface MessagePayload {
  type: 'send_message' | 'process_node'
  // For send_message
  contactId?: string
  channel?: Channel
  templateId?: string
  variables?: Record<string, string>
  campaignId?: string
  enrollmentId?: string
  // For process_node
  nodeId?: string
}

interface QueueMessage {
  body: MessagePayload
  ack: () => void
  retry: () => void
}

interface MessageBatch {
  messages: QueueMessage[]
}

function getSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export default {
  async queue(batch: MessageBatch, env: Env) {
    const supabase = getSupabase(env)

    for (const message of batch.messages) {
      try {
        switch (message.body.type) {
          case 'send_message':
            await processSendMessage(supabase, env, message.body)
            break

          case 'process_node':
            await processNode(supabase, env, message.body)
            break
        }

        message.ack()
      } catch (error) {
        console.error('Queue processing error:', error)
        message.retry()
      }
    }
  },
}

async function processSendMessage(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  payload: MessagePayload
) {
  const { contactId, channel, templateId, variables = {}, campaignId, enrollmentId } = payload

  if (!contactId || !channel) {
    throw new Error('Missing required fields: contactId, channel')
  }

  // Get contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (contactError || !contact) {
    throw new Error(`Contact not found: ${contactId}`)
  }

  // Get recipient ID based on channel
  const recipientId = getRecipientId(contact, channel)
  if (!recipientId) {
    throw new Error(`Contact ${contactId} has no ${channel} ID`)
  }

  // Get template content
  let content: { type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'interactive'; text?: string; mediaUrl?: string } = { type: 'text', text: '' }

  if (templateId) {
    const { data: template } = await supabase
      .from('templates')
      .select('current_version_id')
      .eq('id', templateId)
      .single()

    if (template?.current_version_id) {
      const { data: version } = await supabase
        .from('template_versions')
        .select('content')
        .eq('id', template.current_version_id)
        .single()

      if (version) {
        content = version.content as typeof content
      }
    }
  }

  // Get client to find organization
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('organization_id')
    .eq('id', contact.client_id)
    .single()

  if (clientError || !client) {
    throw new Error(`Client not found for contact: ${contactId}`)
  }

  // Get channel connection for credentials
  const { data: connection, error: connectionError } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('organization_id', client.organization_id)
    .eq('channel', channel)
    .eq('is_active', true)
    .single()

  if (connectionError || !connection) {
    throw new Error(`No active ${channel} connection for organization`)
  }

  // Create message record
  const messageId = generateId('message')
  await supabase.from('messages').insert({
    id: messageId,
    campaign_id: campaignId,
    enrollment_id: enrollmentId,
    contact_id: contactId,
    template_id: templateId,
    channel,
    direction: 'outbound',
    status: 'queued',
    content,
  })

  // Send via provider
  const provider = createProvider({
    channel,
    credentials: connection.credentials,
  })

  const result = await provider.sendMessage({
    recipientId,
    content: content as Parameters<typeof provider.sendMessage>[0]['content'],
    variables,
  })

  // Update message status
  if (result.success) {
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        provider_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', messageId)
  } else {
    await supabase
      .from('messages')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: result.error?.message,
      })
      .eq('id', messageId)

    throw new Error(result.error?.message || 'Failed to send message')
  }
}

async function processNode(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  payload: MessagePayload
) {
  const { enrollmentId, nodeId } = payload

  if (!enrollmentId || !nodeId) {
    throw new Error('Missing required fields: enrollmentId, nodeId')
  }

  const { data: enrollment } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .single()

  if (!enrollment || enrollment.status !== 'active') {
    return // Enrollment no longer active
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', enrollment.campaign_id)
    .single()

  if (!campaign || campaign.status !== 'active') {
    return // Campaign no longer active
  }

  const flowData = campaign.flow_data as {
    nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>
    edges: Array<{ source: string; target: string; sourceHandle?: string }>
  } | null

  const node = flowData?.nodes.find((n) => n.id === nodeId)
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`)
  }

  const now = new Date()

  // Update node history
  const nodeHistory = (enrollment.node_history as Array<{
    nodeId: string
    enteredAt: string
    exitedAt: string | null
  }>) || []

  nodeHistory.push({
    nodeId,
    enteredAt: now.toISOString(),
    exitedAt: null,
  })

  // Process based on node type
  switch (node.type) {
    case 'send_message': {
      const { templateId, channel } = node.data as { templateId?: string; channel?: Channel }

      if (templateId && channel) {
        await env.MESSAGE_QUEUE.send({
          type: 'send_message',
          contactId: enrollment.contact_id,
          channel,
          templateId,
          variables: {},
          campaignId: campaign.id,
          enrollmentId,
        })
      }

      await moveToNextNode(supabase, env, enrollment, flowData, nodeId, nodeHistory)
      break
    }

    case 'wait': {
      const { waitDuration } = node.data as {
        waitDuration?: { value: number; unit: 'minutes' | 'hours' | 'days' }
      }

      if (waitDuration) {
        const waitUntil = addDuration(now, waitDuration.value, waitDuration.unit)

        await supabase
          .from('campaign_enrollments')
          .update({
            status: 'waiting',
            wait_until: waitUntil.toISOString(),
            node_history: nodeHistory,
            updated_at: now.toISOString(),
          })
          .eq('id', enrollmentId)
      } else {
        await moveToNextNode(supabase, env, enrollment, flowData, nodeId, nodeHistory)
      }
      break
    }

    case 'condition': {
      const { condition } = node.data as {
        condition?: { field: string; operator: string; value: unknown }
      }

      // Get contact to evaluate condition
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', enrollment.contact_id)
        .single()

      let outcome = 'false'
      if (condition && contact) {
        const fieldValue = (contact as Record<string, unknown>)[condition.field]
        outcome = evaluateCondition(fieldValue, condition.operator, condition.value)
          ? 'true'
          : 'false'
      }

      // Find edge with matching handle
      const nextEdge = flowData?.edges.find(
        (e) => e.source === nodeId && e.sourceHandle === outcome
      )

      if (nextEdge) {
        await supabase
          .from('campaign_enrollments')
          .update({
            current_node_id: nextEdge.target,
            node_history: nodeHistory,
            updated_at: now.toISOString(),
          })
          .eq('id', enrollmentId)

        await env.MESSAGE_QUEUE.send({
          type: 'process_node',
          enrollmentId,
          nodeId: nextEdge.target,
        })
      } else {
        // No matching path, complete enrollment
        await supabase
          .from('campaign_enrollments')
          .update({
            status: 'completed',
            completed_at: now.toISOString(),
            node_history: nodeHistory,
            updated_at: now.toISOString(),
          })
          .eq('id', enrollmentId)
      }
      break
    }

    case 'end': {
      await supabase
        .from('campaign_enrollments')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
          node_history: nodeHistory,
          updated_at: now.toISOString(),
        })
        .eq('id', enrollmentId)
      break
    }

    default:
      await moveToNextNode(supabase, env, enrollment, flowData, nodeId, nodeHistory)
  }
}

async function moveToNextNode(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  enrollment: { id: string; contact_id: string },
  flowData: { edges: Array<{ source: string; target: string }> } | null,
  currentNodeId: string,
  nodeHistory: Array<{ nodeId: string; enteredAt: string; exitedAt: string | null }>
) {
  const now = new Date()

  // Update exit time for current node
  const lastEntry = nodeHistory.find((h) => h.nodeId === currentNodeId && !h.exitedAt)
  if (lastEntry) {
    lastEntry.exitedAt = now.toISOString()
  }

  const nextEdge = flowData?.edges.find((e) => e.source === currentNodeId)

  if (nextEdge) {
    await supabase
      .from('campaign_enrollments')
      .update({
        current_node_id: nextEdge.target,
        node_history: nodeHistory,
        updated_at: now.toISOString(),
      })
      .eq('id', enrollment.id)

    await env.MESSAGE_QUEUE.send({
      type: 'process_node',
      enrollmentId: enrollment.id,
      nodeId: nextEdge.target,
    })
  } else {
    // No next node, complete
    await supabase
      .from('campaign_enrollments')
      .update({
        status: 'completed',
        completed_at: now.toISOString(),
        node_history: nodeHistory,
        updated_at: now.toISOString(),
      })
      .eq('id', enrollment.id)
  }
}

function getRecipientId(
  contact: { whatsapp_id: string | null; telegram_id: string | null; facebook_id: string | null; instagram_id: string | null; slack_id: string | null; discord_id: string | null },
  channel: Channel
): string | null {
  switch (channel) {
    case 'whatsapp':
      return contact.whatsapp_id
    case 'telegram':
      return contact.telegram_id
    case 'facebook':
      return contact.facebook_id
    case 'instagram':
      return contact.instagram_id
    case 'slack':
      return contact.slack_id
    case 'discord':
      return contact.discord_id
    default:
      return null
  }
}

function evaluateCondition(fieldValue: unknown, operator: string, compareValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === compareValue
    case 'not_equals':
      return fieldValue !== compareValue
    case 'contains':
      return String(fieldValue).includes(String(compareValue))
    case 'is_null':
      return fieldValue === null || fieldValue === undefined
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined
    default:
      return false
  }
}
