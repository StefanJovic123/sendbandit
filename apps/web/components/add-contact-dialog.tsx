'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconLoader2,
  IconUserPlus,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/api'

interface AddContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSuccess?: () => void
}

const channelFields = [
  { key: 'whatsappId', label: 'WhatsApp ID', icon: IconBrandWhatsapp, color: 'text-green-500', placeholder: '+1234567890' },
  { key: 'telegramId', label: 'Telegram ID', icon: IconBrandTelegram, color: 'text-blue-500', placeholder: '@username or 123456789' },
  { key: 'facebookId', label: 'Facebook ID', icon: IconBrandFacebook, color: 'text-blue-600', placeholder: 'Page-scoped ID' },
  { key: 'instagramId', label: 'Instagram ID', icon: IconBrandInstagram, color: 'text-pink-500', placeholder: 'IG-scoped ID' },
  { key: 'slackId', label: 'Slack ID', icon: IconBrandSlack, color: 'text-purple-500', placeholder: 'U0123456789' },
  { key: 'discordId', label: 'Discord ID', icon: IconBrandDiscord, color: 'text-indigo-500', placeholder: '123456789012345678' },
] as const

type FormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsappId: string
  telegramId: string
  facebookId: string
  instagramId: string
  slackId: string
  discordId: string
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsappId: '',
  telegramId: '',
  facebookId: '',
  instagramId: '',
  slackId: '',
  discordId: '',
}

export function AddContactDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: AddContactDialogProps) {
  const { getToken } = useAuth()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setFormData(initialFormData)
    setError(null)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!formData.firstName.trim() && !formData.lastName.trim() && !formData.email.trim()) {
      setError('Please provide at least a name or email')
      return
    }

    setError(null)
    setSaving(true)

    try {
      const apiClient = createBrowserClient(getToken)

      // Build the request data, only including non-empty fields
      const data: Record<string, string> = {}
      if (formData.firstName.trim()) data.firstName = formData.firstName.trim()
      if (formData.lastName.trim()) data.lastName = formData.lastName.trim()
      if (formData.email.trim()) data.email = formData.email.trim()
      if (formData.phone.trim()) data.phone = formData.phone.trim()
      if (formData.whatsappId.trim()) data.whatsappId = formData.whatsappId.trim()
      if (formData.telegramId.trim()) data.telegramId = formData.telegramId.trim()
      if (formData.facebookId.trim()) data.facebookId = formData.facebookId.trim()
      if (formData.instagramId.trim()) data.instagramId = formData.instagramId.trim()
      if (formData.slackId.trim()) data.slackId = formData.slackId.trim()
      if (formData.discordId.trim()) data.discordId = formData.discordId.trim()

      await apiClient.contacts.create(clientId, data)
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to create contact:', err)
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to this client. Fill in their details and channel IDs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          {/* Channel IDs */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Channel IDs</h4>
            <p className="text-xs text-muted-foreground">
              Add channel-specific IDs to enable messaging on each platform.
            </p>
            <div className="space-y-3">
              {channelFields.map((channel) => {
                const Icon = channel.icon
                return (
                  <div key={channel.key} className="flex items-center gap-3">
                    <Icon className={`size-5 ${channel.color} shrink-0`} />
                    <div className="flex-1">
                      <Input
                        id={channel.key}
                        value={formData[channel.key]}
                        onChange={(e) => handleChange(channel.key, e.target.value)}
                        placeholder={channel.placeholder}
                        className="h-9"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <IconUserPlus className="mr-2 size-4" />
              )}
              Add Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
