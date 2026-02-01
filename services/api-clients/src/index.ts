import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorHandler,
  authMiddleware,
  orgContextMiddleware,
  defaultRateLimit,
  bulkRateLimit,
  notFound,
  badRequest,
} from '@sendbandit/middleware'
import { generateId } from '@sendbandit/shared/utils'
import {
  createClientSchema,
  updateClientSchema,
  createContactSchema,
  updateContactSchema,
  importContactsSchema,
  createTagSchema,
  createSegmentSchema,
  paginationSchema,
} from '@sendbandit/shared/validators'
import type { HonoEnv } from '@sendbandit/shared/types'
import {
  WhatsAppProvider,
  TelegramProvider,
  FacebookProvider,
  InstagramProvider,
  SlackProvider,
  DiscordProvider,
} from '@sendbandit/channel-providers'

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

// Health check (before auth)
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-clients' }))

// Global middleware
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.use('*', defaultRateLimit)
app.use('*', authMiddleware)
app.use('*', orgContextMiddleware)
app.onError(errorHandler)

// ============ CHANNEL CONNECTIONS ============
// Note: These MUST be mounted BEFORE the /:id client routes to avoid route conflicts

const channelApp = new Hono<HonoEnv>()

// List channel connections
channelApp.get('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: channels, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Transform to camelCase and mask credentials
  const transformedChannels = (channels || []).map((ch) => ({
    id: ch.id,
    organizationId: ch.organization_id,
    channel: ch.channel,
    name: ch.name,
    credentials: maskCredentials(ch.credentials),
    isActive: ch.is_active,
    webhookUrl: ch.webhook_url,
    webhookSecret: ch.webhook_secret,
    lastVerifiedAt: ch.last_verified_at,
    createdAt: ch.created_at,
    updatedAt: ch.updated_at,
  }))

  return c.json({ data: transformedChannels })
})

// Get channel connection
channelApp.get('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: ch, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !ch) throw notFound('Channel connection')

  return c.json({
    data: {
      id: ch.id,
      organizationId: ch.organization_id,
      channel: ch.channel,
      name: ch.name,
      credentials: maskCredentials(ch.credentials),
      isActive: ch.is_active,
      webhookUrl: ch.webhook_url,
      webhookSecret: ch.webhook_secret,
      lastVerifiedAt: ch.last_verified_at,
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
    },
  })
})

// Create channel connection
channelApp.post('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()

  // Validate required fields
  if (!body.channel || !body.name || !body.credentials) {
    throw badRequest('channel, name, and credentials are required')
  }

  const validChannels = ['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord']
  if (!validChannels.includes(body.channel)) {
    throw badRequest(`Invalid channel. Must be one of: ${validChannels.join(', ')}`)
  }

  const connectionId = generateId('channelConnection')
  const webhookSecret = `whs_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const newConnection = {
    id: connectionId,
    organization_id: org.id,
    channel: body.channel,
    name: body.name,
    credentials: body.credentials,
    is_active: body.isActive ?? true,
    webhook_url: `https://webhooks.sendbandit.local/${body.channel}/${connectionId}`,
    webhook_secret: webhookSecret,
  }

  const { error } = await supabase.from('channel_connections').insert(newConnection)
  if (error) throw new Error(error.message)

  return c.json({
    data: {
      id: newConnection.id,
      organizationId: newConnection.organization_id,
      channel: newConnection.channel,
      name: newConnection.name,
      credentials: maskCredentials(newConnection.credentials),
      isActive: newConnection.is_active,
      webhookUrl: newConnection.webhook_url,
      webhookSecret: newConnection.webhook_secret,
      lastVerifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }, 201)
})

// Update channel connection
channelApp.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()

  const { data: existing, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !existing) throw notFound('Channel connection')

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updateData.name = body.name
  if (body.credentials !== undefined) updateData.credentials = body.credentials
  if (body.isActive !== undefined) updateData.is_active = body.isActive

  await supabase.from('channel_connections').update(updateData).eq('id', id)

  // Fetch updated connection
  const { data: updated } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', id)
    .single()

  const ch = updated || existing
  return c.json({
    data: {
      id: ch.id,
      organizationId: ch.organization_id,
      channel: ch.channel,
      name: ch.name,
      credentials: maskCredentials(ch.credentials),
      isActive: ch.is_active,
      webhookUrl: ch.webhook_url,
      webhookSecret: ch.webhook_secret,
      lastVerifiedAt: ch.last_verified_at,
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
    },
  })
})

// Delete channel connection
channelApp.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: existing, error } = await supabase
    .from('channel_connections')
    .select('id')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !existing) throw notFound('Channel connection')

  await supabase.from('channel_connections').delete().eq('id', id)
  return c.json({ data: { success: true } })
})

// Verify channel connection
channelApp.post('/:id/verify', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: connection, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !connection) throw notFound('Channel connection')

  let isValid = false
  let verifyError: string | undefined

  try {
    // Verify based on channel type
    switch (connection.channel) {
      case 'whatsapp': {
        const accessToken = connection.credentials.access_token
        const phoneNumberId = connection.credentials.phone_number_id
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        isValid = response.ok
        if (!isValid) {
          const data = await response.json() as { error?: { message?: string } }
          verifyError = data.error?.message || 'Invalid credentials'
        }
        break
      }
      case 'telegram': {
        const botToken = connection.credentials.bot_token
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
        isValid = response.ok
        if (!isValid) {
          const data = await response.json() as { description?: string }
          verifyError = data.description || 'Invalid bot token'
        }
        break
      }
      case 'slack': {
        const botToken = connection.credentials.bot_token
        const response = await fetch('https://slack.com/api/auth.test', {
          headers: { Authorization: `Bearer ${botToken}` },
        })
        const data = await response.json() as { ok?: boolean; error?: string }
        isValid = data.ok === true
        if (!isValid) {
          verifyError = data.error || 'Invalid bot token'
        }
        break
      }
      case 'discord': {
        const botToken = connection.credentials.bot_token
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bot ${botToken}` },
        })
        isValid = response.ok
        if (!isValid) {
          verifyError = 'Invalid bot token'
        }
        break
      }
      case 'facebook':
      case 'instagram': {
        // Facebook and Instagram use similar verification
        const accessToken = connection.credentials.access_token || connection.credentials.page_access_token
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${accessToken}`
        )
        isValid = response.ok
        if (!isValid) {
          const data = await response.json() as { error?: { message?: string } }
          verifyError = data.error?.message || 'Invalid access token'
        }
        break
      }
      default:
        verifyError = 'Unknown channel type'
    }
  } catch (err) {
    verifyError = err instanceof Error ? err.message : 'Verification failed'
  }

  // Update last_verified_at if successful
  if (isValid) {
    await supabase
      .from('channel_connections')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', id)
  }

  return c.json({
    data: {
      valid: isValid,
      error: verifyError,
      verifiedAt: isValid ? new Date().toISOString() : null,
    },
  })
})

// Helper to mask sensitive credentials
function maskCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && value.length > 8) {
      // Show first 4 and last 4 characters
      masked[key] = `${value.slice(0, 4)}...${value.slice(-4)}`
    } else if (typeof value === 'string') {
      masked[key] = '****'
    } else {
      masked[key] = value
    }
  }
  return masked
}

// Mount channel routes BEFORE client routes (/:id would catch /channels otherwise)
app.route('/channels', channelApp)

// ============ CLIENTS ============

// List clients
app.get('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())

  const { data: clientsList, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  if (error) throw new Error(error.message)

  // Get contact counts for each client
  const clientIds = (clientsList || []).map((c) => c.id)
  let countMap = new Map<string, number>()

  if (clientIds.length > 0) {
    // Get counts per client using a subquery approach
    for (const clientId of clientIds) {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
      countMap.set(clientId, count || 0)
    }
  }

  const clientsWithCounts = (clientsList || []).map((client) => ({
    ...client,
    contactsCount: countMap.get(client.id) || 0,
  }))

  // Get total count
  const { count: total } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id)

  return c.json({
    data: clientsWithCounts,
    meta: { total: total || 0, page: query.page, pageSize: query.pageSize },
  })
})

// Get client
app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  // Get contact count
  const { count } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)

  return c.json({
    data: {
      ...client,
      contactsCount: count || 0,
    },
  })
})

// Create client
app.post('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = createClientSchema.parse(body)

  const newClient = {
    id: generateId('client'),
    organization_id: org.id,
    name: data.name,
    description: data.description,
    industry: data.industry,
    timezone: data.timezone,
  }

  const { error } = await supabase.from('clients').insert(newClient)
  if (error) throw new Error(error.message)

  // Fetch the created client
  const { data: created } = await supabase
    .from('clients')
    .select('*')
    .eq('id', newClient.id)
    .single()

  return c.json({ data: { ...created, contactsCount: 0 } }, 201)
})

// Update client
app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = updateClientSchema.parse(body)

  const { data: existing, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !existing) throw notFound('Client')

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.industry !== undefined) updateData.industry = data.industry
  if (data.timezone !== undefined) updateData.timezone = data.timezone

  await supabase.from('clients').update(updateData).eq('id', id)

  return c.json({ data: { ...existing, ...updateData } })
})

// Delete client
app.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: existing, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !existing) throw notFound('Client')

  await supabase.from('clients').delete().eq('id', id)
  return c.json({ data: { success: true } })
})

// ============ CONTACTS ============

// List contacts
app.get('/:clientId/contacts', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())
  const search = c.req.query('search')

  // Verify client belongs to org
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  let contactQuery = supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  if (search) {
    contactQuery = contactQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: contacts } = await contactQuery

  // Transform to camelCase and add canSendText for WhatsApp
  const now = new Date()
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

  const transformedContacts = (contacts || []).map((contact) => {
    const lastInbound = contact.last_inbound_at ? new Date(contact.last_inbound_at) : null
    const canSendText = lastInbound ? (now.getTime() - lastInbound.getTime()) < TWENTY_FOUR_HOURS : false

    return {
      id: contact.id,
      clientId: contact.client_id,
      externalId: contact.external_id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      whatsappId: contact.whatsapp_id,
      telegramId: contact.telegram_id,
      facebookId: contact.facebook_id,
      instagramId: contact.instagram_id,
      slackId: contact.slack_id,
      discordId: contact.discord_id,
      metadata: contact.metadata,
      lastInboundAt: contact.last_inbound_at,
      canSendText,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }
  })

  return c.json({ data: transformedContacts })
})

// Get contact
app.get('/:clientId/contacts/:contactId', async (c) => {
  const { clientId, contactId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (clientError || !client) throw notFound('Client')

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('client_id', clientId)
    .single()

  if (contactError || !contact) throw notFound('Contact')

  // Calculate canSendText for WhatsApp 24-hour window
  const now = new Date()
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  const lastInbound = contact.last_inbound_at ? new Date(contact.last_inbound_at) : null
  const canSendText = lastInbound ? (now.getTime() - lastInbound.getTime()) < TWENTY_FOUR_HOURS : false

  return c.json({
    data: {
      id: contact.id,
      clientId: contact.client_id,
      externalId: contact.external_id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      whatsappId: contact.whatsapp_id,
      telegramId: contact.telegram_id,
      facebookId: contact.facebook_id,
      instagramId: contact.instagram_id,
      slackId: contact.slack_id,
      discordId: contact.discord_id,
      metadata: contact.metadata,
      lastInboundAt: contact.last_inbound_at,
      canSendText,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    },
  })
})

// Create contact
app.post('/:clientId/contacts', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = createContactSchema.parse(body)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  const { tags: tagIds, ...contactData } = data
  const newContact = {
    id: generateId('contact'),
    client_id: clientId,
    first_name: contactData.firstName,
    last_name: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone,
    external_id: contactData.externalId,
    whatsapp_id: contactData.whatsappId,
    telegram_id: contactData.telegramId,
    facebook_id: contactData.facebookId,
    instagram_id: contactData.instagramId,
    slack_id: contactData.slackId,
    discord_id: contactData.discordId,
    metadata: contactData.metadata || {},
  }

  await supabase.from('contacts').insert(newContact)

  // Add tags if provided
  if (tagIds && tagIds.length > 0) {
    await supabase.from('contact_tags').insert(
      tagIds.map((tagId) => ({
        id: generateId('tag'),
        contact_id: newContact.id,
        tag_id: tagId,
      }))
    )
  }

  // Return camelCase response
  return c.json({
    data: {
      id: newContact.id,
      clientId: newContact.client_id,
      externalId: newContact.external_id,
      firstName: newContact.first_name,
      lastName: newContact.last_name,
      email: newContact.email,
      phone: newContact.phone,
      whatsappId: newContact.whatsapp_id,
      telegramId: newContact.telegram_id,
      facebookId: newContact.facebook_id,
      instagramId: newContact.instagram_id,
      slackId: newContact.slack_id,
      discordId: newContact.discord_id,
      metadata: newContact.metadata,
    },
  }, 201)
})

// Update contact
app.patch('/:clientId/contacts/:contactId', async (c) => {
  const { clientId, contactId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = updateContactSchema.parse(body)

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (clientError || !client) throw notFound('Client')

  const { data: existing, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('client_id', clientId)
    .single()

  if (contactError || !existing) throw notFound('Contact')

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.firstName !== undefined) updateData.first_name = data.firstName
  if (data.lastName !== undefined) updateData.last_name = data.lastName
  if (data.email !== undefined) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.whatsappId !== undefined) updateData.whatsapp_id = data.whatsappId
  if (data.telegramId !== undefined) updateData.telegram_id = data.telegramId
  if (data.facebookId !== undefined) updateData.facebook_id = data.facebookId
  if (data.instagramId !== undefined) updateData.instagram_id = data.instagramId
  if (data.slackId !== undefined) updateData.slack_id = data.slackId
  if (data.discordId !== undefined) updateData.discord_id = data.discordId
  if (data.metadata !== undefined) updateData.metadata = data.metadata

  await supabase.from('contacts').update(updateData).eq('id', contactId)

  // Fetch updated contact and return camelCase
  const { data: updated } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  const contact = updated || existing
  return c.json({
    data: {
      id: contact.id,
      clientId: contact.client_id,
      externalId: contact.external_id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      whatsappId: contact.whatsapp_id,
      telegramId: contact.telegram_id,
      facebookId: contact.facebook_id,
      instagramId: contact.instagram_id,
      slackId: contact.slack_id,
      discordId: contact.discord_id,
      metadata: contact.metadata,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    },
  })
})

// Delete contact
app.delete('/:clientId/contacts/:contactId', async (c) => {
  const { clientId, contactId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  await supabase.from('contacts').delete().eq('id', contactId)
  return c.json({ data: { success: true } })
})

// Import contacts (bulk)
app.post('/:clientId/contacts/import', bulkRateLimit, async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = importContactsSchema.parse(body)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  let imported = 0
  let updated = 0
  let failed = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < data.contacts.length; i++) {
    const contactData = data.contacts[i]
    try {
      if (data.updateExisting && contactData.externalId) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('client_id', clientId)
          .eq('external_id', contactData.externalId)
          .single()

        if (existing) {
          await supabase
            .from('contacts')
            .update({
              first_name: contactData.firstName,
              last_name: contactData.lastName,
              email: contactData.email,
              phone: contactData.phone,
              whatsapp_id: contactData.whatsappId,
              telegram_id: contactData.telegramId,
              facebook_id: contactData.facebookId,
              instagram_id: contactData.instagramId,
              slack_id: contactData.slackId,
              discord_id: contactData.discordId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          updated++
          continue
        }
      }

      await supabase.from('contacts').insert({
        id: generateId('contact'),
        client_id: clientId,
        first_name: contactData.firstName,
        last_name: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        external_id: contactData.externalId,
        whatsapp_id: contactData.whatsappId,
        telegram_id: contactData.telegramId,
        facebook_id: contactData.facebookId,
        instagram_id: contactData.instagramId,
        slack_id: contactData.slackId,
        discord_id: contactData.discordId,
      })
      imported++
    } catch (err) {
      failed++
      errors.push({ row: i, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return c.json({ data: { imported, updated, failed, errors: errors.slice(0, 10) } })
})

// ============ MESSAGES ============

// Helper to transform snake_case credentials to camelCase
function transformCredentials(credentials: Record<string, string>): Record<string, string> {
  const mapping: Record<string, string> = {
    // WhatsApp
    access_token: 'accessToken',
    phone_number_id: 'phoneNumberId',
    business_account_id: 'businessAccountId',
    // Telegram
    bot_token: 'botToken',
    // Facebook
    page_access_token: 'pageAccessToken',
    app_secret: 'appSecret',
    // Instagram
    ig_user_id: 'igUserId',
    // Slack
    signing_secret: 'signingSecret',
    // Discord
    application_id: 'applicationId',
    public_key: 'publicKey',
    // Webhooks
    webhook_verify_token: 'webhookVerifyToken',
  }

  const transformed: Record<string, string> = {}
  for (const [key, value] of Object.entries(credentials)) {
    const newKey = mapping[key] || key
    transformed[newKey] = value
  }
  return transformed
}

// Helper function to send message directly (for local development)
async function sendMessageDirect(
  supabase: ReturnType<typeof getSupabase>,
  messageId: string,
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord',
  recipientId: string,
  content: { type: string; text?: string },
  credentials: Record<string, string>
) {
  // Transform snake_case credentials to camelCase for providers
  const creds = transformCredentials(credentials)

  // Debug logging
  console.log(`[SendMessage] Channel: ${channel}`)
  console.log(`[SendMessage] Recipient ID: ${recipientId}`)
  console.log(`[SendMessage] Credentials keys: ${Object.keys(creds).join(', ')}`)
  console.log(`[SendMessage] phoneNumberId: ${creds.phoneNumberId || 'N/A'}`)
  console.log(`[SendMessage] accessToken prefix: ${creds.accessToken?.substring(0, 20) || 'N/A'}...`)

  let provider

  switch (channel) {
    case 'whatsapp':
      provider = new WhatsAppProvider({ channel: 'whatsapp', credentials: creds })
      break
    case 'telegram':
      provider = new TelegramProvider({ channel: 'telegram', credentials: creds })
      break
    case 'facebook':
      provider = new FacebookProvider({ channel: 'facebook', credentials: creds })
      break
    case 'instagram':
      provider = new InstagramProvider({ channel: 'instagram', credentials: creds })
      break
    case 'slack':
      provider = new SlackProvider({ channel: 'slack', credentials: creds })
      break
    case 'discord':
      provider = new DiscordProvider({ channel: 'discord', credentials: creds })
      break
    default:
      throw new Error(`Unknown channel: ${channel}`)
  }

  const result = await provider.sendMessage({
    recipientId,
    content: content as { type: 'text'; text?: string },
  })

  console.log(`[SendMessage] Result:`, JSON.stringify(result))

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
    const errorMessage = result.error?.message || 'Send failed'
    await supabase
      .from('messages')
      .update({
        status: 'failed',
        failure_reason: errorMessage,
        failed_at: new Date().toISOString(),
      })
      .eq('id', messageId)
    throw new Error(errorMessage)
  }

  return result
}

// Send message to contact
app.post('/:clientId/contacts/:contactId/messages', async (c) => {
  const { clientId, contactId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()

  // Validate required fields
  if (!body.channel || !body.content) {
    throw badRequest('channel and content are required')
  }

  // Verify client belongs to org
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, organization_id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (clientError || !client) throw notFound('Client')

  // Get contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .eq('client_id', clientId)
    .single()

  if (contactError || !contact) throw notFound('Contact')

  // Get channel ID from contact
  const channelIdField = `${body.channel}_id`
  const recipientId = contact[channelIdField]
  if (!recipientId) {
    throw badRequest(`Contact does not have a ${body.channel} ID`)
  }

  // Verify org has active channel connection
  const { data: channelConnection, error: channelError } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('organization_id', org.id)
    .eq('channel', body.channel)
    .eq('is_active', true)
    .single()

  if (channelError || !channelConnection) {
    throw badRequest(`No active ${body.channel} connection configured`)
  }

  // WhatsApp 24-hour window check
  // Text/media messages can only be sent within 24 hours of last inbound message
  // Template messages can be sent anytime
  if (body.channel === 'whatsapp' && body.content.type !== 'template') {
    const lastInbound = contact.last_inbound_at ? new Date(contact.last_inbound_at) : null
    const now = new Date()
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    const isWithin24Hours = lastInbound && (now.getTime() - lastInbound.getTime()) < TWENTY_FOUR_HOURS

    if (!isWithin24Hours) {
      throw badRequest('Cannot send text/media message outside 24-hour window. Use a template message instead.')
    }
  }

  // Get template content if templateId provided
  let messageContent = body.content
  if (body.templateId) {
    const { data: template } = await supabase
      .from('templates')
      .select('*, template_versions!templates_current_version_id_fkey(*)')
      .eq('id', body.templateId)
      .single()

    if (template?.template_versions) {
      messageContent = template.template_versions.content
      // Render variables
      if (body.variables && typeof messageContent.text === 'string') {
        let text = messageContent.text
        for (const [key, value] of Object.entries(body.variables)) {
          text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
        }
        messageContent = { ...messageContent, text }
      }
    }
  }

  // Create message record
  const messageId = generateId('message')
  const newMessage = {
    id: messageId,
    contact_id: contactId,
    channel: body.channel,
    direction: 'outbound',
    status: 'queued',
    content: messageContent,
    created_at: new Date().toISOString(),
  }

  const { error: insertError } = await supabase.from('messages').insert(newMessage)
  if (insertError) throw new Error(insertError.message)

  // Send message directly (for local dev) or queue for production
  const isLocalDev = c.env.ENVIRONMENT !== 'production'

  try {
    if (isLocalDev) {
      // Local dev: send directly using provider (bypass queue)
      console.log('Local dev: sending directly')
      await sendMessageDirect(
        supabase,
        messageId,
        body.channel,
        recipientId,
        messageContent,
        channelConnection.credentials
      )
    } else if (c.env.MESSAGE_QUEUE) {
      // Production: use queue for async processing
      console.log('Production: sending via queue')
      await c.env.MESSAGE_QUEUE.send({
        type: 'send_message',
        messageId,
        contactId,
        channel: body.channel,
        recipientId,
        content: messageContent,
        channelConnectionId: channelConnection.id,
        credentials: channelConnection.credentials,
      })
    }
  } catch (sendError) {
    console.error('Failed to send message:', sendError)
    // Update message status to failed
    const errorMessage = sendError instanceof Error ? sendError.message : 'Failed to send message'
    await supabase
      .from('messages')
      .update({ status: 'failed', failure_reason: errorMessage })
      .eq('id', messageId)
    throw new Error(errorMessage)
  }

  return c.json({ data: newMessage }, 201)
})

// Get message history for contact
app.get('/:clientId/contacts/:contactId/messages', async (c) => {
  const { clientId, contactId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  const channel = c.req.query('channel')

  // Verify client belongs to org
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (clientError || !client) throw notFound('Client')

  // Get contact exists
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('client_id', clientId)
    .single()

  if (contactError || !contact) throw notFound('Contact')

  // Get messages
  let query = supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channel) {
    query = query.eq('channel', channel)
  }

  const { data: messages, error: messagesError } = await query

  if (messagesError) throw new Error(messagesError.message)

  return c.json({ data: messages || [] })
})

// Get single message
app.get('/messages/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  // Get message with contact and client info to verify org ownership
  const { data: message, error } = await supabase
    .from('messages')
    .select(`
      *,
      contacts!messages_contact_id_fkey (
        id,
        client_id,
        clients!contacts_client_id_fkey (
          organization_id
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !message) throw notFound('Message')

  // Verify org ownership
  if (message.contacts?.clients?.organization_id !== org.id) {
    throw notFound('Message')
  }

  // Remove nested data from response
  const { contacts, ...messageData } = message
  return c.json({ data: messageData })
})

// ============ TAGS ============

// List tags
app.get('/:clientId/tags', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  const { data: tagsList } = await supabase
    .from('tags')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return c.json({ data: tagsList || [] })
})

// Create tag
app.post('/:clientId/tags', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = createTagSchema.parse(body)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  const newTag = {
    id: generateId('tag'),
    client_id: clientId,
    name: data.name,
    color: data.color,
  }

  await supabase.from('tags').insert(newTag)
  return c.json({ data: newTag }, 201)
})

// Delete tag
app.delete('/:clientId/tags/:tagId', async (c) => {
  const { clientId, tagId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  await supabase.from('tags').delete().eq('id', tagId)
  return c.json({ data: { success: true } })
})

// ============ SEGMENTS ============

// List segments
app.get('/:clientId/segments', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  const { data: segmentsList } = await supabase
    .from('segments')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return c.json({ data: segmentsList || [] })
})

// Create segment
app.post('/:clientId/segments', async (c) => {
  const { clientId } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = createSegmentSchema.parse(body)

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', org.id)
    .single()

  if (error || !client) throw notFound('Client')

  const newSegment = {
    id: generateId('segment'),
    client_id: clientId,
    name: data.name,
    description: data.description,
    filters: data.filters,
  }

  await supabase.from('segments').insert(newSegment)
  return c.json({ data: newSegment }, 201)
})

export default app
