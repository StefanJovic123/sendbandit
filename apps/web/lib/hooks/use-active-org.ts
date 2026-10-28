'use client'

import { useAuth, useClerk } from '@clerk/nextjs'

/**
 * The active organization, reported only once Clerk has loaded in the browser.
 *
 * Until then `useAuth()` answers from the server-rendered auth state, which never has an organization here: the server
 * SDK (@clerk/nextjs 5) doesn't read the org claim of this instance's v2 session tokens. Pages that redirect when there
 * is no organization must wait for `isLoaded`, or they bounce to /dashboard on every direct load or refresh.
 */
export function useActiveOrg(): { isLoaded: boolean; orgId: string | null } {
  const { loaded } = useClerk()
  const { orgId } = useAuth()
  return { isLoaded: loaded, orgId: loaded ? (orgId ?? null) : null }
}
