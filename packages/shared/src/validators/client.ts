import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  timezone: z.string().default('UTC'),
})

export const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  timezone: z.string().optional(),
})

export const createContactSchema = z.object({
  externalId: z.string().max(255).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  whatsappId: z.string().max(50).optional(),
  telegramId: z.string().max(50).optional(),
  facebookId: z.string().max(50).optional(),
  instagramId: z.string().max(50).optional(),
  slackId: z.string().max(50).optional(),
  discordId: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

export const updateContactSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  whatsappId: z.string().max(50).optional(),
  telegramId: z.string().max(50).optional(),
  facebookId: z.string().max(50).optional(),
  instagramId: z.string().max(50).optional(),
  slackId: z.string().max(50).optional(),
  discordId: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(10000),
  updateExisting: z.boolean().default(false),
  tagIds: z.array(z.string()).optional(),
})

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
})

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.enum([
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'not_in',
        'is_null',
        'is_not_null',
      ]),
      value: z.unknown(),
    })
  ),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ImportContactsInput = z.infer<typeof importContactsSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>
