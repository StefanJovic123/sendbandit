'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBrowserClient } from '@/lib/api'
import { CampaignCard } from './campaign-card'

type Campaign = {
  id: string
  name: string
  description: string | null
  type: 'one_time' | 'recurring' | 'triggered'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  triggerType: 'manual' | 'schedule' | 'event' | 'segment_entry' | 'segment_exit'
  clientId: string
  clientName: string
  scheduledAt: string | null
  enrolledCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
}

export default function CampaignsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  // Bumped after a card action (duplicate, activate, pause, delete) to load the list again
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchCampaigns() {
      try {
        const client = createBrowserClient(getToken)
        // One request for the whole organization; each campaign carries its client's name
        const res = await client.campaigns.list(undefined, { pageSize: 100 })
        const allCampaigns: Campaign[] = (res.data || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          description: campaign.description || null,
          type: campaign.type,
          status: campaign.status,
          triggerType: campaign.triggerType,
          clientId: campaign.clientId,
          clientName: campaign.clientName,
          scheduledAt: campaign.scheduledAt || null,
          enrolledCount: campaign.enrolledCount || 0,
          completedCount: campaign.completedCount || 0,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        }))

        allCampaigns.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        setCampaigns(allCampaigns)
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [isLoaded, orgId, getToken, router, reloadKey])

  const activeCampaigns = campaigns.filter((c) => c.status === 'active')
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft')
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled')
  const completedCampaigns = campaigns.filter((c) => c.status === 'completed' || c.status === 'cancelled')

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage automated marketing campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <IconPlus className="mr-2 size-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Create your first campaign to start automating your marketing.
            </p>
            <Button asChild>
              <Link href="/campaigns/new">
                <IconPlus className="mr-2 size-4" />
                Create Campaign
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              All ({campaigns.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({draftCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled ({scheduledCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <CampaignGrid campaigns={campaigns} onChanged={reload} />
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            <CampaignGrid campaigns={activeCampaigns} onChanged={reload} emptyMessage="No active campaigns" />
          </TabsContent>

          <TabsContent value="draft" className="mt-4">
            <CampaignGrid campaigns={draftCampaigns} onChanged={reload} emptyMessage="No draft campaigns" />
          </TabsContent>

          <TabsContent value="scheduled" className="mt-4">
            <CampaignGrid campaigns={scheduledCampaigns} onChanged={reload} emptyMessage="No scheduled campaigns" />
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <CampaignGrid campaigns={completedCampaigns} onChanged={reload} emptyMessage="No completed campaigns" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function CampaignGrid({
  campaigns,
  onChanged,
  emptyMessage = 'No campaigns',
}: {
  campaigns: Campaign[]
  onChanged: () => void
  emptyMessage?: string
}) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} onChanged={onChanged} />
      ))}
    </div>
  )
}
