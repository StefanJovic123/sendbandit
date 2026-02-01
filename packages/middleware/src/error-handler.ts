import { HTTPException } from 'hono/http-exception'
import type { ErrorHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { HonoEnv } from '@sendbandit/shared/types'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler: ErrorHandler<HonoEnv> = (err, c) => {
  const requestId = c.get('requestId') || 'unknown'

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }))

    console.error(JSON.stringify({
      type: 'validation_error',
      requestId,
      errors,
      timestamp: new Date().toISOString(),
    }))

    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { errors },
        },
      },
      400
    )
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    console.error(JSON.stringify({
      type: 'app_error',
      requestId,
      code: err.code,
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    }))

    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as ContentfulStatusCode
    )
  }

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    console.error(JSON.stringify({
      type: 'http_exception',
      requestId,
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString(),
    }))

    return c.json(
      {
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status
    )
  }

  // Handle unknown errors
  console.error(JSON.stringify({
    type: 'unknown_error',
    requestId,
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  }))

  // Don't expose internal error details in production
  const message =
    c.env.ENVIRONMENT === 'production'
      ? 'An unexpected error occurred'
      : err instanceof Error
        ? err.message
        : 'Unknown error'

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    },
    500
  )
}

// Common error helpers
export const notFound = (resource: string) =>
  new AppError('NOT_FOUND', `${resource} not found`, 404)

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError('BAD_REQUEST', message, 400, details)

export const unauthorized = (message = 'Unauthorized') =>
  new AppError('UNAUTHORIZED', message, 401)

export const forbidden = (message = 'Forbidden') =>
  new AppError('FORBIDDEN', message, 403)

export const conflict = (message: string) =>
  new AppError('CONFLICT', message, 409)

export const tooManyRequests = (retryAfter: number) =>
  new AppError('RATE_LIMITED', 'Too many requests', 429, { retryAfter })
