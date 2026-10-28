'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveOrg } from '@/lib/hooks'

export default function SettingsPage() {
  const router = useRouter()
  const { isLoaded, orgId } = useActiveOrg()

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
    }
  }, [isLoaded, orgId, router])

  if (!orgId) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization settings</p>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b">
        {['General', 'Team', 'Channels', 'Billing', 'API'].map((tab) => (
          <button
            key={tab}
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium hover:border-primary"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* General Settings */}
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Organization Details</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Your organization name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Timezone</label>
              <select className="mt-1 w-full rounded-md border px-3 py-2">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
              </select>
            </div>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Connected Channels</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your messaging channels to start sending messages.
          </p>
          <div className="mt-4 space-y-3">
            {['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'Slack', 'Discord'].map(
              (channel) => (
                <div
                  key={channel}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <span className="font-medium">{channel}</span>
                  <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                    Connect
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
