'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { CampaignBuilder } from '../../campaign-builder'
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

type Campaign = {
  id: string
  name: string
  description: string | null
  clientId: string
  type: 'one_time' | 'recurring' | 'triggered'
  triggerType: string
  flowData: {
    nodes: any[]
    edges: any[]
  } | null
}

export default function EditCampaignPage() {
  const router = useRouter()
  const params = useParams()
  const { orgId, getToken } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    if (orgId === null) {
      router.push('/dashboard')
      return
    }

    async function fetchData() {
      try {
        const apiClient = createBrowserClient(getToken)
        const [campaignRes, clientsRes, templatesRes] = await Promise.all([
          apiClient.campaigns.get(id),
          apiClient.clients.list(),
          apiClient.templates.list(),
        ])

        if (!campaignRes.data) {
          router.push('/campaigns')
          return
        }

        setCampaign({
          id: campaignRes.data.id,
          name: campaignRes.data.name,
          description: campaignRes.data.description || null,
          clientId: campaignRes.data.clientId,
          type: campaignRes.data.type as 'one_time' | 'recurring' | 'triggered',
          triggerType: campaignRes.data.triggerType,
          flowData: campaignRes.data.flowData || null,
        })

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
        router.push('/campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orgId, id, getToken, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading campaign...</div>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col">
      <CampaignBuilder
        clients={clients}
        templates={templates}
        initialData={{
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          clientId: campaign.clientId,
          type: campaign.type,
          triggerType: campaign.triggerType,
          nodes: campaign.flowData?.nodes || [],
          edges: campaign.flowData?.edges || [],
        }}
      />
    </div>
  )
}
