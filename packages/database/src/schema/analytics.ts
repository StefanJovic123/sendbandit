import { pgTable, text, timestamp, index, integer, jsonb } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { clients } from './clients'
import { campaigns } from './campaigns'

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
    campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    contactId: text('contact_id'),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('event_org_idx').on(table.organizationId),
    clientIdx: index('event_client_idx').on(table.clientId),
    campaignIdx: index('event_campaign_idx').on(table.campaignId),
    typeIdx: index('event_type_idx').on(table.organizationId, table.eventType),
    createdAtIdx: index('event_created_at_idx').on(table.organizationId, table.createdAt),
  })
)

export const campaignStats = pgTable(
  'campaign_stats',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD format
    totalEnrollments: integer('total_enrollments').notNull().default(0),
    activeEnrollments: integer('active_enrollments').notNull().default(0),
    completedEnrollments: integer('completed_enrollments').notNull().default(0),
    failedEnrollments: integer('failed_enrollments').notNull().default(0),
    messagesSent: integer('messages_sent').notNull().default(0),
    messagesDelivered: integer('messages_delivered').notNull().default(0),
    messagesRead: integer('messages_read').notNull().default(0),
    messagesFailed: integer('messages_failed').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    campaignDateIdx: index('stats_campaign_date_idx').on(table.campaignId, table.date),
  })
)

export const dailyStats = pgTable(
  'daily_stats',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD format
    messagesSent: integer('messages_sent').notNull().default(0),
    messagesDelivered: integer('messages_delivered').notNull().default(0),
    messagesRead: integer('messages_read').notNull().default(0),
    messagesFailed: integer('messages_failed').notNull().default(0),
    newContacts: integer('new_contacts').notNull().default(0),
    activeCampaigns: integer('active_campaigns').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgDateIdx: index('daily_stats_org_date_idx').on(table.organizationId, table.date),
  })
)
