import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

/**
 * Get the current organization ID from Clerk auth or fallback cookie.
 * This is a workaround for Clerk v5 + Next.js App Router org sync issues.
 */
export async function getOrgId(): Promise<string | null> {
  const { orgId: authOrgId } = await auth()

  if (authOrgId) {
    return authOrgId
  }

  // Fallback to cookie if Clerk auth doesn't have orgId
  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get('__org_id')?.value

  return cookieOrgId || null
}

/**
 * Get full auth context with org fallback
 */
export async function getAuthContext() {
  const authResult = await auth()
  const cookieStore = await cookies()
  const cookieOrgId = cookieStore.get('__org_id')?.value

  return {
    ...authResult,
    orgId: authResult.orgId || cookieOrgId || null,
  }
}
