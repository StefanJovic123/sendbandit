import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import { loggerMiddleware, webhookCorsMiddleware, webhookRateLimit } from '@sendbandit/middleware'
import { generateId } from '@sendbandit/shared/utils'
import {
  WhatsAppProvider,
  TelegramProvider,
  FacebookProvider,
  InstagramProvider,
  SlackProvider,
  DiscordProvider,
} from '@sendbandit/channel-providers'
import type { HonoEnv, Channel } from '@sendbandit/shared/types'

const app = new Hono<HonoEnv>()

// Helper to create Supabase client
function getSupabase(env: HonoEnv['Bindings']) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

app.use('*', loggerMiddleware)
app.use('*', webhookCorsMiddleware)
app.use('*', webhookRateLimit)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'webhooks' }))

// WhatsApp webhook verification (GET for verification challenge)
app.get('/whatsapp/:connectionId', async (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('credentials')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.text('Connection not found', 404)
  }

  // Verify token from connection credentials
  const verifyToken = connection.credentials.webhookVerifyToken

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified')
    return c.text(challenge || '')
  }

  return c.text('Verification failed', 403)
})

// WhatsApp webhook
app.post('/whatsapp/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new WhatsAppProvider({
    channel: 'whatsapp',
    credentials: connection.credentials,
    webhookSecret: connection.credentials.appSecret,
  })

  // Verify signature
  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const isValid = await provider.verifyWebhook({ headers, body })
  if (!isValid) {
    console.warn('Invalid WhatsApp webhook signature')
  }

  // Parse and process webhook
  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'whatsapp', event)
  }

  return c.json({ received: true })
})

// Telegram webhook
app.post('/telegram/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new TelegramProvider({
    channel: 'telegram',
    credentials: connection.credentials,
    webhookSecret: connection.credentials.webhookSecret,
  })

  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const isValid = await provider.verifyWebhook({ headers, body })
  if (!isValid) {
    console.warn('Invalid Telegram webhook signature')
  }

  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'telegram', event)
  }

  return c.json({ received: true })
})

// Facebook webhook verification
app.get('/facebook/:connectionId', async (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('credentials')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.text('Connection not found', 404)
  }

  const verifyToken = connection.credentials.webhookVerifyToken

  if (mode === 'subscribe' && token === verifyToken) {
    return c.text(challenge || '')
  }

  return c.text('Verification failed', 403)
})

// Facebook webhook
app.post('/facebook/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new FacebookProvider({
    channel: 'facebook',
    credentials: connection.credentials,
  })

  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'facebook', event)
  }

  return c.json({ received: true })
})

// Instagram webhook (same verification as Facebook)
app.get('/instagram/:connectionId', async (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')

  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('credentials')
    .eq('id', connectionId)
    .single()

  if (connection && mode === 'subscribe' && token === connection.credentials.webhookVerifyToken) {
    return c.text(challenge || '')
  }

  return c.text('Verification failed', 403)
})

app.post('/instagram/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new InstagramProvider({
    channel: 'instagram',
    credentials: connection.credentials,
  })

  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'instagram', event)
  }

  return c.json({ received: true })
})

// Slack webhook
app.post('/slack/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  // Handle URL verification challenge
  try {
    const payload = JSON.parse(body)
    if (payload.type === 'url_verification') {
      return c.text(payload.challenge)
    }
  } catch {
    // Not JSON, continue
  }

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new SlackProvider({
    channel: 'slack',
    credentials: connection.credentials,
  })

  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'slack', event)
  }

  return c.json({ received: true })
})

// Discord webhook
app.post('/discord/:connectionId', async (c) => {
  const { connectionId } = c.req.param()
  const supabase = getSupabase(c.env)
  const body = await c.req.text()

  // Handle Discord ping
  try {
    const payload = JSON.parse(body)
    if (payload.type === 1) {
      return c.json({ type: 1 }) // Pong
    }
  } catch {
    // Not JSON, continue
  }

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404)
  }

  const provider = new DiscordProvider({
    channel: 'discord',
    credentials: connection.credentials,
  })

  const event = await provider.parseWebhook(body)

  if (event) {
    await processWebhookEvent(supabase, connection.organization_id, 'discord', event)
  }

  return c.json({ received: true })
})

// Helper to process webhook events
async function processWebhookEvent(
  supabase: ReturnType<typeof getSupabase>,
  organizationId: string,
  channel: Channel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: { type: string; data: any }
) {
  console.log(`Processing ${channel} webhook:`, event.type)

  if (event.type === 'message_status') {
    const data = event.data as {
      messageId: string
      status: string
      timestamp: Date
      error?: { message: string }
    }

    // Find and update message by provider ID
    const { data: message } = await supabase
      .from('messages')
      .select('id')
      .eq('provider_message_id', data.messageId)
      .single()

    if (message) {
      const updates: Record<string, unknown> = {
        status: data.status,
      }

      switch (data.status) {
        case 'delivered':
          updates.delivered_at = data.timestamp
          break
        case 'read':
          updates.read_at = data.timestamp
          break
        case 'failed':
          updates.failed_at = data.timestamp
          updates.failure_reason = data.error?.message
          break
      }

      await supabase.from('messages').update(updates).eq('id', message.id)
    }
  } else if (event.type === 'incoming_message') {
    const data = event.data as {
      messageId: string
      senderId: string
      senderName?: string
      timestamp: Date
      content: { type: string; text?: string }
    }

    // Find contact by channel ID
    const channelIdField = `${channel}_id`

    // Get all clients for this organization to find the contact
    const { data: orgClients } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)

    const clientIds = (orgClients || []).map((c) => c.id)

    // This is a simplified lookup - in production you'd want a more efficient query
    for (const clientId of clientIds) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('client_id', clientId)
        .eq(channelIdField, data.senderId)
        .single()

      if (contact) {
        // Store incoming message
        await supabase.from('messages').insert({
          id: generateId('message'),
          contact_id: contact.id,
          channel,
          direction: 'inbound',
          status: 'delivered',
          content: data.content,
          provider_message_id: data.messageId,
          delivered_at: data.timestamp,
        })

        // Update contact's last_inbound_at for conversation window tracking
        await supabase
          .from('contacts')
          .update({ last_inbound_at: new Date().toISOString() })
          .eq('id', contact.id)

        break
      }
    }
  }
}

export default app
