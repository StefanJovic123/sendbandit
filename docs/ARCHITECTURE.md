# SendBandit Architecture

## Overview

SendBandit is a multi-channel marketing automation platform built on Cloudflare's edge infrastructure. The architecture is designed for:

- **Global low-latency**: Edge computing via Cloudflare Workers
- **Scalability**: Serverless, auto-scaling infrastructure
- **Reliability**: Queue-based message processing with retries
- **Real-time**: WebSocket connections via Durable Objects

## System Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │         Cloudflare Edge             │
                                    │                                     │
┌──────────────┐                    │  ┌─────────────────────────────┐   │
│              │                    │  │     API Workers             │   │
│   Next.js    │◄──────────────────►│  │  ┌───────┐ ┌───────┐       │   │
│   Frontend   │                    │  │  │ auth  │ │clients│ ...   │   │
│  (CF Pages)  │                    │  │  └───────┘ └───────┘       │   │
│              │                    │  └─────────────────────────────┘   │
└──────────────┘                    │                 │                   │
                                    │                 ▼                   │
                                    │  ┌─────────────────────────────┐   │
                                    │  │         D1 Database         │   │
                                    │  │      (SQLite at edge)       │   │
                                    │  └─────────────────────────────┘   │
                                    │                                     │
                                    │  ┌─────────────────────────────┐   │
                                    │  │       Cloudflare Queue      │   │
                                    │  │    (Message Processing)     │   │
                                    │  └──────────────┬──────────────┘   │
                                    │                 │                   │
                                    │                 ▼                   │
                                    │  ┌─────────────────────────────┐   │
                                    │  │    Queue Processor Worker   │   │
                                    │  │   (Sends to providers)      │   │
                                    │  └──────────────┬──────────────┘   │
                                    │                 │                   │
                                    └─────────────────┼───────────────────┘
                                                      │
                                                      ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                   Channel Providers                      │
                    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
                    │  │WhatsApp │ │Telegram │ │Facebook │ │Instagram│ ...   │
                    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
                    └─────────────────────────────────────────────────────────┘
```

## Workers Architecture

### API Workers (Domain-Split)

Each API worker handles a specific domain, allowing for:
- Independent scaling and deployment
- Clear separation of concerns
- Smaller bundle sizes

| Worker | Responsibility |
|--------|----------------|
| api-auth | User authentication, organizations, members |
| api-clients | Client management, contacts, tags, segments |
| api-templates | Template CRUD, versioning, media assets |
| api-campaigns | Campaign management, flow execution |
| api-analytics | Metrics, reports, event tracking |
| api-billing | Stripe integration, subscriptions, usage |

### Background Workers

| Worker | Trigger | Responsibility |
|--------|---------|----------------|
| scheduler | Cron (*/1m, */5m, hourly) | Activate campaigns, resume waits |
| queue-processor | Queue consumer | Send messages, process nodes |
| webhooks | HTTP | Handle provider callbacks |
| realtime | HTTP + WebSocket | Real-time notifications |

## Data Flow

### Campaign Execution

```
1. User creates campaign → api-campaigns → D1
2. User activates campaign → api-campaigns updates status
3. Scheduler (cron) picks up scheduled campaigns
4. Scheduler creates enrollments for contacts
5. For each enrollment:
   a. Queue processor receives process_node message
   b. Evaluates node type (send, wait, condition)
   c. For send: queues message via Channel Provider
   d. For wait: updates enrollment.waitUntil
   e. For condition: evaluates and routes to next node
6. Scheduler (cron) resumes waiting enrollments
7. Process repeats until enrollment reaches end node
```

### Message Delivery

```
1. queue-processor receives send_message
2. Fetches contact and template from D1
3. Renders template with variables
4. Gets channel credentials from D1
5. Sends via appropriate provider
6. Updates message status in D1
7. Provider sends delivery webhook
8. webhooks worker updates final status
```

## Database Design

### Multi-tenancy

- Organizations are the top-level tenant
- All queries filter by organizationId
- Clerk handles org membership externally

### Key Relationships

```
Organization
  └── Clients
        └── Contacts
        └── Tags
        └── Segments
        └── Campaigns
              └── Enrollments
              └── Messages

Organization
  └── Templates
        └── Versions
  └── ChannelConnections
  └── Subscription
```

## Security

### Authentication

- Clerk JWT verification in auth middleware
- Organization context extracted from JWT claims
- Role-based permissions checked per-route

### Rate Limiting

- KV-based rate limiting per user/IP
- Different limits for auth vs. API vs. webhooks
- Bulk operations have stricter limits

### Webhook Verification

- Each provider has signature verification
- HMAC-SHA256 for Meta platforms
- Timing-safe comparison to prevent attacks

## Scalability Considerations

### D1 Limitations

- D1 has row count and size limits
- Analytics events should be aggregated and pruned
- Large contact imports done in batches

### Queue Processing

- Max batch size: 10 messages
- Max retries: 3 with exponential backoff
- Dead letter queue for failed messages

### Real-time Connections

- Durable Objects manage WebSocket connections
- One DO instance per organization
- Broadcast messages to all connected clients

## Deployment

### CI/CD Pipeline

1. Push to main triggers workflows
2. Packages built and uploaded as artifacts
3. Workers deployed in parallel
4. Frontend deployed to Cloudflare Pages

### Environment Separation

- Development: Local wrangler dev
- Staging: Separate Cloudflare account/zone
- Production: Main Cloudflare account

## Monitoring & Observability

### Logging

- Structured JSON logs from all workers
- Request ID propagated across services
- Console.log sent to Cloudflare Logs

### Metrics (Future)

- Cloudflare Analytics for request metrics
- Custom analytics events for business metrics
- Integration with external APM (e.g., Sentry)

## Cost Optimization

### Cloudflare Free Tier

- 100k worker requests/day free
- 5GB D1 storage free
- 1M KV reads/day free
- 10GB R2 storage free

### Scaling Costs

- Workers: $5/month for 10M requests
- D1: $0.75/1B row reads
- Queues: $0.40/1M messages
- R2: $0.015/GB/month storage
