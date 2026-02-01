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
import { generateId } from '@sendbandit/shared/utils'
import {
  createTemplateSchema,
  updateTemplateSchema,
  paginationSchema,
} from '@sendbandit/shared/validators'
import type { HonoEnv } from '@sendbandit/shared/types'

const app = new Hono<HonoEnv>()

// Helper to create Supabase client
function getSupabase(env: HonoEnv['Bindings']) {
  return createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Health check (before auth)
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-templates' }))

// Global middleware
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.use('*', defaultRateLimit)
app.use('*', authMiddleware)
app.use('*', orgContextMiddleware)
app.onError(errorHandler)

// Extract variables from template content
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }
  return variables
}

// Render template with variables
function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match)
}

// List templates
app.get('/', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())

  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  if (error) {
    console.error('[Supabase Error]', error)
    throw new Error(error.message)
  }

  // Get current versions for all templates
  const versionIds = templates?.map((t) => t.current_version_id).filter(Boolean) || []

  let versions: any[] = []
  if (versionIds.length > 0) {
    const { data: versionData } = await supabase
      .from('template_versions')
      .select('*')
      .in('id', versionIds)

    versions = versionData || []
  }

  const versionMap = new Map(versions.map((v) => [v.id, v]))

  const templatesWithContent = (templates || []).map((template) => {
    const version = template.current_version_id ? versionMap.get(template.current_version_id) : null
    return {
      ...template,
      content: version?.content || null,
      variables: version?.variables || [],
    }
  })

  return c.json({ data: templatesWithContent })
})

// Get template with current version
app.get('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !template) throw notFound('Template')

  // Get current version
  let currentVersion = null
  if (template.current_version_id) {
    const { data } = await supabase
      .from('template_versions')
      .select('*')
      .eq('id', template.current_version_id)
      .single()

    currentVersion = data
  }

  return c.json({
    data: {
      ...template,
      content: currentVersion?.content || null,
      variables: currentVersion?.variables || [],
      currentVersion,
    },
  })
})

// Get template versions
app.get('/:id/versions', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  // Verify template exists and belongs to org
  const { data: template, error } = await supabase
    .from('templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !template) throw notFound('Template')

  const { data: versions } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', id)
    .order('version', { ascending: false })

  return c.json({ data: versions || [] })
})

// Create template
app.post('/', async (c) => {
  const org = c.get('org')!
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = createTemplateSchema.parse(body)

  const templateId = generateId('template')
  const versionId = generateId('templateVersion')

  // Extract variables from content
  const variables = data.content.text ? extractVariables(data.content.text) : []

  // Create template
  const { error: templateError } = await supabase.from('templates').insert({
    id: templateId,
    organization_id: org.id,
    name: data.name,
    description: data.description,
    channel: data.channel,
    status: 'draft',
    current_version_id: versionId,
  })

  if (templateError) throw new Error(templateError.message)

  // Create first version
  const { error: versionError } = await supabase.from('template_versions').insert({
    id: versionId,
    template_id: templateId,
    version: 1,
    content: data.content,
    variables,
    created_by_id: userId,
  })

  if (versionError) throw new Error(versionError.message)

  return c.json({
    data: {
      id: templateId,
      organization_id: org.id,
      name: data.name,
      description: data.description,
      channel: data.channel,
      status: 'draft',
      current_version_id: versionId,
    },
  }, 201)
})

// Update template (creates new version)
app.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const data = updateTemplateSchema.parse(body)

  // Get existing template
  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !template) throw notFound('Template')

  // If content is updated, create new version
  if (data.content) {
    // Get latest version number
    const { data: latestVersion } = await supabase
      .from('template_versions')
      .select('version')
      .eq('template_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const newVersionNum = (latestVersion?.version || 0) + 1
    const versionId = generateId('templateVersion')
    const variables = data.content.text ? extractVariables(data.content.text) : []

    await supabase.from('template_versions').insert({
      id: versionId,
      template_id: id,
      version: newVersionNum,
      content: data.content,
      variables,
      created_by_id: userId,
    })

    await supabase
      .from('templates')
      .update({
        name: data.name ?? template.name,
        description: data.description ?? template.description,
        current_version_id: versionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  } else {
    await supabase
      .from('templates')
      .update({
        name: data.name ?? template.name,
        description: data.description ?? template.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  const { data: updated } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  return c.json({ data: updated })
})

// Delete template
app.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: template, error } = await supabase
    .from('templates')
    .select('id')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !template) throw notFound('Template')

  await supabase.from('templates').delete().eq('id', id)
  return c.json({ data: { success: true } })
})

// Render template with variables
app.post('/:id/render', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()
  const { variables = {} } = body as { variables: Record<string, string> }

  const { data: template, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !template) throw notFound('Template')

  if (!template.current_version_id) {
    return c.json({ error: { code: 'NO_VERSION', message: 'Template has no version' } }, 400)
  }

  const { data: version } = await supabase
    .from('template_versions')
    .select('*')
    .eq('id', template.current_version_id)
    .single()

  if (!version) throw notFound('Template version')

  const content = version.content as { text?: string }
  const rendered = content.text ? renderTemplate(content.text, variables) : ''

  return c.json({ data: { content: rendered, variables: version.variables } })
})

// ============ MEDIA ASSETS ============

// List media assets
app.get('/media', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const query = paginationSchema.parse(c.req.query())

  const { data: assets } = await supabase
    .from('media_assets')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1)

  return c.json({ data: assets || [] })
})

// Upload media asset
app.post('/media', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  // Handle multipart form data
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: { code: 'NO_FILE', message: 'No file provided' } }, 400)
  }

  const assetId = generateId('event')
  const r2Key = `${org.id}/${assetId}-${file.name}`

  // Upload to R2
  await c.env.R2.put(r2Key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // Determine type from mime type
  let type: 'image' | 'video' | 'document' | 'audio' = 'document'
  if (file.type.startsWith('image/')) type = 'image'
  else if (file.type.startsWith('video/')) type = 'video'
  else if (file.type.startsWith('audio/')) type = 'audio'

  const newAsset = {
    id: assetId,
    organization_id: org.id,
    name: file.name,
    type,
    mime_type: file.type,
    size: file.size,
    url: `https://media.sendbandit.com/${r2Key}`,
    r2_key: r2Key,
  }

  await supabase.from('media_assets').insert(newAsset)
  return c.json({ data: newAsset }, 201)
})

// Delete media asset
app.delete('/media/:id', async (c) => {
  const { id } = c.req.param()
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .eq('organization_id', org.id)
    .single()

  if (error || !asset) throw notFound('Media asset')

  // Delete from R2
  await c.env.R2.delete(asset.r2_key)

  await supabase.from('media_assets').delete().eq('id', id)
  return c.json({ data: { success: true } })
})

export default app
