'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import {
  IconArrowLeft,
  IconPencil,
  IconPlayerPlay,
  IconPlayerPause,
  IconUsers,
  IconMail,
  IconClock,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/api'
import { ApiError } from '@sendbandit/api-client'

type Campaign = {
  id: string
  name: string
  description: string | null
  type: 'one_time' | 'recurring' | 'triggered'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  triggerType: string
  clientId: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  completed: 'bg-purple-500',
  cancelled: 'bg-red-500',
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusChanging, setStatusChanging] = useState(false)

  const id = params.id as string

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchCampaign() {
      try {
        const apiClient = createBrowserClient(getToken)
        const res = await apiClient.campaigns.get(id)

        if (!res.data) {
          router.push('/campaigns')
          return
        }

        setCampaign({
          id: res.data.id,
          name: res.data.name,
          description: res.data.description || null,
          type: res.data.type as Campaign['type'],
          status: res.data.status as Campaign['status'],
          triggerType: res.data.triggerType,
          clientId: res.data.clientId,
          scheduledAt: res.data.scheduledAt || null,
          startedAt: res.data.startedAt || null,
          completedAt: res.data.completedAt || null,
          createdAt: res.data.createdAt,
          updatedAt: res.data.updatedAt,
        })
      } catch (error) {
        console.error('Failed to fetch campaign:', error)
        router.push('/campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [isLoaded, orgId, id, getToken, router])

  async function changeStatus(action: 'activate' | 'pause' | 'resume') {
    setStatusChanging(true)
    try {
      const res = await createBrowserClient(getToken).campaigns[action](id)
      const status = res.data.status as Campaign['status']
      setCampaign((current) => (current ? { ...current, status } : current))
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error)
      alert(error instanceof ApiError ? error.message : `Failed to ${action} campaign`)
    } finally {
      setStatusChanging(false)
    }
  }

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
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button variant="outline" onClick={() => changeStatus('activate')} disabled={statusChanging}>
              <IconPlayerPlay className="mr-2 size-4" />
              Activate
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button variant="outline" onClick={() => changeStatus('pause')} disabled={statusChanging}>
              <IconPlayerPause className="mr-2 size-4" />
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button variant="outline" onClick={() => changeStatus('resume')} disabled={statusChanging}>
              <IconPlayerPlay className="mr-2 size-4" />
              Resume
            </Button>
          )}
          <Button asChild>
            <Link href={`/campaigns/${id}/edit`}>
              <IconPencil className="mr-2 size-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
            <IconUsers className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">contacts enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <IconMail className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">total messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <IconClock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">campaign duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Configuration and settings for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{campaign.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trigger</p>
              <p className="font-medium capitalize">{campaign.triggerType.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(campaign.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
