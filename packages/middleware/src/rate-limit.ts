import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import type { HonoEnv } from '@sendbandit/shared/types'
import { RATE_LIMITS } from '@sendbandit/shared/constants'

interface RateLimitConfig {
  limit: number
  windowMs: number
  keyPrefix?: string
  keyFn?: (c: Context<HonoEnv>) => string
}

const defaultKeyFn = (c: Context<HonoEnv>): string => {
  // Use user ID if available, otherwise use IP
  const userId = c.get('userId')
  if (userId) return `user:${userId}`

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  return `ip:${ip}`
}

export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const {
    limit = RATE_LIMITS.DEFAULT,
    windowMs = 60 * 1000, // 1 minute
    keyPrefix = 'ratelimit',
    keyFn = defaultKeyFn,
  } = config || {}

  return createMiddleware<HonoEnv>(async (c, next) => {
    const key = `${keyPrefix}:${keyFn(c)}`
    const now = Date.now()

    try {
      // Get current rate limit data from KV
      const data = await c.env.KV.get(key, 'json') as { count: number; resetAt: number } | null

      let count = 0
      let resetAt = now + windowMs

      if (data && data.resetAt > now) {
        count = data.count
        resetAt = data.resetAt
      }

      // Check if limit exceeded
      if (count >= limit) {
        const retryAfter = Math.ceil((resetAt - now) / 1000)

        return c.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests',
              retryAfter,
            },
          },
          429,
          {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
          }
        )
      }

      // Increment counter
      count++

      // Store updated count
      await c.env.KV.put(key, JSON.stringify({ count, resetAt }), {
        expirationTtl: Math.ceil(windowMs / 1000) + 1,
      })

      // Set rate limit headers
      c.header('X-RateLimit-Limit', limit.toString())
      c.header('X-RateLimit-Remaining', (limit - count).toString())
      c.header('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString())

      await next()
    } catch (error) {
      console.error('Rate limit error:', error)
      // On error, allow request but log
      await next()
    }
  })
}

// Pre-configured rate limiters
export const defaultRateLimit = rateLimitMiddleware()
export const authRateLimit = rateLimitMiddleware({ limit: RATE_LIMITS.AUTH, keyPrefix: 'ratelimit:auth' })
export const webhookRateLimit = rateLimitMiddleware({ limit: RATE_LIMITS.WEBHOOKS, keyPrefix: 'ratelimit:webhook' })
export const bulkRateLimit = rateLimitMiddleware({ limit: RATE_LIMITS.BULK_OPERATIONS, keyPrefix: 'ratelimit:bulk' })
