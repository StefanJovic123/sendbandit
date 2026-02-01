import { Hono } from 'hono'
import { corsMiddleware, loggerMiddleware, authMiddleware } from '@sendbandit/middleware'
import type { Env as BaseEnv } from '@sendbandit/shared/types'

type Env = BaseEnv & {
  ROOMS: DurableObjectNamespace
  INTERNAL_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'realtime' }))

// WebSocket endpoint - connect to organization room
app.get('/ws/:orgId', authMiddleware, async (c) => {
  const { orgId } = c.req.param()
  const userId = c.get('userId')

  // Get or create Durable Object for this organization
  const id = c.env.ROOMS.idFromName(orgId)
  const room = c.env.ROOMS.get(id)

  // Forward the WebSocket upgrade request to the Durable Object
  const url = new URL(c.req.url)
  url.searchParams.set('userId', userId)

  return room.fetch(new Request(url, c.req.raw))
})

// HTTP endpoint to broadcast events (called by other workers)
app.post('/broadcast/:orgId', async (c) => {
  const { orgId } = c.req.param()
  const body = await c.req.json()

  // Verify internal auth (e.g., shared secret)
  const internalSecret = c.req.header('X-Internal-Secret')
  if (internalSecret !== c.env.INTERNAL_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const id = c.env.ROOMS.idFromName(orgId)
  const room = c.env.ROOMS.get(id)

  // Send broadcast request to Durable Object
  await room.fetch(
    new Request('https://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )

  return c.json({ success: true })
})

export default app

// Durable Object for managing WebSocket connections per organization
export class RealtimeRoom implements DurableObject {
  private connections: Map<string, WebSocket> = new Map()
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, url)
    }

    // Handle internal broadcast
    if (url.pathname === '/broadcast') {
      return this.handleBroadcast(request)
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response('Missing userId', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Store connection
    this.connections.set(userId, server)

    // Accept the WebSocket
    server.accept()

    // Handle messages from client
    server.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string)
        this.handleClientMessage(userId, message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    })

    // Handle close
    server.addEventListener('close', () => {
      this.connections.delete(userId)
      console.log(`User ${userId} disconnected`)
    })

    // Handle error
    server.addEventListener('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error)
      this.connections.delete(userId)
    })

    // Send welcome message
    server.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to realtime service',
        userId,
      })
    )

    console.log(`User ${userId} connected`)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private handleClientMessage(userId: string, message: { type: string; data?: unknown }) {
    switch (message.type) {
      case 'ping':
        const ws = this.connections.get(userId)
        ws?.send(JSON.stringify({ type: 'pong' }))
        break

      case 'subscribe':
        // Handle channel subscriptions
        // e.g., subscribe to specific campaign updates
        break

      default:
        console.log(`Unknown message type from ${userId}:`, message.type)
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = await request.json() as {
      type: string
      event: string
      data: unknown
      targetUserIds?: string[]
    }

    const { type, event, data, targetUserIds } = body

    const message = JSON.stringify({
      type,
      event,
      data,
      timestamp: new Date().toISOString(),
    })

    // Broadcast to all or specific users
    if (targetUserIds && targetUserIds.length > 0) {
      for (const userId of targetUserIds) {
        const ws = this.connections.get(userId)
        if (ws) {
          try {
            ws.send(message)
          } catch (error) {
            console.error(`Error sending to ${userId}:`, error)
            this.connections.delete(userId)
          }
        }
      }
    } else {
      // Broadcast to all
      for (const [userId, ws] of this.connections) {
        try {
          ws.send(message)
        } catch (error) {
          console.error(`Error sending to ${userId}:`, error)
          this.connections.delete(userId)
        }
      }
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
