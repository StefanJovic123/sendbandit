'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import { ClientForm } from '../../client-form'
import { createBrowserClient } from '@/lib/api'

type Client = {
  id: string
  name: string
  description?: string
  industry?: string
  timezone: string
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchClient() {
      try {
        const apiClient = createBrowserClient(getToken)
        const res = await apiClient.clients.get(id)

        if (!res.data) {
          router.push('/clients')
          return
        }

        setClient({
          id: res.data.id,
          name: res.data.name,
          description: res.data.description || undefined,
          industry: res.data.industry || undefined,
          timezone: res.data.timezone,
        })
      } catch (error) {
        console.error('Failed to fetch client:', error)
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [isLoaded, orgId, id, getToken, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading client...</div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
        <p className="text-muted-foreground">Update client information</p>
      </div>

      <div className="max-w-2xl">
        <ClientForm initialData={client} />
      </div>
    </div>
  )
}
