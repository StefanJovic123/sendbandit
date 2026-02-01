import { createClient } from '@supabase/supabase-js'
import { generateId } from '@sendbandit/shared/utils'
import type { Env } from '@sendbandit/shared/types'

interface ScheduledController {
  cron: string
  scheduledTime: number
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
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const supabase = getSupabase(env)
    const now = new Date()

    try {
      switch (controller.cron) {
        case '* * * * *':
          // Every minute: Process scheduled campaigns
          await processScheduledCampaigns(supabase, env, now)
          break

        case '*/5 * * * *':
          // Every 5 minutes: Resume waiting enrollments
          await resumeWaitingEnrollments(supabase, env, now)
          break

        case '0 * * * *':
          // Every hour: Aggregate analytics
          await aggregateAnalytics(supabase, now)
          break
      }
    } catch (error) {
      console.error(`Scheduler error for ${controller.cron}:`, error)
    }
  },
}

async function processScheduledCampaigns(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  now: Date
) {
  // Find campaigns scheduled to start
  const { data: scheduledCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())

  for (const campaign of scheduledCampaigns || []) {
    console.log(`Activating campaign: ${campaign.id}`)

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', campaign.id)

    // If it's a segment-based trigger, enroll contacts from segment
    const triggerConfig = campaign.trigger_config as { segmentId?: string } | null
    if (triggerConfig?.segmentId) {
      await enrollContactsFromSegment(supabase, env, campaign, triggerConfig.segmentId)
    }
  }

  console.log(`Processed ${(scheduledCampaigns || []).length} scheduled campaigns`)
}

async function resumeWaitingEnrollments(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  now: Date
) {
  // Find enrollments that have finished waiting
  const { data: waitingEnrollments } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('status', 'waiting')
    .lte('wait_until', now.toISOString())
    .limit(100)

  for (const enrollment of waitingEnrollments || []) {
    console.log(`Resuming enrollment: ${enrollment.id}`)

    // Get campaign to find next node
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', enrollment.campaign_id)
      .single()

    if (!campaign || campaign.status !== 'active') {
      // Campaign no longer active, cancel enrollment
      await supabase
        .from('campaign_enrollments')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('id', enrollment.id)
      continue
    }

    // Find next node in flow
    const flowData = campaign.flow_data as {
      nodes: Array<{ id: string; type: string }>
      edges: Array<{ source: string; target: string }>
    } | null

    if (!flowData || !enrollment.current_node_id) {
      await supabase
        .from('campaign_enrollments')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id)
      continue
    }

    // Find outgoing edge from current node
    const nextEdge = flowData.edges.find((e) => e.source === enrollment.current_node_id)

    if (!nextEdge) {
      // No next node, enrollment complete
      await supabase
        .from('campaign_enrollments')
        .update({
          status: 'completed',
          completed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id)
      continue
    }

    // Queue the next node for processing
    const nextNode = flowData.nodes.find((n) => n.id === nextEdge.target)

    if (nextNode) {
      // Update enrollment to active with new current node
      await supabase
        .from('campaign_enrollments')
        .update({
          status: 'active',
          current_node_id: nextNode.id,
          wait_until: null,
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id)

      // Queue for processing
      await env.MESSAGE_QUEUE.send({
        type: 'process_node',
        enrollmentId: enrollment.id,
        nodeId: nextNode.id,
      })
    }
  }

  console.log(`Resumed ${(waitingEnrollments || []).length} enrollments`)
}

async function aggregateAnalytics(supabase: ReturnType<typeof getSupabase>, now: Date) {
  const today = now.toISOString().split('T')[0]

  try {
    // Get all organizations
    const { data: orgs } = await supabase.from('organizations').select('id')

    for (const org of orgs || []) {
      await aggregateOrgDailyStats(supabase, org.id, today)
    }

    // Get all active campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .in('status', ['active', 'paused'])

    for (const campaign of campaigns || []) {
      await aggregateCampaignStats(supabase, campaign.id, today)
    }

    console.log(`Analytics aggregation for ${today} completed`)
  } catch (error) {
    console.error('Analytics aggregation failed:', error)
  }
}

async function aggregateOrgDailyStats(
  supabase: ReturnType<typeof getSupabase>,
  orgId: string,
  date: string
) {
  // Get clients for this org
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', orgId)

  const clientIds = (clients || []).map((c) => c.id)
  if (clientIds.length === 0) return

  // Get contacts for these clients
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .in('client_id', clientIds)

  const contactIds = (contacts || []).map((c) => c.id)
  if (contactIds.length === 0) return

  // Get today's start and end timestamps
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  // Count messages by status for today
  const { data: messages } = await supabase
    .from('messages')
    .select('status')
    .in('contact_id', contactIds)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  const stats = {
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
    messagesFailed: 0,
  }

  for (const msg of messages || []) {
    switch (msg.status) {
      case 'sent':
        stats.messagesSent++
        break
      case 'delivered':
        stats.messagesDelivered++
        stats.messagesSent++
        break
      case 'read':
        stats.messagesRead++
        stats.messagesDelivered++
        stats.messagesSent++
        break
      case 'failed':
        stats.messagesFailed++
        break
    }
  }

  // Count new contacts created today
  const { count: newContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  // Count active campaigns
  const { count: activeCampaigns } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIds)
    .eq('status', 'active')

  // Upsert daily stats
  const statsId = `ds_${orgId}_${date}`
  await supabase.from('daily_stats').upsert({
    id: statsId,
    organization_id: orgId,
    date,
    messages_sent: stats.messagesSent,
    messages_delivered: stats.messagesDelivered,
    messages_read: stats.messagesRead,
    messages_failed: stats.messagesFailed,
    new_contacts: newContacts || 0,
    active_campaigns: activeCampaigns || 0,
    updated_at: new Date().toISOString(),
  })
}

async function aggregateCampaignStats(
  supabase: ReturnType<typeof getSupabase>,
  campaignId: string,
  date: string
) {
  // Get enrollment stats
  const { data: enrollments } = await supabase
    .from('campaign_enrollments')
    .select('status')
    .eq('campaign_id', campaignId)

  const enrollmentStats = {
    total: 0,
    active: 0,
    completed: 0,
    failed: 0,
  }

  for (const e of enrollments || []) {
    enrollmentStats.total++
    switch (e.status) {
      case 'active':
      case 'waiting':
        enrollmentStats.active++
        break
      case 'completed':
        enrollmentStats.completed++
        break
      case 'failed':
        enrollmentStats.failed++
        break
    }
  }

  // Get today's start and end timestamps
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  // Count messages by status for today
  const { data: messages } = await supabase
    .from('messages')
    .select('status')
    .eq('campaign_id', campaignId)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  const messageStats = {
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  }

  for (const msg of messages || []) {
    switch (msg.status) {
      case 'sent':
        messageStats.sent++
        break
      case 'delivered':
        messageStats.delivered++
        messageStats.sent++
        break
      case 'read':
        messageStats.read++
        messageStats.delivered++
        messageStats.sent++
        break
      case 'failed':
        messageStats.failed++
        break
    }
  }

  // Upsert campaign stats
  const statsId = `cs_${campaignId}_${date}`
  await supabase.from('campaign_stats').upsert({
    id: statsId,
    campaign_id: campaignId,
    date,
    total_enrollments: enrollmentStats.total,
    active_enrollments: enrollmentStats.active,
    completed_enrollments: enrollmentStats.completed,
    failed_enrollments: enrollmentStats.failed,
    messages_sent: messageStats.sent,
    messages_delivered: messageStats.delivered,
    messages_read: messageStats.read,
    messages_failed: messageStats.failed,
    updated_at: new Date().toISOString(),
  })
}

interface SegmentFilter {
  field: string
  operator: string
  value: unknown
}

async function enrollContactsFromSegment(
  supabase: ReturnType<typeof getSupabase>,
  env: Env,
  campaign: Record<string, unknown>,
  segmentId: string
) {
  // Get the segment
  const { data: segment, error: segmentError } = await supabase
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .single()

  if (segmentError || !segment) {
    console.error(`Segment not found: ${segmentId}`)
    return
  }

  // Get the flow data to find the first node after trigger
  const flowData = campaign.flow_data as {
    nodes: Array<{ id: string; type: string }>
    edges: Array<{ source: string; target: string }>
  } | null

  const triggerNode = flowData?.nodes?.find((n) => n.type === 'trigger')
  const firstEdge = triggerNode ? flowData?.edges?.find((e) => e.source === triggerNode.id) : null
  const firstNodeId = firstEdge?.target || null

  // Build query for contacts matching segment filters
  let query = supabase
    .from('contacts')
    .select('id')
    .eq('client_id', campaign.client_id)

  const filters = segment.filters as SegmentFilter[] | null
  if (filters && Array.isArray(filters)) {
    for (const filter of filters) {
      query = applyFilter(query, filter)
    }
  }

  const { data: contacts, error: contactsError } = await query

  if (contactsError) {
    console.error(`Failed to query contacts for segment ${segmentId}:`, contactsError)
    return
  }

  if (!contacts || contacts.length === 0) {
    console.log(`No contacts found for segment: ${segmentId}`)
    return
  }

  console.log(`Enrolling ${contacts.length} contacts from segment ${segmentId}`)

  // Enroll each contact
  const now = new Date().toISOString()
  for (const contact of contacts) {
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('campaign_enrollments')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('contact_id', contact.id)
      .single()

    if (existing) continue

    const enrollmentId = generateId('enrollment')

    await supabase.from('campaign_enrollments').insert({
      id: enrollmentId,
      campaign_id: campaign.id,
      contact_id: contact.id,
      status: 'active',
      current_node_id: firstNodeId,
      node_history: [],
      created_at: now,
      updated_at: now,
    })

    // Queue the first node for processing
    if (firstNodeId) {
      await env.MESSAGE_QUEUE.send({
        type: 'process_node',
        enrollmentId,
        nodeId: firstNodeId,
      })
    }
  }

  console.log(`Enrolled ${contacts.length} contacts in campaign ${campaign.id}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, filter: SegmentFilter): any {
  const { field, operator, value } = filter

  // Map segment field names to database column names
  const fieldMap: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    whatsappId: 'whatsapp_id',
    telegramId: 'telegram_id',
    facebookId: 'facebook_id',
    instagramId: 'instagram_id',
    slackId: 'slack_id',
    discordId: 'discord_id',
    createdAt: 'created_at',
  }

  const dbField = fieldMap[field] || field

  switch (operator) {
    case 'equals':
    case 'eq':
      return query.eq(dbField, value)
    case 'not_equals':
    case 'neq':
      return query.neq(dbField, value)
    case 'contains':
    case 'ilike':
      return query.ilike(dbField, `%${value}%`)
    case 'starts_with':
      return query.ilike(dbField, `${value}%`)
    case 'ends_with':
      return query.ilike(dbField, `%${value}`)
    case 'is_set':
    case 'not_null':
      return query.not(dbField, 'is', null)
    case 'is_not_set':
    case 'is_null':
      return query.is(dbField, null)
    case 'gt':
      return query.gt(dbField, value)
    case 'gte':
      return query.gte(dbField, value)
    case 'lt':
      return query.lt(dbField, value)
    case 'lte':
      return query.lte(dbField, value)
    default:
      console.warn(`Unknown filter operator: ${operator}`)
      return query
  }
}
