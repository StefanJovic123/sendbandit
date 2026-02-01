import { pgTable, text, timestamp, index, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

// Credential schemas per channel
export interface WhatsAppCredentials {
  access_token: string
  phone_number_id: string
  waba_id: string
  verify_token?: string
}

export interface TelegramCredentials {
  bot_token: string
  bot_username?: string
}

export interface FacebookCredentials {
  page_access_token: string
  page_id: string
  app_id?: string
  app_secret?: string
  verify_token?: string
}

export interface InstagramCredentials {
  access_token: string
  ig_user_id: string
  verify_token?: string
}

export interface SlackCredentials {
  bot_token: string
  signing_secret: string
  app_id?: string
  team_id?: string
}

export interface DiscordCredentials {
  bot_token: string
  application_id?: string
  public_key?: string
}

export type ChannelCredentials =
  | WhatsAppCredentials
  | TelegramCredentials
  | FacebookCredentials
  | InstagramCredentials
  | SlackCredentials
  | DiscordCredentials

export const channelConnections = pgTable(
  'channel_connections',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    channel: text('channel', {
      enum: ['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord'],
    }).notNull(),
    name: text('name').notNull(),
    credentials: jsonb('credentials')
      .$type<ChannelCredentials>()
      .notNull(),
    isActive: boolean('is_active').notNull().default(true),
    webhookUrl: text('webhook_url'),
    webhookSecret: text('webhook_secret'),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index('channel_conn_org_idx').on(table.organizationId),
    channelIdx: index('channel_conn_channel_idx').on(table.organizationId, table.channel),
    uniqueNameIdx: uniqueIndex('channel_conn_unique_name_idx').on(
      table.organizationId,
      table.channel,
      table.name
    ),
  })
)
