'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  IconArrowLeft,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconLoader2,
  IconCheck,
  IconCopy,
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/api'

type ChannelType = 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'

type ChannelConnection = {
  id: string
  channel: ChannelType
  name: string
  credentials: Record<string, string>
  isActive: boolean
  webhookUrl: string | null
  webhookSecret: string | null
  lastVerifiedAt: string | null
  createdAt: string
}

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

export default function EditChannelPage() {
  const router = useRouter()
  const params = useParams()
  const { orgId, getToken } = useAuth()
  const [channel, setChannel] = useState<ChannelConnection | null>(null)
  const [name, setName] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const id = params.id as string

  useEffect(() => {
    if (orgId === null) {
      router.push('/dashboard')
      return
    }

    fetchChannel()
  }, [orgId, id])

  async function fetchChannel() {
    try {
      const apiClient = createBrowserClient(getToken)
      const res = await apiClient.channels.get(id)
      const data = res.data
      setChannel(data)
      setName(data.name)
      setIsActive(data.isActive)
      // Note: credentials are masked, so we start with empty object
      // User will need to re-enter if they want to update
    } catch (error) {
      console.error('Failed to fetch channel:', error)
      router.push('/settings/channels')
    } finally {
      setLoading(false)
    }
  }

  function handleCredentialChange(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!channel) return

    setError(null)
    setSaving(true)

    try {
      const apiClient = createBrowserClient(getToken)
      const updateData: { name?: string; credentials?: Record<string, string>; isActive?: boolean } = {
        name,
        isActive,
      }

      // Only include credentials if user entered new ones
      const hasNewCredentials = Object.values(credentials).some((v) => v.trim() !== '')
      if (hasNewCredentials) {
        updateData.credentials = credentials
      }

      await apiClient.channels.update(id, updateData)
      router.push('/settings/channels')
    } catch (err) {
      console.error('Failed to update channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to update channel')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    try {
      const apiClient = createBrowserClient(getToken)
      const res = await apiClient.channels.verify(id)
      if (res.data.valid) {
        await fetchChannel()
        alert('Connection verified successfully!')
      } else {
        alert(`Verification failed: ${res.data.error}`)
      }
    } catch (error) {
      console.error('Verification failed:', error)
      alert('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  function copyWebhookUrl() {
    if (channel?.webhookUrl) {
      navigator.clipboard.writeText(channel.webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading channel...</div>
      </div>
    )
  }

  if (!channel) {
    return null
  }

  const config = channelConfig[channel.channel]
  const Icon = config.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/channels">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-lg ${config.color}`}>
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            <p className="text-muted-foreground">{config.name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Update your channel connection settings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this channel connection
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Update Credentials</h3>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing credentials
                  </p>
                </div>
                {config.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="text-muted-foreground"> (required if updating)</span>}
                    </Label>
                    <Input
                      id={field.key}
                      type="password"
                      value={credentials[field.key] || ''}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      placeholder={`Current: ${channel.credentials[field.key] || 'Not set'}`}
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
                  Save Changes
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/settings/channels">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={channel.isActive ? 'default' : 'secondary'}>
                  {channel.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Verified</span>
                <span className="text-sm">
                  {channel.lastVerifiedAt
                    ? new Date(channel.lastVerifiedAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(channel.createdAt).toLocaleString()}
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? (
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <IconCheck className="mr-2 size-4" />
                )}
                Verify Connection
              </Button>
            </CardContent>
          </Card>

          {channel.webhookUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure this URL in your {config.name} developer portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
                      {channel.webhookUrl}
                    </code>
                    <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                      {copied ? (
                        <IconCheck className="size-4 text-green-500" />
                      ) : (
                        <IconCopy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {channel.channel === 'whatsapp' && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p className="font-medium">WhatsApp Setup:</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
                      <li>Go to Meta Developer Portal</li>
                      <li>Select your app and WhatsApp product</li>
                      <li>Add the webhook URL above</li>
                      <li>Enter verify token: <code>sendbandit_verify_token</code></li>
                      <li>Subscribe to messages and message_status events</li>
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
