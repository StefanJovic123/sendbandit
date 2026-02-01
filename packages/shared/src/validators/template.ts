import { z } from 'zod'

const channelSchema = z.enum(['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord'])

const buttonSchema = z.object({
  type: z.enum(['quick_reply', 'url', 'phone']),
  text: z.string().min(1).max(20),
  url: z.string().url().optional(),
  phone: z.string().optional(),
})

const headerSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'document']),
  content: z.string(),
})

const contentSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'document', 'audio', 'interactive']),
  text: z.string().max(4096).optional(),
  mediaUrl: z.string().url().optional(),
  buttons: z.array(buttonSchema).max(3).optional(),
  header: headerSchema.optional(),
  footer: z.string().max(60).optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  channel: channelSchema,
  content: contentSchema,
})

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  content: contentSchema.optional(),
})

export const renderTemplateSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.string()),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type RenderTemplateInput = z.infer<typeof renderTemplateSchema>
