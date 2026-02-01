export * from './client'
export * from './template'
export * from './campaign'

import { z } from 'zod'

// Common validators
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
})

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const idParamSchema = z.object({
  id: z.string().min(1),
})

// Organization validators
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logoUrl: z.string().url().optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user', 'viewer']),
})

// Channel connection validators
export const createChannelConnectionSchema = z.object({
  channel: z.enum(['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord']),
  name: z.string().min(1).max(100),
  credentials: z.record(z.string()),
})

export const updateChannelConnectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
export type SortInput = z.infer<typeof sortSchema>
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type CreateChannelConnectionInput = z.infer<typeof createChannelConnectionSchema>
export type UpdateChannelConnectionInput = z.infer<typeof updateChannelConnectionSchema>
