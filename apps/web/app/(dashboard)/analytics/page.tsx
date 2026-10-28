'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveOrg } from '@/lib/hooks'

export default function AnalyticsPage() {
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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your marketing performance</p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4">
        <select className="rounded-md border px-3 py-2 text-sm">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Total Sent</div>
          <div className="mt-2 text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Delivered</div>
          <div className="mt-2 text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Read</div>
          <div className="mt-2 text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm font-medium text-muted-foreground">Failed</div>
          <div className="mt-2 text-3xl font-bold">0</div>
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Messages Over Time</h3>
          <div className="mt-4 h-64 flex items-center justify-center text-muted-foreground">
            Chart will be rendered here
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Messages by Channel</h3>
          <div className="mt-4 h-64 flex items-center justify-center text-muted-foreground">
            Chart will be rendered here
          </div>
        </div>
      </div>
    </div>
  )
}
