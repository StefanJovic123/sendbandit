import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorHandler,
  authMiddleware,
} from '@sendbandit/middleware'
import { generateId, toCamelCase, verifySvixSignature } from '@sendbandit/shared/utils'
import type { HonoEnv } from '@sendbandit/shared/types'
import type { OrganizationRole } from '@sendbandit/shared/constants'

const app = new Hono<HonoEnv>()

// Clerk membership role -> organization_members.role, the same mapping as the clerk-webhook edge function
const CLERK_ROLES: Record<string, OrganizationRole> = {
  'org:admin': 'admin',
  'org:member': 'user',
  // Role keys of older Clerk instances
  admin: 'admin',
  basic_member: 'user',
  guest_member: 'viewer',
}

function mapClerkRole(clerkRole: string): OrganizationRole {
  return CLERK_ROLES[clerkRole] ?? 'user'
}

// Helper to create Supabase client
function getSupabase(env: HonoEnv['Bindings']) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Global middleware
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.onError(errorHandler)

// Health check (no auth)
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'api-auth' })
})

// Clerk webhook for user sync. Clerk signs every delivery (Svix); anything unsigned or tampered with is rejected
// before it can touch the database.
app.post('/webhooks/clerk', async (c) => {
  const secret = c.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Webhook Error] CLERK_WEBHOOK_SECRET is not set')
    return c.json({ error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Server configuration error' } }, 500)
  }

  const body = await c.req.text()
  const verified = await verifySvixSignature(
    secret,
    {
      id: c.req.header('svix-id'),
      timestamp: c.req.header('svix-timestamp'),
      signature: c.req.header('svix-signature'),
    },
    body
  )
  if (!verified) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } }, 401)
  }

  const payload = JSON.parse(body)
  const supabase = getSupabase(c.env)

  try {
    switch (payload.type) {
      case 'user.created':
      case 'user.updated': {
        const userData = payload.data
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('clerk_id', userData.id)
          .single()

        if (existingUser) {
          await supabase
            .from('user_profiles')
            .update({
              email: userData.email_addresses?.[0]?.email_address || existingUser.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              avatar_url: userData.image_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id)
        } else {
          await supabase.from('user_profiles').insert({
            id: generateId('user'),
            clerk_id: userData.id,
            email: userData.email_addresses?.[0]?.email_address || '',
            first_name: userData.first_name,
            last_name: userData.last_name,
            avatar_url: userData.image_url,
          })
        }
        break
      }

      case 'user.deleted': {
        await supabase.from('user_profiles').delete().eq('clerk_id', payload.data.id)
        break
      }

      case 'organization.created': {
        const orgData = payload.data
        await supabase.from('organizations').insert({
          id: generateId('organization'),
          clerk_org_id: orgData.id,
          name: orgData.name,
          slug: orgData.slug,
          logo_url: orgData.image_url,
        })
        break
      }

      case 'organization.updated': {
        const orgData = payload.data
        await supabase
          .from('organizations')
          .update({
            name: orgData.name,
            slug: orgData.slug,
            logo_url: orgData.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_org_id', orgData.id)
        break
      }

      case 'organization.deleted': {
        await supabase.from('organizations').delete().eq('clerk_org_id', payload.data.id)
        break
      }

      case 'organizationMembership.created': {
        const memberData = payload.data
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', memberData.organization.id)
          .single()

        if (org) {
          await supabase.from('organization_members').insert({
            id: generateId('user'),
            organization_id: org.id,
            user_id: memberData.public_user_data.user_id,
            role: mapClerkRole(memberData.role),
          })
        }
        break
      }

      case 'organizationMembership.updated': {
        const memberData = payload.data
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', memberData.organization.id)
          .single()

        if (org) {
          await supabase
            .from('organization_members')
            .update({ role: mapClerkRole(memberData.role) })
            .eq('organization_id', org.id)
            .eq('user_id', memberData.public_user_data.user_id)
        }
        break
      }

      case 'organizationMembership.deleted': {
        const memberData = payload.data
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', memberData.organization.id)
          .single()

        if (org) {
          await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', org.id)
            .eq('user_id', memberData.public_user_data.user_id)
        }
        break
      }
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Protected routes
app.use('/me/*', authMiddleware)
app.use('/organizations/*', authMiddleware)

// Get current user profile
app.get('/me', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)

  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('clerk_id', userId)
    .single()

  if (error || !user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  return c.json({ data: toCamelCase(user) })
})

// Get user's organizations
app.get('/me/organizations', async (c) => {
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) {
    return c.json({ data: [] })
  }

  const orgIds = memberships.map((m) => m.organization_id)
  const { data: orgs } = await supabase.from('organizations').select('*').in('id', orgIds)

  const result = (orgs || []).map((org) =>
    toCamelCase({ ...org, role: memberships.find((m) => m.organization_id === org.id)?.role })
  )

  return c.json({ data: result })
})

// Get organization by ID
app.get('/organizations/:id', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)

  const { data: org, error } = await supabase.from('organizations').select('*').eq('id', id).single()

  if (error || !org) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Organization not found' } }, 404)
  }

  // Check membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', id)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not a member' } }, 403)
  }

  return c.json({ data: toCamelCase({ ...org, role: membership.role }) })
})

// Get organization members
app.get('/organizations/:id/members', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const supabase = getSupabase(c.env)

  // Check membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', id)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Not a member' } }, 403)
  }

  const { data: members } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', id)

  if (!members || members.length === 0) {
    return c.json({ data: [] })
  }

  // Get user profiles for members
  const userIds = members.map((m) => m.user_id)
  const { data: users } = await supabase.from('user_profiles').select('*').in('clerk_id', userIds)

  const result = members.map((member) => {
    const user = users?.find((u) => u.clerk_id === member.user_id)
    return toCamelCase({ ...member, user: user && toCamelCase(user) })
  })

  return c.json({ data: result })
})

export default app
