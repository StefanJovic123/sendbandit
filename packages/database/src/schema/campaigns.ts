import { pgTable, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core'
import { clients } from './clients'

export const campaigns = pgTable(
  'campaigns',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type', { enum: ['one_time', 'recurring', 'triggered'] }).notNull(),
    status: text('status', {
      enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    })
      .notNull()
      .default('draft'),
    triggerType: text('trigger_type', {
      enum: ['manual', 'schedule', 'event', 'segment_entry', 'segment_exit'],
    }).notNull(),
    triggerConfig: jsonb('trigger_config').$type<TriggerConfig>(),
    flowData: jsonb('flow_data').$type<FlowData>(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: index('campaign_client_idx').on(table.clientId),
    statusIdx: index('campaign_status_idx').on(table.clientId, table.status),
    scheduledIdx: index('campaign_scheduled_idx').on(table.status, table.scheduledAt),
  })
)

export const campaignEnrollments = pgTable(
  'campaign_enrollments',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    contactId: text('contact_id').notNull(),
    status: text('status', {
      enum: ['active', 'waiting', 'completed', 'failed', 'cancelled'],
    })
      .notNull()
      .default('active'),
    currentNodeId: text('current_node_id'),
    nodeHistory: jsonb('node_history').$type<NodeHistoryEntry[]>().default([]),
    waitUntil: timestamp('wait_until', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    campaignIdx: index('enrollment_campaign_idx').on(table.campaignId),
    contactIdx: index('enrollment_contact_idx').on(table.contactId),
    statusIdx: index('enrollment_status_idx').on(table.campaignId, table.status),
    waitIdx: index('enrollment_wait_idx').on(table.status, table.waitUntil),
  })
)

export interface TriggerConfig {
  schedule?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly'
    time: string
    timezone: string
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
  event?: {
    name: string
    conditions?: Record<string, unknown>
  }
  segmentId?: string
}

export interface FlowData {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    label?: string
  }>
}

export interface NodeHistoryEntry {
  nodeId: string
  enteredAt: string
  exitedAt: string | null
  outcome?: string
}
