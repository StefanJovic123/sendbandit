'use server'

import { getApiClient } from '@/lib/api.server'

export type TemplateWithContent = {
  id: string
  name: string
  description: string | null
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  content: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Get all templates for the current organization
 */
export async function getTemplates(): Promise<TemplateWithContent[]> {
  try {
    const client = await getApiClient()
    const response = await client.templates.list()

    return response.data.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || null,
      channel: t.channel as TemplateWithContent['channel'],
      status: t.status as TemplateWithContent['status'],
      content: t.content?.text || '',
      variables: t.variables || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return []
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<TemplateWithContent | null> {
  try {
    const client = await getApiClient()
    const response = await client.templates.get(id)
    const t = response.data

    return {
      id: t.id,
      name: t.name,
      description: t.description || null,
      channel: t.channel as TemplateWithContent['channel'],
      status: t.status as TemplateWithContent['status'],
      content: t.content?.text || '',
      variables: t.variables || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }
  } catch (error) {
    console.error('Failed to fetch template:', error)
    return null
  }
}

/**
 * Create a new template
 */
export async function createTemplate(data: {
  name: string
  description?: string
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  content: string
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected'
}) {
  const client = await getApiClient()
  const response = await client.templates.create({
    name: data.name,
    description: data.description,
    channel: data.channel,
    content: {
      type: 'text',
      text: data.content,
    },
  })
  return { id: response.data.id }
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  data: {
    name?: string
    description?: string
    channel?: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
    content?: string
    status?: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  }
) {
  const client = await getApiClient()

  const updateData: Record<string, unknown> = {}
  if (data.name) updateData.name = data.name
  if (data.description) updateData.description = data.description
  if (data.channel) updateData.channel = data.channel
  if (data.status) updateData.status = data.status
  if (data.content) {
    updateData.content = {
      type: 'text',
      text: data.content,
    }
  }

  const response = await client.templates.update(id, updateData)
  return { id: response.data.id }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string) {
  const client = await getApiClient()
  await client.templates.delete(id)
}
