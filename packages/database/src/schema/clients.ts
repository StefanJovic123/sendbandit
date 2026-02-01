import { pgTable, text, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const clients = pgTable(
  'clients',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    industry: text('industry'),
    timezone: text('timezone').notNull().default('UTC'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('client_org_idx').on(table.organizationId),
    nameIdx: index('client_name_idx').on(table.organizationId, table.name),
  })
)

export const contacts = pgTable(
  'contacts',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    externalId: text('external_id'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    email: text('email'),
    phone: text('phone'),
    whatsappId: text('whatsapp_id'),
    telegramId: text('telegram_id'),
    facebookId: text('facebook_id'),
    instagramId: text('instagram_id'),
    slackId: text('slack_id'),
    discordId: text('discord_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: index('contact_client_idx').on(table.clientId),
    externalIdIdx: uniqueIndex('contact_external_id_idx').on(table.clientId, table.externalId),
    emailIdx: index('contact_email_idx').on(table.clientId, table.email),
    phoneIdx: index('contact_phone_idx').on(table.clientId, table.phone),
    whatsappIdx: index('contact_whatsapp_idx').on(table.clientId, table.whatsappId),
    telegramIdx: index('contact_telegram_idx').on(table.clientId, table.telegramId),
  })
)

export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#6366f1'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: index('tag_client_idx').on(table.clientId),
    nameIdx: uniqueIndex('tag_name_idx').on(table.clientId, table.name),
  })
)

export const contactTags = pgTable(
  'contact_tags',
  {
    id: text('id').primaryKey(),
    contactId: text('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    contactTagIdx: uniqueIndex('contact_tag_idx').on(table.contactId, table.tagId),
  })
)

export const segments = pgTable(
  'segments',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    filters: jsonb('filters').$type<SegmentFilter[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    clientIdx: index('segment_client_idx').on(table.clientId),
  })
)

interface SegmentFilter {
  field: string
  operator: string
  value: unknown
}
