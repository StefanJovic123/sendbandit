import type { KVNamespace, R2Bucket, Queue, Hyperdrive } from '@cloudflare/workers-types'
import type { Organization } from './entities'

export interface Env {
  // Cloudflare bindings
  HYPERDRIVE: Hyperdrive // Supabase PostgreSQL via Hyperdrive
  KV: KVNamespace
  R2: R2Bucket
  MESSAGE_QUEUE: Queue

  // Database connection string (resolved from DATABASE_URL or Hyperdrive)
  // This is set by middleware or the worker entry point
  DB: string

  // Environment variables
  ENVIRONMENT: 'development' | 'staging' | 'production'

  // Direct database URL for local development (when Hyperdrive is not available)
  DATABASE_URL?: string

  // Supabase (for edge-compatible database access)
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string

  // Auth
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  CLERK_JWT_KEY?: string

  // Payments
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string

  // Monitoring
  SENTRY_DSN?: string

  // Channel provider credentials
  WHATSAPP_ACCESS_TOKEN?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string
  TELEGRAM_BOT_TOKEN?: string
  FACEBOOK_PAGE_ACCESS_TOKEN?: string
  INSTAGRAM_ACCESS_TOKEN?: string
  SLACK_BOT_TOKEN?: string
  DISCORD_BOT_TOKEN?: string
}

export interface HonoEnv {
  Bindings: Env
  Variables: {
    userId: string
    orgId: string | null
    org: Organization | null
    requestId: string
  }
}
