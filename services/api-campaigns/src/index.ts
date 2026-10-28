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
  badRequest,
} from '@sendbandit/middleware'
import { generateId, toCamelCase } from '@sendbandit/shared/utils'
import {
  createCampaignSchema,
  updateCampaignSchema,
  enrollContactsSchema,
  paginationSchema,
} from '@sendbandit/shared/validators'
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
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-campaigns' }))

// Global middleware
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.use('*', defaultRateLimit)
app.use('*', authMiddleware)
app.use('*', orgContextMiddleware)
app.onError(errorHandler)

// Helper to verify client belongs to org
async function verifyClientAccess(
  supabase: ReturnType<typeof getSupabase>,
  clientId: string,
  orgId: string
) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', orgId)
    .single()

  if (error || !client) throw notFound('Client')
  return client
}

// List campaigns
app.get('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())
  const clientId = c.req.query('clientId')

  if (!clientId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'clientId is required' } }, 400)
  }

  await verifyClientAccess(supabase, clientId, org.id)

  const { data: campaignsList } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  // Get enrollment stats for each campaign
  const campaignsWithStats = await Promise.all(
    (campaignsList || []).map(async (campaign) => {
      const { data: enrollments } = await supabase
        .from('campaign_enrollments')
        .select('status')
        .eq('campaign_id', campaign.id)

      let enrolledCount = 0
      let completedCount = 0
      for (const e of enrollments || []) {
        enrolledCount++
        if (e.status === 'completed') completedCount++
      }

      return toCamelCase({ ...campaign, enrolledCount, completedCount })
    })
  )

  return c.json({ data: campaignsWithStats })
})

// Get campaign
app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  // Get enrollment stats
  const { data: enrollments } = await supabase
    .from('campaign_enrollments')
    .select('status')
    .eq('campaign_id', id)

  let enrolledCount = 0
  let completedCount = 0
  for (const e of enrollments || []) {
    enrolledCount++
    if (e.status === 'completed') completedCount++
  }

  return c.json({
    data: toCamelCase({ ...campaign, enrolledCount, completedCount }),
  })
})

// Create campaign
app.post('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const { clientId, ...data } = body
  const validated = createCampaignSchema.parse(data)

  if (!clientId) throw badRequest('clientId is required')
  await verifyClientAccess(supabase, clientId, org.id)

  const newCampaign = {
    id: generateId('campaign'),
    client_id: clientId,
    name: validated.name,
    description: validated.description,
    type: validated.type,
    trigger_type: validated.triggerType,
    trigger_config: validated.triggerConfig,
    flow_data: validated.flowData,
    scheduled_at: validated.scheduledAt || null,
    status: 'draft',
  }

  const { error: insertError } = await supabase.from('campaigns').insert(newCampaign)
  if (insertError) throw new Error(insertError.message)

  return c.json({ data: toCamelCase({ ...newCampaign, enrolledCount: 0, completedCount: 0 }) }, 201)
})

// Update campaign
app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = updateCampaignSchema.parse(body)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'draft') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Can only edit draft campaigns' } }, 400)
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.triggerConfig !== undefined) updateData.trigger_config = data.triggerConfig
  if (data.flowData !== undefined) updateData.flow_data = data.flowData
  if (data.scheduledAt !== undefined) updateData.scheduled_at = data.scheduledAt

  const { error: updateError } = await supabase.from('campaigns').update(updateData).eq('id', id)
  if (updateError) throw new Error(updateError.message)

  return c.json({ data: toCamelCase({ ...campaign, ...updateData }) })
})

// Delete campaign
app.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status === 'active') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Cannot delete active campaign' } }, 400)
  }

  const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', id)
  if (deleteError) throw new Error(deleteError.message)

  return c.json({ data: { success: true } })
})

// Activate campaign
app.post('/:id/activate', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Campaign cannot be activated' } }, 400)
  }

  await supabase
    .from('campaigns')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return c.json({ data: toCamelCase({ ...campaign, status: 'active' }) })
})

// Pause campaign
app.post('/:id/pause', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'active') {
    return c.json(
      { error: { code: 'INVALID_STATE', message: 'Only active campaigns can be paused' } },
      400
    )
  }

  await supabase
    .from('campaigns')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', id)

  return c.json({ data: toCamelCase({ ...campaign, status: 'paused' }) })
})

// Resume campaign
app.post('/:id/resume', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'paused') {
    return c.json(
      { error: { code: 'INVALID_STATE', message: 'Only paused campaigns can be resumed' } },
      400
    )
  }

  await supabase
    .from('campaigns')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)

  return c.json({ data: toCamelCase({ ...campaign, status: 'active' }) })
})

// Stop campaign
app.post('/:id/stop', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'active' && campaign.status !== 'paused') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Campaign cannot be stopped' } }, 400)
  }

  // Cancel all active enrollments
  await supabase
    .from('campaign_enrollments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('campaign_id', id)
    .in('status', ['active', 'waiting'])

  await supabase
    .from('campaigns')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return c.json({ data: toCamelCase({ ...campaign, status: 'cancelled' }) })
})

// Duplicate campaign as a new draft. The flow is copied as stored, without re-validation, so campaigns saved in an
// older flow format can be duplicated too.
app.post('/:id/duplicate', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  const copy = {
    id: generateId('campaign'),
    client_id: campaign.client_id,
    name: `${campaign.name.slice(0, 248)} (copy)`,
    description: campaign.description,
    type: campaign.type,
    trigger_type: campaign.trigger_type,
    trigger_config: campaign.trigger_config,
    flow_data: campaign.flow_data,
    status: 'draft',
  }

  const { error: insertError } = await supabase.from('campaigns').insert(copy)
  if (insertError) throw new Error(insertError.message)

  return c.json({ data: toCamelCase({ ...copy, enrolledCount: 0, completedCount: 0 }) }, 201)
})

// Get campaign enrollments
app.get('/:id/enrollments', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  const { data: enrollments } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  return c.json({ data: (enrollments || []).map(toCamelCase) })
})

// Enroll contacts in campaign
app.post('/:id/enroll', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const { contactIds } = enrollContactsSchema.parse(body)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  if (campaign.status !== 'active') {
    return c.json(
      { error: { code: 'INVALID_STATE', message: 'Can only enroll in active campaigns' } },
      400
    )
  }

  // Get first node from flow
  const flowData = campaign.flow_data as { nodes?: Array<{ id: string; type: string }> } | null
  const triggerNode = flowData?.nodes?.find((n) => n.type === 'trigger')

  let enrolled = 0
  for (const contactId of contactIds) {
    // Check if already enrolled
    const { data: existing } = await supabase
      .from('campaign_enrollments')
      .select('id')
      .eq('campaign_id', id)
      .eq('contact_id', contactId)
      .single()

    if (!existing) {
      await supabase.from('campaign_enrollments').insert({
        id: generateId('enrollment'),
        campaign_id: id,
        contact_id: contactId,
        status: 'active',
        current_node_id: triggerNode?.id || null,
        node_history: [],
      })
      enrolled++
    }
  }

  return c.json({ data: { enrolled } })
})

// Get campaign stats
app.get('/:id/stats', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single()

  if (error || !campaign) throw notFound('Campaign')

  await verifyClientAccess(supabase, campaign.client_id, org.id)

  // Get enrollment stats
  const { data: enrollments } = await supabase
    .from('campaign_enrollments')
    .select('status')
    .eq('campaign_id', id)

  const stats = {
    totalEnrollments: 0,
    activeEnrollments: 0,
    completedEnrollments: 0,
    failedEnrollments: 0,
    waitingEnrollments: 0,
  }

  for (const e of enrollments || []) {
    stats.totalEnrollments++
    switch (e.status) {
      case 'active':
        stats.activeEnrollments++
        break
      case 'completed':
        stats.completedEnrollments++
        break
      case 'failed':
        stats.failedEnrollments++
        break
      case 'waiting':
        stats.waitingEnrollments++
        break
    }
  }

  return c.json({ data: stats })
})

export default app
