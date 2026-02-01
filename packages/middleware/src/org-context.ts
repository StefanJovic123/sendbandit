import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { Env, HonoEnv } from '@sendbandit/shared/types'
import { hasPermission } from '@sendbandit/shared/constants'

function getSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const orgContextMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const orgId = c.get('orgId')

  if (!orgId) {
    return c.json(
      { error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
      400
    )
  }

  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
    return c.json(
      { error: { code: 'DB_ERROR', message: 'Database not configured' } },
      500
    )
  }

  const supabase = getSupabase(c.env)

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('clerk_org_id', orgId)
    .single()

  if (error || !org) {
    return c.json(
      { error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' } },
      404
    )
  }

  c.set('org', org)

  await next()
})

// Middleware to check if user has specific permission in org
export function requirePermission(permission: string) {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const userId = c.get('userId')
    const org = c.get('org')

    if (!org) {
      return c.json(
        { error: { code: 'ORG_REQUIRED', message: 'Organization context required' } },
        400
      )
    }

    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
      return c.json(
        { error: { code: 'DB_ERROR', message: 'Database not configured' } },
        500
      )
    }

    const supabase = getSupabase(c.env)

    // Get user's membership in this org
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', org.id)
      .eq('user_id', userId)
      .single()

    if (error || !membership) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } },
        403
      )
    }

    // Check permission based on role
    if (!hasPermission(membership.role, permission)) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: `Missing permission: ${permission}` } },
        403
      )
    }

    await next()
  })
}
