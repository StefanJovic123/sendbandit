'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconMail,
  IconPhone,
  IconSend,
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageHistory } from '@/components/message-history'
import { createBrowserClient } from '@/lib/api'
import type { MessageResponse, ChannelType } from '@sendbandit/api-client'

type Contact = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  whatsappId: string | null
  telegramId: string | null
  facebookId: string | null
  instagramId: string | null
  slackId: string | null
  discordId: string | null
  createdAt: string
}

type ChannelConnection = {
  id: string
  channel: ChannelType
  name: string
  isActive: boolean
}

const channelIcons: Record<ChannelType, React.ElementType> = {
  whatsapp: IconBrandWhatsapp,
  telegram: IconBrandTelegram,
  facebook: IconBrandFacebook,
  instagram: IconBrandInstagram,
  slack: IconBrandSlack,
  discord: IconBrandDiscord,
}

const channelColors: Record<ChannelType, string> = {
  whatsapp: 'bg-green-500',
  telegram: 'bg-blue-500',
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-500',
  slack: 'bg-purple-500',
  discord: 'bg-indigo-500',
}

const channelNames: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  slack: 'Slack',
  discord: 'Discord',
}

const contactChannelFields: Record<ChannelType, keyof Contact> = {
  whatsapp: 'whatsappId',
  telegram: 'telegramId',
  facebook: 'facebookId',
  instagram: 'instagramId',
  slack: 'slackId',
  discord: 'discordId',
}

export default function ContactDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()

  const clientId = params.id as string
  const contactId = params.contactId as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<MessageResponse[]>([])
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | ''>('')
  const [messageText, setMessageText] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const MESSAGES_LIMIT = 50

  // Get available channels for this contact
  const availableChannels = channels.filter((ch) => {
    if (!contact) return false
    const field = contactChannelFields[ch.channel]
    return ch.isActive && contact[field]
  })

  const fetchMessages = useCallback(
    async (loadMore = false) => {
      try {
        setMessagesLoading(true)
        const apiClient = createBrowserClient(getToken)
        const currentOffset = loadMore ? offset : 0
        const res = await apiClient.messages.list(clientId, contactId, {
          limit: MESSAGES_LIMIT,
          offset: currentOffset,
        })

        const newMessages = res.data || []
        if (loadMore) {
          setMessages((prev) => [...newMessages.reverse(), ...prev])
        } else {
          setMessages(newMessages.reverse())
        }

        setHasMore(newMessages.length === MESSAGES_LIMIT)
        setOffset(currentOffset + newMessages.length)
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setMessagesLoading(false)
      }
    },
    [clientId, contactId, getToken, offset]
  )

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchData() {
      try {
        const apiClient = createBrowserClient(getToken)
        const [contactRes, channelsRes, messagesRes] = await Promise.all([
          apiClient.contacts.get(clientId, contactId),
          apiClient.channels.list(),
          apiClient.messages.list(clientId, contactId, { limit: MESSAGES_LIMIT }),
        ])

        if (!contactRes.data) {
          router.push(`/clients/${clientId}`)
          return
        }

        const c = contactRes.data
        setContact({
          id: c.id,
          firstName: c.firstName || null,
          lastName: c.lastName || null,
          email: c.email || null,
          phone: c.phone || null,
          whatsappId: c.whatsappId || null,
          telegramId: c.telegramId || null,
          facebookId: c.facebookId || null,
          instagramId: c.instagramId || null,
          slackId: c.slackId || null,
          discordId: c.discordId || null,
          createdAt: c.createdAt,
        })

        setChannels(channelsRes.data || [])

        const messageData = messagesRes.data || []
        setMessages(messageData.reverse())
        setHasMore(messageData.length === MESSAGES_LIMIT)
        setOffset(messageData.length)
      } catch (error) {
        console.error('Failed to fetch contact:', error)
        router.push(`/clients/${clientId}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoaded, orgId, clientId, contactId, getToken, router])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChannel || !messageText.trim() || !contact) return

    setSending(true)
    try {
      const apiClient = createBrowserClient(getToken)
      const res = await apiClient.messages.send(clientId, contactId, {
        channel: selectedChannel,
        content: {
          type: 'text',
          text: messageText.trim(),
        },
      })

      if (res.data) {
        setMessages((prev) => [...prev, res.data])
        setMessageText('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contact) {
    return null
  }

  const contactName =
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    contact.email ||
    'Unknown'

  // Get channel badges for contact
  const contactChannels = (Object.entries(contactChannelFields) as [ChannelType, keyof Contact][])
    .filter(([, field]) => contact[field])
    .map(([channel]) => channel)

  return (
    <div className="flex h-full flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}`}>
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{contactName}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {contact.email && (
              <span className="flex items-center gap-1">
                <IconMail className="size-3" />
                {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <IconPhone className="size-3" />
                {contact.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {contactChannels.map((channel) => {
            const Icon = channelIcons[channel]
            return (
              <Badge
                key={channel}
                variant="outline"
                className="gap-1"
              >
                <Icon className="size-3" />
                {channelNames[channel]}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Message History */}
        <Card className="flex flex-col">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base">Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="flex-1 overflow-hidden">
              <MessageHistory
                messages={messages}
                loading={messagesLoading}
                hasMore={hasMore}
                onLoadMore={() => fetchMessages(true)}
              />
            </div>

            {/* Quick Reply */}
            {availableChannels.length > 0 && (
              <form
                onSubmit={handleSendMessage}
                className="border-t p-4"
              >
                <div className="flex gap-2">
                  <Select
                    value={selectedChannel}
                    onValueChange={(v) => setSelectedChannel(v as ChannelType)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableChannels.map((ch) => {
                        const Icon = channelIcons[ch.channel]
                        return (
                          <SelectItem key={ch.id} value={ch.channel}>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              {channelNames[ch.channel]}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="min-h-[40px] flex-1 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    disabled={!selectedChannel || !messageText.trim() || sending}
                  >
                    {sending ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <IconSend className="size-4" />
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{contact.email}</p>
                </div>
              )}
              {contact.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{contact.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Added</p>
                <p className="font-medium">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel IDs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(Object.entries(contactChannelFields) as [ChannelType, keyof Contact][]).map(
                ([channel, field]) => {
                  const value = contact[field]
                  if (!value) return null
                  const Icon = channelIcons[channel]
                  return (
                    <div key={channel} className="flex items-start gap-2">
                      <div
                        className={`flex size-6 shrink-0 items-center justify-center rounded ${channelColors[channel]}`}
                      >
                        <Icon className="size-3 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{channelNames[channel]}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {value as string}
                        </p>
                      </div>
                    </div>
                  )
                }
              )}
              {contactChannels.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No channel IDs configured
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
