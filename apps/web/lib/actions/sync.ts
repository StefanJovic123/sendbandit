'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { getApiClient } from '@/lib/api.server'

/**
 * Sync the current Clerk user to the database via API
 * This is called as a fallback - primary sync is via Clerk webhooks
 */
export async function syncUser() {
  const user = await currentUser()

  if (!user) {
    return null
  }

  try {
    const client = await getApiClient()
    const response = await client.organizations.current()
    return response.data
  } catch (error) {
    console.error('Failed to sync user:', error)
    return null
  }
}

/**
 * Get the current organization via API
 */
export async function getCurrentOrg() {
  const { orgId } = await auth()

  if (!orgId) {
    return null
  }

  try {
    const client = await getApiClient()
    const response = await client.organizations.current()
    return response.data
  } catch (error) {
    console.error('Failed to get current org:', error)
    return null
  }
}

/**
 * Sync the current Clerk organization to the database via API
 * This is called as a fallback - primary sync is via Clerk webhooks
 */
export async function syncOrganization() {
  const { orgId } = await auth()

  if (!orgId) {
    return null
  }

  try {
    const client = await getApiClient()
    const response = await client.organizations.current()
    return response.data
  } catch (error) {
    console.error('Failed to sync organization:', error)
    return null
  }
}
