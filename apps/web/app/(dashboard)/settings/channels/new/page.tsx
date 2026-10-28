'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBrowserClient } from '@/lib/api'

type ChannelType = 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'

const channelConfig: Record<
  ChannelType,
  {
    name: string
    icon: React.ElementType
    color: string
    fields: Array<{ key: string; label: string; placeholder: string; required?: boolean }>
  }
> = {
  whatsapp: {
    name: 'WhatsApp',
    icon: IconBrandWhatsapp,
    color: 'bg-green-500',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAL...', required: true },
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '1234567890', required: true },
      { key: 'waba_id', label: 'Business Account ID', placeholder: '1234567890', required: true },
      { key: 'verify_token', label: 'Webhook Verify Token', placeholder: 'your_verify_token' },
    ],
  },
  telegram: {
    name: 'Telegram',
    icon: IconBrandTelegram,
    color: 'bg-blue-500',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: '123456:ABC-DEF...', required: true },
      { key: 'bot_username', label: 'Bot Username', placeholder: '@your_bot' },
    ],
  },
  facebook: {
    name: 'Facebook Messenger',
    icon: IconBrandFacebook,
    color: 'bg-blue-600',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', placeholder: 'EAAL...', required: true },
      { key: 'page_id', label: 'Page ID', placeholder: '1234567890', required: true },
      { key: 'app_id', label: 'App ID', placeholder: '1234567890' },
      { key: 'app_secret', label: 'App Secret', placeholder: 'abc123...' },
      { key: 'verify_token', label: 'Webhook Verify Token', placeholder: 'your_verify_token' },
    ],
  },
  instagram: {
    name: 'Instagram',
    icon: IconBrandInstagram,
    color: 'bg-pink-500',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAL...', required: true },
      { key: 'ig_user_id', label: 'Instagram User ID', placeholder: '1234567890', required: true },
      { key: 'verify_token', label: 'Webhook Verify Token', placeholder: 'your_verify_token' },
    ],
  },
  slack: {
    name: 'Slack',
    icon: IconBrandSlack,
    color: 'bg-purple-500',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'xoxb-...', required: true },
      { key: 'signing_secret', label: 'Signing Secret', placeholder: 'abc123...', required: true },
      { key: 'app_id', label: 'App ID', placeholder: 'A1234567' },
      { key: 'team_id', label: 'Team ID', placeholder: 'T1234567' },
    ],
  },
  discord: {
    name: 'Discord',
    icon: IconBrandDiscord,
    color: 'bg-indigo-500',
    fields: [
      { key: 'bot_token', label: 'Bot Token', placeholder: 'MTQ...', required: true },
      { key: 'application_id', label: 'Application ID', placeholder: '1234567890' },
      { key: 'public_key', label: 'Public Key', placeholder: 'abc123...' },
    ],
  },
}

export default function NewChannelPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | ''>('')
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
    }
  }, [isLoaded, orgId, router])

  function handleChannelChange(channel: ChannelType) {
    setSelectedChannel(channel)
    setName(channelConfig[channel].name)
    setCredentials({})
  }

  function handleCredentialChange(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChannel) return

    setError(null)
    setSaving(true)

    try {
      const apiClient = createBrowserClient(getToken)
      await apiClient.channels.create({
        channel: selectedChannel,
        name,
        credentials,
      })
      router.push('/settings/channels')
    } catch (err) {
      console.error('Failed to create channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setSaving(false)
    }
  }

  const config = selectedChannel ? channelConfig[selectedChannel] : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/channels">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Channel Connection</h1>
          <p className="text-muted-foreground">Connect a new messaging channel</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Channel Configuration</CardTitle>
          <CardDescription>
            Enter your channel credentials to connect. You can find these in your provider's
            developer portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select
                value={selectedChannel}
                onValueChange={(v) => handleChannelChange(v as ChannelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(channelConfig) as [ChannelType, typeof channelConfig.whatsapp][]).map(
                    ([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex size-6 items-center justify-center rounded ${config.color}`}
                            >
                              <Icon className="size-4 text-white" />
                            </div>
                            {config.name}
                          </div>
                        </SelectItem>
                      )
                    }
                  )}
                </SelectContent>
              </Select>
            </div>

            {config && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Connection Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My WhatsApp Business"
                    required
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium">Credentials</h3>
                  {config.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-destructive"> *</span>}
                      </Label>
                      <Input
                        id={field.key}
                        type="password"
                        value={credentials[field.key] || ''}
                        onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
                    Create Connection
                  </Button>
                  <Button variant="outline" type="button" asChild>
                    <Link href="/settings/channels">Cancel</Link>
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
