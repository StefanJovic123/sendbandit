import { createMiddleware } from 'hono/factory'
import { jwtVerify, importSPKI } from 'jose'
import type { HonoEnv } from '@sendbandit/shared/types'

interface ClerkJwtPayload {
  sub: string
  azp?: string
  exp: number
  iat: number
  nbf: number
  iss: string
  sid?: string
  org_id?: string
  o?: {
    id: string
    rol: string
    slg: string
  }
}

async function verifyClerkToken(token: string, jwtKey: string): Promise<ClerkJwtPayload> {
  // Parse the PEM key - handle escaped newlines from env vars
  const pemKey = jwtKey.replace(/\\n/g, '\n')

  console.log('[Auth Debug] Importing PEM key...')
  console.log('[Auth Debug] PEM starts with:', pemKey.substring(0, 50))

  // Import the PEM public key for RS256
  const publicKey = await importSPKI(pemKey, 'RS256')

  console.log('[Auth Debug] PEM key imported successfully')
  console.log('[Auth Debug] Verifying token...')

  // Verify the JWT
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
  })

  console.log('[Auth Debug] Token verified successfully')
  console.log('[Auth Debug] Payload sub:', payload.sub)
  console.log('[Auth Debug] Payload org:', payload.o || payload.org_id)

  return payload as unknown as ClerkJwtPayload
}

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const jwtKey = c.env.CLERK_JWT_KEY

    if (!jwtKey) {
      console.error('[Auth Error] CLERK_JWT_KEY is not set')
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Server configuration error' } }, 401)
    }

    console.log('[Auth Debug] Token received, length:', token.length)
    console.log('[Auth Debug] JWT Key available:', !!jwtKey)

    const payload = await verifyClerkToken(token, jwtKey)

    if (!payload.sub) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token payload' } }, 401)
    }

    c.set('userId', payload.sub)
    // org_id can be in payload.o.id (new format) or payload.org_id (old format)
    c.set('orgId', payload.o?.id ?? payload.org_id ?? null)

    await next()
  } catch (error) {
    console.error('[Auth Error] Full error:', error)
    console.error('[Auth Error] Error name:', (error as Error).name)
    console.error('[Auth Error] Error message:', (error as Error).message)
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401)
  }
})

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuthMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const jwtKey = c.env.CLERK_JWT_KEY

    if (jwtKey) {
      try {
        const payload = await verifyClerkToken(token, jwtKey)

        if (payload.sub) {
          c.set('userId', payload.sub)
          c.set('orgId', payload.o?.id ?? payload.org_id ?? null)
        }
      } catch {
        // Ignore auth errors for optional auth
      }
    }
  }

  await next()
})
