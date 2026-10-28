import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Env, HonoEnv } from '@sendbandit/shared/types'
import { clerkRoleToOrganizationRole, hasPermission } from '@sendbandit/shared/constants'
import { generateId } from '@sendbandit/shared/utils'

function getSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const CLERK_API_URL = 'https://api.clerk.com/v1'

interface ClerkOrganization {
  id: string
  name: string
  slug: string | null
  image_url?: string | null
}

interface ClerkUser {
  id: string
  first_name: string | null
  last_name: string | null
  image_url?: string | null
  primary_email_address_id: string | null
  email_addresses: Array<{ id: string; email_address: string }>
}

// Organizations, memberships and users normally reach the database through the Clerk webhook. When a delivery never
// arrived (the endpoint was set up later, or Clerk can't reach a local dev server), the first request with a verified
// session token for the organization creates them from the Clerk API. The token proves the user's membership and role.
async function provisionFromClerk(c: Context<HonoEnv>, supabase: SupabaseClient, clerkOrgId: string) {
  const secretKey = c.env.CLERK_SECRET_KEY
  if (!secretKey) return null

  const clerk = async <T>(path: string): Promise<T | null> => {
    const res = await fetch(`${CLERK_API_URL}${path}`, { headers: { Authorization: `Bearer ${secretKey}` } })
    return res.ok ? ((await res.json()) as T) : null
  }

  const clerkOrg = await clerk<ClerkOrganization>(`/organizations/${encodeURIComponent(clerkOrgId)}`)
  if (!clerkOrg) return null

  // Parallel requests (or a late webhook) can create the same rows; the unique keys keep one, so duplicates are ignored
  await supabase.from('organizations').upsert(
    {
      id: generateId('organization'),
      clerk_org_id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? clerkOrg.id,
      logo_url: clerkOrg.image_url ?? null,
    },
    { onConflict: 'clerk_org_id', ignoreDuplicates: true }
  )
  const { data: org } = await supabase.from('organizations').select('*').eq('clerk_org_id', clerkOrgId).single()
  if (!org) return null

  const userId = c.get('userId')
  await supabase.from('organization_members').upsert(
    {
      id: generateId('user'),
      organization_id: org.id,
      user_id: userId,
      role: clerkRoleToOrganizationRole(c.get('orgRole')),
    },
    { onConflict: 'organization_id,user_id', ignoreDuplicates: true }
  )

  const { data: profile } = await supabase.from('user_profiles').select('id').eq('clerk_id', userId).maybeSingle()
  if (!profile) {
    const user = await clerk<ClerkUser>(`/users/${encodeURIComponent(userId)}`)
    if (user) {
      const email =
        user.email_addresses.find((e) => e.id === user.primary_email_address_id)?.email_address ??
        user.email_addresses[0]?.email_address ??
        ''
      await supabase.from('user_profiles').upsert(
        {
          id: generateId('user'),
          clerk_id: user.id,
          email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.image_url ?? null,
        },
        { onConflict: 'clerk_id', ignoreDuplicates: true }
      )
    }
  }

  return org
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

  const { data: existing, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('clerk_org_id', orgId)
    .maybeSingle()

  const org = existing ?? (error ? null : await provisionFromClerk(c, supabase, orgId))

  if (!org) {
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
