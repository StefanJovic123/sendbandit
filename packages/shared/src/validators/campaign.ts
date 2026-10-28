import { z } from 'zod'

const campaignTypeSchema = z.enum(['one_time', 'recurring', 'triggered'])
const triggerTypeSchema = z.enum(['manual', 'schedule', 'event', 'segment_entry', 'segment_exit'])
const nodeTypeSchema = z.enum([
  'trigger',
  'send_message',
  'wait',
  'condition',
  'split',
  'update_contact',
  'add_tag',
  'remove_tag',
  'end',
])

const scheduleConfigSchema = z.object({
  type: z.enum(['once', 'daily', 'weekly', 'monthly']),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
})

const triggerConfigSchema = z.object({
  schedule: scheduleConfigSchema.optional(),
  event: z
    .object({
      name: z.string(),
      conditions: z.record(z.unknown()).optional(),
    })
    .optional(),
  segmentId: z.string().optional(),
})

const nodeDataSchema = z.object({
  label: z.string().optional(),
  templateId: z.string().optional(),
  channel: z.enum(['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord']).optional(),
  waitDuration: z
    .object({
      value: z.number().positive(),
      unit: z.enum(['minutes', 'hours', 'days']),
    })
    .optional(),
  condition: z
    .object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    })
    .optional(),
  splitPercentages: z.array(z.number().min(0).max(100)).optional(),
  tagId: z.string().optional(),
  contactFields: z.record(z.unknown()).optional(),
})

const flowNodeSchema = z.object({
  id: z.string(),
  type: nodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: nodeDataSchema,
})

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
})

const flowDataSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
})

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: campaignTypeSchema,
  triggerType: triggerTypeSchema,
  triggerConfig: triggerConfigSchema.optional(),
  flowData: flowDataSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  triggerConfig: triggerConfigSchema.optional(),
  flowData: flowDataSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const activateCampaignSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
})

export const enrollContactsSchema = z.object({
  contactIds: z.array(z.string()).min(1).max(10000),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type ActivateCampaignInput = z.infer<typeof activateCampaignSchema>
export type EnrollContactsInput = z.infer<typeof enrollContactsSchema>
