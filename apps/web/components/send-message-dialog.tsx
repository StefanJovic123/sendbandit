'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconLoader2,
  IconSend,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBrowserClient } from '@/lib/api'

type ChannelType = 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'

type Contact = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  whatsappId: string | null
  telegramId: string | null
  facebookId: string | null
  instagramId: string | null
  slackId: string | null
  discordId: string | null
}

type ChannelConnection = {
  id: string
  channel: ChannelType
  name: string
  isActive: boolean
}

interface SendMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  clientId: string
  onSuccess?: () => void
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

// Map contact fields to channel types
const contactChannelFields: Record<ChannelType, keyof Contact> = {
  whatsapp: 'whatsappId',
  telegram: 'telegramId',
  facebook: 'facebookId',
  instagram: 'instagramId',
  slack: 'slackId',
  discord: 'discordId',
}

export function SendMessageDialog({
  open,
  onOpenChange,
  contact,
  clientId,
  onSuccess,
}: SendMessageDialogProps) {
  const { getToken } = useAuth()
  const [channels, setChannels] = useState<ChannelConnection[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | ''>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available channels for this contact (channels where contact has ID AND org has connection)
  const availableChannels = channels.filter((ch) => {
    if (!contact) return false
    const field = contactChannelFields[ch.channel]
    return ch.isActive && contact[field]
  })

  useEffect(() => {
    if (open) {
      fetchChannels()
      setSelectedChannel('')
      setMessage('')
      setError(null)
    }
  }, [open])

  async function fetchChannels() {
    setLoading(true)
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

  async function handleSend() {
    if (!contact || !selectedChannel || !message.trim()) return

    setError(null)
    setSending(true)

    try {
      const apiClient = createBrowserClient(getToken)
      await apiClient.messages.send(clientId, contact.id, {
        channel: selectedChannel,
        content: {
          type: 'text',
          text: message.trim(),
        },
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      contact.email ||
      'Unknown'
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>
            Send a message to {contactName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : availableChannels.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              No channels available for this contact.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Either the contact doesn't have any channel IDs, or no channels are connected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={selectedChannel}
                onValueChange={(v) => setSelectedChannel(v as ChannelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {availableChannels.map((ch) => {
                    const Icon = channelIcons[ch.channel]
                    return (
                      <SelectItem key={ch.id} value={ch.channel}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex size-6 items-center justify-center rounded ${channelColors[ch.channel]}`}
                          >
                            <Icon className="size-4 text-white" />
                          </div>
                          {channelNames[ch.channel]}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedChannel && contact && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Sending to: </span>
                <span className="font-medium">
                  {contact[contactChannelFields[selectedChannel]] as string}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {message.length} characters
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedChannel || !message.trim() || sending}
          >
            {sending ? (
              <IconLoader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <IconSend className="mr-2 size-4" />
            )}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
