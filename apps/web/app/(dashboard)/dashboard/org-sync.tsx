'use client'

import { useEffect } from 'react'
import { useAuth, useOrganization } from '@clerk/nextjs'

interface OrgSyncProps {
  serverOrgId: string | null
}

export function OrgSync({ serverOrgId }: OrgSyncProps) {
  const { orgId: clientOrgId, isLoaded } = useAuth()
  const { organization } = useOrganization()

  useEffect(() => {
    if (!isLoaded) return

    // If client has org but server doesn't, set a cookie and hard refresh
    if (clientOrgId && !serverOrgId) {
      // Set org cookie for server-side access
      document.cookie = `__org_id=${clientOrgId}; path=/; max-age=31536000; SameSite=Lax`
      if (organization?.slug) {
        document.cookie = `__org_slug=${organization.slug}; path=/; max-age=31536000; SameSite=Lax`
      }
      // Force a hard refresh to pick up the new cookies
      window.location.reload()
    }
  }, [clientOrgId, serverOrgId, isLoaded, organization])

  return null
}
