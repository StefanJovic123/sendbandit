import { pgTable, text, timestamp, index, integer, jsonb } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const templates = pgTable(
  'templates',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    channel: text('channel', {
      enum: ['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord'],
    }).notNull(),
    status: text('status', {
      enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    })
      .notNull()
      .default('draft'),
    currentVersionId: text('current_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('template_org_idx').on(table.organizationId),
    channelIdx: index('template_channel_idx').on(table.organizationId, table.channel),
    statusIdx: index('template_status_idx').on(table.organizationId, table.status),
  })
)

export const templateVersions = pgTable(
  'template_versions',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<TemplateContent>().notNull(),
    variables: jsonb('variables').$type<string[]>().notNull().default([]),
    createdById: text('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    templateIdx: index('template_version_template_idx').on(table.templateId),
    versionIdx: index('template_version_version_idx').on(table.templateId, table.version),
  })
)

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['image', 'video', 'document', 'audio'] }).notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    r2Key: text('r2_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('media_org_idx').on(table.organizationId),
    typeIdx: index('media_type_idx').on(table.organizationId, table.type),
  })
)

interface TemplateContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive'
  text?: string
  mediaUrl?: string
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone'
    text: string
    url?: string
    phone?: string
  }>
  header?: {
    type: 'text' | 'image' | 'video' | 'document'
    content: string
  }
  footer?: string
}
