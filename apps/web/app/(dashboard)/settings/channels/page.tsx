'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconPlus,
  IconCheck,
  IconX,
  IconLoader2,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconRefresh,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createBrowserClient } from '@/lib/api'

type ChannelConnection = {
  id: string
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  name: string
  isActive: boolean
  webhookUrl: string | null
  lastVerifiedAt: string | null
  createdAt: string
}

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: IconBrandWhatsapp,
  telegram: IconBrandTelegram,
  facebook: IconBrandFacebook,
  instagram: IconBrandInstagram,
  slack: IconBrandSlack,
  discord: IconBrandDiscord,
}

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  telegram: 'bg-blue-500',
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-500',
  slack: 'bg-purple-500',
  discord: 'bg-indigo-500',
}

const channelNames: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  facebook: 'Facebook Messenger',
  instagram: 'Instagram',
  slack: 'Slack',
  discord: 'Discord',
}

export default function ChannelsSettingsPage() {
  const router = useRouter()
  const { orgId, getToken } = useAuth()
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [deleteChannel, setDeleteChannel] = useState<ChannelConnection | null>(null)

  useEffect(() => {
    if (orgId === null) {
      router.push('/dashboard')
      return
    }

    fetchChannels()
  }, [orgId])

  async function fetchChannels() {
    try {
      const apiClient = createBrowserClient(getToken)
      const res = await apiClient.channels.list()
      setChannels(res.data || [])
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(channelId: string) {
    setVerifying(channelId)
    try {
      const apiClient = createBrowserClient(getToken)
      const res = await apiClient.channels.verify(channelId)
      if (res.data.valid) {
        // Refresh channels to get updated lastVerifiedAt
        await fetchChannels()
      } else {
        alert(`Verification failed: ${res.data.error}`)
      }
    } catch (error) {
      console.error('Verification failed:', error)
      alert('Verification failed')
    } finally {
      setVerifying(null)
    }
  }

  async function handleDelete() {
    if (!deleteChannel) return

    try {
      const apiClient = createBrowserClient(getToken)
      await apiClient.channels.delete(deleteChannel.id)
      setChannels(channels.filter((c) => c.id !== deleteChannel.id))
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete channel')
    } finally {
      setDeleteChannel(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading channels...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channel Connections</h1>
          <p className="text-muted-foreground">
            Connect your messaging channels to start sending messages
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/channels/new">
            <IconPlus className="mr-2 size-4" />
            Add Channel
          </Link>
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No channels connected yet</p>
            <Button asChild className="mt-4">
              <Link href="/settings/channels/new">
                <IconPlus className="mr-2 size-4" />
                Connect Your First Channel
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channelIcons[channel.channel] || IconBrandWhatsapp
            return (
              <Card key={channel.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${channelColors[channel.channel]}`}
                    >
                      <Icon className="size-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                      <CardDescription>{channelNames[channel.channel]}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/settings/channels/${channel.id}`}>
                          <IconPencil className="mr-2 size-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleVerify(channel.id)}
                        disabled={verifying === channel.id}
                      >
                        {verifying === channel.id ? (
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <IconRefresh className="mr-2 size-4" />
                        )}
                        Verify
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteChannel(channel)}
                      >
                        <IconTrash className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                      {channel.isActive ? (
                        <>
                          <IconCheck className="mr-1 size-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <IconX className="mr-1 size-3" />
                          Inactive
                        </>
                      )}
                    </Badge>
                    {channel.lastVerifiedAt && (
                      <span className="text-xs text-muted-foreground">
                        Verified {new Date(channel.lastVerifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {channel.webhookUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Webhook URL</p>
                      <code className="mt-1 block truncate rounded bg-muted px-2 py-1 text-xs">
                        {channel.webhookUrl}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!deleteChannel} onOpenChange={() => setDeleteChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {deleteChannel?.name} connection? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
