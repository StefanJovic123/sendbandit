import { SupabaseClient } from '@supabase/supabase-js'

// Re-export Supabase client type
export type { SupabaseClient }

// Type alias for backward compatibility
export type Database = SupabaseClient

// Create Supabase client (deprecated - use createSupabaseFromEnv instead)
export function createDb(_connectionString: string): never {
  throw new Error(
    'createDb with connection string is deprecated. Use createSupabaseFromEnv or createSupabaseClient from @sendbandit/database instead.'
  )
}

// Organization queries
export async function getOrganizationById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getOrganizationBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getOrganizationByClerkId(supabase: SupabaseClient, clerkOrgId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('clerk_org_id', clerkOrgId)
    .single()

  if (error) return null
  return data
}

export async function getUserOrganizations(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', userId)

  if (error) return []
  return data
}

// Client queries
export async function getClientsByOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return []
  return data
}

export async function getClientById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// Contact queries
export async function getContactsByClient(
  supabase: SupabaseClient,
  clientId: string,
  options?: { limit?: number; offset?: number; search?: string }
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.search) {
    query = query.or(
      `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`
    )
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function getContactById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// Template queries
export async function getTemplatesByOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { channel?: string; status?: string; limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  let query = supabase
    .from('templates')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.channel) {
    query = query.eq('channel', options.channel)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function getTemplateById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// Campaign queries
export async function getCampaignsByClient(
  supabase: SupabaseClient,
  clientId: string,
  options?: { status?: string; limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function getCampaignById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getScheduledCampaigns(supabase: SupabaseClient, beforeTime: Date) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', beforeTime.toISOString())

  if (error) return []
  return data
}

// Enrollment queries
export async function getEnrollmentsByCampaign(
  supabase: SupabaseClient,
  campaignId: string,
  options?: { status?: string; limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  let query = supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) return []
  return data
}

export async function getWaitingEnrollments(supabase: SupabaseClient, beforeTime: Date) {
  const { data, error } = await supabase
    .from('campaign_enrollments')
    .select('*')
    .eq('status', 'waiting')
    .lte('wait_until', beforeTime.toISOString())

  if (error) return []
  return data
}

// Message queries
export async function getMessagesByContact(
  supabase: SupabaseClient,
  contactId: string,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return []
  return data
}

export async function getMessageByProviderId(supabase: SupabaseClient, providerMessageId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('provider_message_id', providerMessageId)
    .single()

  if (error) return null
  return data
}

// Usage queries
export async function getOrganizationUsage(supabase: SupabaseClient, organizationId: string, period: string) {
  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('period', period)
    .single()

  if (error) return null
  return data
}

// Subscription queries
export async function getOrganizationSubscription(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error) return null
  return data
}

// Channel connection queries
export async function getChannelConnectionByChannel(
  supabase: SupabaseClient,
  clientId: string,
  channel: string
) {
  const { data, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('client_id', clientId)
    .eq('channel', channel)
    .eq('status', 'active')
    .single()

  if (error) return null
  return data
}

// Organization member queries
export async function getOrganizationMember(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}
