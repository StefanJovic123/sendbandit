import { createMiddleware } from 'hono/factory'
import type { HonoEnv } from '@sendbandit/shared/types'
import { generateSimpleId } from '@sendbandit/shared/utils'

export const loggerMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || generateSimpleId(12)
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)

  const start = Date.now()
  const method = c.req.method
  const path = new URL(c.req.url).pathname

  // Log request start
  console.log(JSON.stringify({
    type: 'request',
    requestId,
    method,
    path,
    timestamp: new Date().toISOString(),
  }))

  try {
    await next()
  } catch (error) {
    // Log error
    console.error(JSON.stringify({
      type: 'error',
      requestId,
      method,
      path,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }))
    throw error
  }

  const duration = Date.now() - start
  const status = c.res.status

  // Log response
  console.log(JSON.stringify({
    type: 'response',
    requestId,
    method,
    path,
    status,
    duration,
    timestamp: new Date().toISOString(),
  }))
})

// Structured logger helper for use within route handlers
export function createLogger(requestId: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'info',
        requestId,
        message,
        ...data,
        timestamp: new Date().toISOString(),
      }))
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'warn',
        requestId,
        message,
        ...data,
        timestamp: new Date().toISOString(),
      }))
    },
    error: (message: string, error?: Error, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'error',
        requestId,
        message,
        error: error?.message,
        stack: error?.stack,
        ...data,
        timestamp: new Date().toISOString(),
      }))
    },
  }
}
