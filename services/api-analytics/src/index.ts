import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorHandler,
  authMiddleware,
  orgContextMiddleware,
  defaultRateLimit,
  notFound,
} from '@sendbandit/middleware'
import type { HonoEnv } from '@sendbandit/shared/types'

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
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-analytics' }))

// Global middleware
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.use('*', defaultRateLimit)
app.use('*', authMiddleware)
app.use('*', orgContextMiddleware)
app.onError(errorHandler)

// Get dashboard stats
app.get('/dashboard', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const startDate = c.req.query('startDate') || getDateDaysAgo(30)
  const endDate = c.req.query('endDate') || new Date().toISOString().split('T')[0]

  // Get daily stats for the period
  const { data: stats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('organization_id', org.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  // Aggregate totals
  const totals = (stats || []).reduce(
    (acc, stat) => ({
      messagesSent: acc.messagesSent + (stat.messages_sent || 0),
      messagesDelivered: acc.messagesDelivered + (stat.messages_delivered || 0),
      messagesRead: acc.messagesRead + (stat.messages_read || 0),
      messagesFailed: acc.messagesFailed + (stat.messages_failed || 0),
      newContacts: acc.newContacts + (stat.new_contacts || 0),
    }),
    {
      messagesSent: 0,
      messagesDelivered: 0,
      messagesRead: 0,
      messagesFailed: 0,
      newContacts: 0,
    }
  )

  // Get active campaigns count
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', org.id)

  const clientIds = (clients || []).map((c) => c.id)

  let activeCampaignsCount = 0
  let totalContactsCount = 0

  if (clientIds.length > 0) {
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds)
      .eq('status', 'active')

    activeCampaignsCount = activeCampaigns || 0

    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds)

    totalContactsCount = totalContacts || 0
  }

  return c.json({
    data: {
      ...totals,
      activeCampaigns: activeCampaignsCount,
      totalContacts: totalContactsCount,
      dailyStats: stats || [],
    },
  })
})

// Get campaign analytics
app.get('/campaigns/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  // Verify campaign access
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !campaign) throw notFound('Campaign')

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', campaign.client_id)
    .eq('organization_id', org.id)
    .single()

  if (!client) throw notFound('Campaign')

  // Get campaign stats
  const { data: stats } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', id)
    .order('date', { ascending: false })

  // Aggregate totals
  const totals = (stats || []).reduce(
    (acc, stat) => ({
      totalEnrollments: Math.max(acc.totalEnrollments, stat.total_enrollments || 0),
      activeEnrollments: stat.active_enrollments || 0,
      completedEnrollments: stat.completed_enrollments || 0,
      failedEnrollments: stat.failed_enrollments || 0,
      messagesSent: acc.messagesSent + (stat.messages_sent || 0),
      messagesDelivered: acc.messagesDelivered + (stat.messages_delivered || 0),
      messagesRead: acc.messagesRead + (stat.messages_read || 0),
      messagesFailed: acc.messagesFailed + (stat.messages_failed || 0),
    }),
    {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      failedEnrollments: 0,
      messagesSent: 0,
      messagesDelivered: 0,
      messagesRead: 0,
      messagesFailed: 0,
    }
  )

  return c.json({
    data: {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.started_at,
        completedAt: campaign.completed_at,
      },
      stats: totals,
      dailyStats: stats || [],
    },
  })
})

// Get message analytics
app.get('/messages', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  // Get clients for this org
  const { data: clients } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', org.id)

  const clientIds = (clients || []).map((cl) => cl.id)

  if (clientIds.length === 0) {
    return c.json({ data: { byChannel: {}, totals: {} } })
  }

  // Get contacts for these clients
  const { data: contacts } = await supabase.from('contacts').select('id').in('client_id', clientIds)

  const contactIds = (contacts || []).map((ct) => ct.id)

  if (contactIds.length === 0) {
    return c.json({ data: { byChannel: {}, totals: {} } })
  }

  // Get messages for these contacts
  const { data: messages } = await supabase
    .from('messages')
    .select('status, channel')
    .in('contact_id', contactIds)

  // Group by channel and status
  const byChannel: Record<string, Record<string, number>> = {}
  const totals: Record<string, number> = {}

  for (const msg of messages || []) {
    if (!byChannel[msg.channel]) {
      byChannel[msg.channel] = {}
    }
    byChannel[msg.channel][msg.status] = (byChannel[msg.channel][msg.status] || 0) + 1
    totals[msg.status] = (totals[msg.status] || 0) + 1
  }

  return c.json({ data: { byChannel, totals } })
})

// Get events (activity log)
app.get('/events', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return c.json({ data: events || [] })
})

// Track event (internal use)
app.post('/events', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()

  const { eventType, eventData, clientId, campaignId, contactId } = body

  await supabase.from('analytics_events').insert({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    organization_id: org.id,
    client_id: clientId,
    campaign_id: campaignId,
    contact_id: contactId,
    event_type: eventType,
    event_data: eventData || {},
  })

  return c.json({ data: { success: true } }, 201)
})

// Helper function
function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export default app
