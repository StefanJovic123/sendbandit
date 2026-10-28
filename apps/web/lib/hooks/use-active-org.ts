'use client'

import { useAuth, useClerk } from '@clerk/nextjs'

/**
 * The active organization, reported only once Clerk has loaded in the browser.
 *
 * Until then `useAuth()` has no client session to read the organization from, so `orgId` is empty for everyone. Pages
 * that redirect when there is no organization must wait for `isLoaded`, or they bounce to /dashboard on every direct
 * load or refresh.
 */
export function useActiveOrg(): { isLoaded: boolean; orgId: string | null } {
  const { loaded } = useClerk()
  const { orgId } = useAuth()
  return { isLoaded: loaded, orgId: loaded ? (orgId ?? null) : null }
}
