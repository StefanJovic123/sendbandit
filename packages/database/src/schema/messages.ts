import { pgTable, text, timestamp, index, integer, jsonb } from 'drizzle-orm/pg-core'
import { campaigns, campaignEnrollments } from './campaigns'
import { contacts } from './clients'
import { templates } from './templates'

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    enrollmentId: text('enrollment_id').references(() => campaignEnrollments.id, {
      onDelete: 'set null',
    }),
    contactId: text('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
    channel: text('channel', {
      enum: ['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord'],
    }).notNull(),
    direction: text('direction', { enum: ['outbound', 'inbound'] }).notNull(),
    status: text('status', {
      enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    })
      .notNull()
      .default('queued'),
    content: jsonb('content').$type<MessageContent>().notNull(),
    providerMessageId: text('provider_message_id'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    campaignIdx: index('message_campaign_idx').on(table.campaignId),
    enrollmentIdx: index('message_enrollment_idx').on(table.enrollmentId),
    contactIdx: index('message_contact_idx').on(table.contactId),
    statusIdx: index('message_status_idx').on(table.status),
    providerMsgIdx: index('message_provider_msg_idx').on(table.providerMessageId),
    createdAtIdx: index('message_created_at_idx').on(table.createdAt),
  })
)

export const messageQueue = pgTable(
  'message_queue',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id').notNull(),
    channel: text('channel', {
      enum: ['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord'],
    }).notNull(),
    templateId: text('template_id'),
    variables: jsonb('variables').$type<Record<string, string>>().default({}),
    campaignId: text('campaign_id'),
    enrollmentId: text('enrollment_id'),
    priority: integer('priority').notNull().default(0),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index('queue_status_idx').on(table.status, table.scheduledFor),
    priorityIdx: index('queue_priority_idx').on(table.status, table.priority),
  })
)

export interface MessageContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive'
  text?: string
  mediaUrl?: string
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone'
    text: string
    url?: string
    phone?: string
  }>
}
