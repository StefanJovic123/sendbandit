# SendBandit

Multi-channel marketing automation platform for WhatsApp, Telegram, Facebook, Instagram, Slack, and Discord.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Cloudflare Workers, Hono
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Auth**: Clerk
- **Payments**: Stripe
- **Storage**: Cloudflare R2, KV, Queues, Durable Objects

## Project Structure

```
sendbandit/
├── apps/web/              # Next.js frontend
├── services/              # Cloudflare Workers (10 total)
├── packages/              # Shared libraries
│   ├── database/         # Drizzle schema & queries
│   ├── middleware/       # Hono middleware
│   ├── shared/           # Types, validators, utils
│   ├── channel-providers/# Messaging integrations
│   └── api-client/       # Type-safe API client
└── .github/workflows/    # CI/CD
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account
- Clerk account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sendbandit.git
cd sendbandit

# Install dependencies
pnpm install

# Build packages
pnpm build
```

### Development

```bash
# Start all services in dev mode
pnpm dev

# Or start specific services
pnpm --filter @sendbandit/web dev
pnpm --filter @sendbandit/api-auth dev
```

### Environment Setup

1. Copy `.env.example` to `.env.local` in `apps/web/`
2. Add Clerk keys from your Clerk dashboard
3. Configure Cloudflare resources in each worker's `wrangler.toml`

## Deployment

### Manual Deployment

```bash
# Deploy all workers
pnpm --filter "./services/*" deploy

# Deploy frontend
pnpm --filter @sendbandit/web build
# Then deploy via Cloudflare Pages
```

### Automated Deployment

Push to `main` branch triggers:
- CI workflow: Lint, type-check, test
- Deploy Workers: All 10 workers deployed in parallel
- Deploy Web: Next.js app deployed to Cloudflare Pages

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md) (TODO)
- [Contributing](./CONTRIBUTING.md) (TODO)

## License

Private - All rights reserved.
