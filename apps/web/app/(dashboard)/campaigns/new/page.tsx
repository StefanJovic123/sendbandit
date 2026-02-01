'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CampaignBuilder } from '../campaign-builder'
import { createBrowserClient } from '@/lib/api'

type Client = {
  id: string
  name: string
  description: string | null
  industry: string | null
  contactsCount: number
  createdAt: string
}

type Template = {
  id: string
  name: string
  description: string | null
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  content: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { orgId, getToken } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgId === null) {
      router.push('/dashboard')
      return
    }

    async function fetchData() {
      try {
        const apiClient = createBrowserClient(getToken)
        const [clientsRes, templatesRes] = await Promise.all([
          apiClient.clients.list(),
          apiClient.templates.list(),
        ])

        setClients(
          (clientsRes.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description || null,
            industry: c.industry || null,
            contactsCount: c.contactsCount || 0,
            createdAt: c.createdAt,
          }))
        )

        setTemplates(
          (templatesRes.data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || null,
            channel: t.channel as Template['channel'],
            status: t.status as Template['status'],
            content: t.content?.text || '',
            variables: t.variables || [],
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }))
        )
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orgId, getToken, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col">
      <CampaignBuilder clients={clients} templates={templates} />
    </div>
  )
}
