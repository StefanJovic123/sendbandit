import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/svix@1.15.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ClerkUserEvent {
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
  }
  type: string
}

interface ClerkOrgEvent {
  data: {
    id: string
    name: string
    slug: string
    image_url: string | null
    created_by: string
  }
  type: string
}

interface ClerkOrgMembershipEvent {
  data: {
    id: string
    organization: { id: string }
    public_user_data: { user_id: string }
    role: string
  }
  type: string
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 21)
}

serve(async (req) => {
  // Verify webhook signature
  const payload = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  }

  const wh = new Webhook(webhookSecret)
  let event: ClerkUserEvent | ClerkOrgEvent | ClerkOrgMembershipEvent

  try {
    event = wh.verify(payload, headers) as any
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 401 })
  }

  const eventType = event.type

  try {
    // Handle user events
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const userData = (event as ClerkUserEvent).data
      await syncUser(userData)
    }

    if (eventType === 'user.deleted') {
      const userData = (event as ClerkUserEvent).data
      await deleteUser(userData.id)
    }

    // Handle organization events
    if (eventType === 'organization.created' || eventType === 'organization.updated') {
      const orgData = (event as ClerkOrgEvent).data
      await syncOrganization(orgData)
    }

    if (eventType === 'organization.deleted') {
      const orgData = (event as ClerkOrgEvent).data
      await deleteOrganization(orgData.id)
    }

    // Handle organization membership events
    if (eventType === 'organizationMembership.created') {
      const memberData = (event as ClerkOrgMembershipEvent).data
      await addOrgMember(memberData)
    }

    if (eventType === 'organizationMembership.deleted') {
      const memberData = (event as ClerkOrgMembershipEvent).data
      await removeOrgMember(memberData)
    }

    if (eventType === 'organizationMembership.updated') {
      const memberData = (event as ClerkOrgMembershipEvent).data
      await updateOrgMember(memberData)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function syncUser(userData: ClerkUserEvent['data']) {
  const { id, email_addresses, first_name, last_name, image_url } = userData
  const email = email_addresses[0]?.email_address || ''

  // Upsert user profile
  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: generateId(),
        clerk_id: id,
        email,
        first_name,
        last_name,
        avatar_url: image_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_id' }
    )

  if (error) {
    console.error('Error syncing user:', error)
    throw error
  }

  console.log(`User synced: ${id}`)
}

async function deleteUser(clerkId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('clerk_id', clerkId)

  if (error) {
    console.error('Error deleting user:', error)
    throw error
  }

  console.log(`User deleted: ${clerkId}`)
}

async function syncOrganization(orgData: ClerkOrgEvent['data']) {
  const { id, name, slug, image_url, created_by } = orgData

  // Upsert organization
  const { data: org, error } = await supabase
    .from('organizations')
    .upsert(
      {
        id: generateId(),
        clerk_org_id: id,
        name,
        slug,
        logo_url: image_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_org_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error syncing organization:', error)
    throw error
  }

  // If this is a new org, add the creator as owner
  if (created_by && org) {
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select()
      .eq('organization_id', org.id)
      .eq('user_id', created_by)
      .single()

    if (!existingMember) {
      await supabase.from('organization_members').insert({
        id: generateId(),
        organization_id: org.id,
        user_id: created_by,
        role: 'owner',
      })
    }
  }

  console.log(`Organization synced: ${id}`)
}

async function deleteOrganization(clerkOrgId: string) {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('clerk_org_id', clerkOrgId)

  if (error) {
    console.error('Error deleting organization:', error)
    throw error
  }

  console.log(`Organization deleted: ${clerkOrgId}`)
}

async function addOrgMember(memberData: ClerkOrgMembershipEvent['data']) {
  const { organization, public_user_data, role } = memberData

  // Get the organization ID from our database
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', organization.id)
    .single()

  if (!org) {
    console.error('Organization not found:', organization.id)
    return
  }

  // Map Clerk roles to our roles
  const mappedRole = mapClerkRole(role)

  const { error } = await supabase.from('organization_members').upsert(
    {
      id: generateId(),
      organization_id: org.id,
      user_id: public_user_data.user_id,
      role: mappedRole,
    },
    { onConflict: 'organization_id,user_id' }
  )

  if (error) {
    console.error('Error adding org member:', error)
    throw error
  }

  console.log(`Member added: ${public_user_data.user_id} to org ${organization.id}`)
}

async function removeOrgMember(memberData: ClerkOrgMembershipEvent['data']) {
  const { organization, public_user_data } = memberData

  // Get the organization ID from our database
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', organization.id)
    .single()

  if (!org) return

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', org.id)
    .eq('user_id', public_user_data.user_id)

  if (error) {
    console.error('Error removing org member:', error)
    throw error
  }

  console.log(`Member removed: ${public_user_data.user_id} from org ${organization.id}`)
}

async function updateOrgMember(memberData: ClerkOrgMembershipEvent['data']) {
  const { organization, public_user_data, role } = memberData

  // Get the organization ID from our database
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('clerk_org_id', organization.id)
    .single()

  if (!org) return

  const mappedRole = mapClerkRole(role)

  const { error } = await supabase
    .from('organization_members')
    .update({ role: mappedRole })
    .eq('organization_id', org.id)
    .eq('user_id', public_user_data.user_id)

  if (error) {
    console.error('Error updating org member:', error)
    throw error
  }

  console.log(`Member updated: ${public_user_data.user_id} in org ${organization.id}`)
}

function mapClerkRole(clerkRole: string): string {
  const roleMap: Record<string, string> = {
    'org:admin': 'admin',
    'org:member': 'user',
    admin: 'admin',
    basic_member: 'user',
    guest_member: 'viewer',
  }
  return roleMap[clerkRole] || 'user'
}
