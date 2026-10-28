'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveOrg } from '@/lib/hooks'
import { ClientForm } from '../client-form'

export default function NewClientPage() {
  const router = useRouter()
  const { isLoaded, orgId } = useActiveOrg()

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
    }
  }, [isLoaded, orgId, router])

  if (!orgId) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Client</h1>
        <p className="text-muted-foreground">
          Create a new client to manage their contacts and campaigns
        </p>
      </div>

      <div className="max-w-2xl">
        <ClientForm />
      </div>
    </div>
  )
}
