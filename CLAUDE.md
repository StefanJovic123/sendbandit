# SendBandit - Multi-Channel Marketing Automation Platform

## Project Overview

Marketing automation platform for WhatsApp, Telegram, Facebook, Instagram, Slack, Discord.

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS + shadcn/ui + React Flow
- **Backend**: Cloudflare Workers + Hono (10 workers, domain-split)
- **Database**: Supabase PostgreSQL via Cloudflare Hyperdrive (Drizzle ORM)
- **Auth**: Clerk
- **Payments**: Stripe
- **Storage**: Cloudflare R2, KV, Queues, Durable Objects

## Monorepo Structure

```
sendbandit/
├── apps/
│   └── web/                    # Next.js 14 frontend
├── services/                   # 10 Cloudflare Workers
│   ├── api-auth/              # Auth, users, organizations
│   ├── api-clients/           # Clients, contacts, segments, tags
│   ├── api-templates/         # Templates, versions, media
│   ├── api-campaigns/         # Campaigns, flows, enrollments
│   ├── api-analytics/         # Analytics, reports
│   ├── api-billing/           # Subscriptions, usage, invoices
│   ├── scheduler/             # Cron jobs (campaigns, retries)
│   ├── queue-processor/       # Message queue consumer
│   ├── webhooks/              # Inbound webhooks (all providers)
│   └── realtime/              # Durable Objects (WebSocket)
├── packages/                   # Shared code
│   ├── database/              # Drizzle ORM schema and queries (PostgreSQL)
│   ├── middleware/            # Hono middleware (auth, cors, rate-limit)
│   ├── shared/                # Types, validators, utils, constants
│   ├── channel-providers/     # WhatsApp, Telegram, Facebook, etc.
│   └── api-client/            # Type-safe Hono RPC client
└── .github/workflows/         # CI/CD for automated deployment
```

## Implementation Progress

### Phase 1: Foundation (Complete)
- [x] Monorepo setup (pnpm + Turborepo)
- [x] packages/database - Drizzle schema (PostgreSQL)
- [x] packages/shared - Types, validators, utils
- [x] packages/middleware - Hono middleware
- [x] packages/channel-providers - Provider implementations
- [x] packages/api-client - Type-safe client
- [x] services/* - All 10 workers scaffolded
- [x] apps/web - Next.js + Clerk auth
- [x] GitHub Actions CI/CD
- [x] Local development setup (Caddy + PM2)

### Phase 2: Core Features (TODO)
- [ ] User & organization management
- [ ] Client CRUD
- [ ] Contact management + import
- [ ] Template system with versioning

### Phase 3: Campaign Builder (TODO)
- [ ] React Flow integration
- [ ] Custom node types
- [ ] Campaign execution engine
- [ ] Scheduler + queue processor

### Phase 4: Integrations (TODO)
- [ ] WhatsApp Cloud API
- [ ] Telegram Bot API
- [ ] Facebook Messenger
- [ ] Instagram DM
- [ ] Slack
- [ ] Discord

### Phase 5: Analytics & Billing (TODO)
- [ ] Event tracking
- [ ] Analytics aggregation
- [ ] Stripe billing integration

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages and apps
pnpm dev              # Start development servers
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check

# Database (Supabase PostgreSQL)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:push          # Push schema directly to database
pnpm db:studio        # Open Drizzle Studio

# Local Development
pnpm setup:local      # First-time setup (hosts, env files)
pnpm dev:local        # Start all services with PM2
pnpm dev:stop         # Stop all services
pnpm dev:logs         # View PM2 logs
pnpm dev:status       # Check service status
```

## Local Development Setup

### Quick Start

```bash
# First time setup (installs deps, configures /etc/hosts, creates .env files)
pnpm setup:local

# Configure Supabase
# 1. Create project at https://supabase.com
# 2. Add DATABASE_URL to .dev.vars and packages/database/.env
# 3. Push schema to database
pnpm db:push

# Start all services with PM2
pnpm dev:local

# View logs
pnpm dev:logs

# Stop all services
pnpm dev:stop
```

### Local URLs

| Service | URL |
|---------|-----|
| Frontend | http://app.sendbandit.local |
| API Gateway | http://api.sendbandit.local |
| Webhooks | http://webhooks.sendbandit.local |
| Realtime | http://realtime.sendbandit.local |
| Media | http://media.sendbandit.local |

### Service Ports

| Service | Port |
|---------|------|
| api-auth | 8787 |
| api-clients | 8788 |
| api-templates | 8789 |
| api-campaigns | 8790 |
| api-analytics | 8791 |
| api-billing | 8792 |
| scheduler | 8793 |
| queue-processor | 8794 |
| webhooks | 8795 |
| realtime | 8796 |
| web (Next.js) | 3000 |

### Prerequisites

- Node.js 20+
- pnpm 9+
- Caddy (for reverse proxy)
- PM2 (for process management)
- Wrangler (for Cloudflare Workers local dev)
- Supabase account (for PostgreSQL database)

### Configuration Files

- `Caddyfile` - Reverse proxy configuration
- `ecosystem.config.js` - PM2 process configuration
- `.dev.vars` - Worker secrets (local)
- `packages/database/.env` - Database URL for Drizzle Kit
- `apps/web/.env.local` - Frontend environment variables

## API Routes (Cloudflare Workers Routes)

| Worker | Route Pattern |
|--------|---------------|
| api-auth | api.sendbandit.com/auth/* |
| api-clients | api.sendbandit.com/clients/* |
| api-templates | api.sendbandit.com/templates/* |
| api-campaigns | api.sendbandit.com/campaigns/* |
| api-analytics | api.sendbandit.com/analytics/* |
| api-billing | api.sendbandit.com/billing/* |
| webhooks | webhooks.sendbandit.com/* |
| realtime | realtime.sendbandit.com/* |

## Cloudflare Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Hyperdrive | sendbandit-db | PostgreSQL connection pooling (Supabase) |
| KV Namespace | sendbandit-cache | Caching, rate limiting |
| R2 Bucket | sendbandit-media | File storage |
| Queue | sendbandit-messages | Message processing |
| Pages | sendbandit-web | Frontend hosting |

## Environment Variables

### Workers (wrangler.toml secrets)
- DATABASE_URL (for local dev, Hyperdrive handles production)
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET (api-auth: signing secret of the Clerk webhook endpoint; without it `/webhooks/clerk` returns 500)
- WEBHOOKS_URL (api-clients var, not a secret: public URL of the webhooks worker, used in channel webhook URLs;
  `wrangler.toml` has the local value, the deploy workflow passes the production one)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

### Frontend (.env.local)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_API_URL
- CLERK_SECRET_KEY

### GitHub Actions Secrets
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_API_URL

### GitHub Actions Variables
- WEBHOOKS_URL (optional; defaults to https://webhooks.sendbandit.com)

## Database Schema

Tables defined in `packages/database/src/schema/` (PostgreSQL):
- organizations, organization_members, user_profiles
- clients, contacts, tags, contact_tags, segments
- templates, template_versions, media_assets
- campaigns, campaign_enrollments
- messages, message_queue
- channel_connections
- subscriptions, usage_records, invoices
- analytics_events, campaign_stats, daily_stats

## Documentation

- Full PRDs: `../sendbandit-docs`
- Architecture details: `docs/ARCHITECTURE.md`
