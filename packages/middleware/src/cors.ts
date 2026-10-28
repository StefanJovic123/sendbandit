import { cors } from 'hono/cors'

const ALLOWED_ORIGINS = [
  // Production
  'https://sendbandit.com',
  'https://www.sendbandit.com',
  'https://app.sendbandit.com',
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Local development domains (via /etc/hosts + Caddy HTTPS)
  'http://app.sendbandit.local',
  'http://api.sendbandit.local',
  'http://webhooks.sendbandit.local',
  'http://realtime.sendbandit.local',
  'http://media.sendbandit.local',
  'https://app.sendbandit.local',
  'https://api.sendbandit.local',
  'https://webhooks.sendbandit.local',
  'https://realtime.sendbandit.local',
  'https://media.sendbandit.local',
]

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0]
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    // Allow any subdomain of sendbandit.com
    if (origin.endsWith('.sendbandit.com')) return origin
    return ALLOWED_ORIGINS[0]
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
  ],
  exposeHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
})

// More permissive CORS for webhooks (allows any origin)
export const webhookCorsMiddleware = cors({
  origin: '*',
  allowMethods: ['POST'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
})
