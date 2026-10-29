'use client'

import Link from 'next/link'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ClientsTable } from './clients-table'
import { useClients } from '@/lib/hooks'

export function ClientsList() {
  // isPending, not isLoading: the query also waits (disabled) until Clerk has loaded
  const { data: clientsData, isPending, error } = useClients()

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-destructive">Failed to load clients</div>
      </div>
    )
  }

  const clients = (clientsData || []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description || null,
    industry: c.industry || null,
    timezone: c.timezone,
    contactsCount: c.contactsCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }))

  if (clients.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No clients yet</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Create your first client to start managing contacts and sending campaigns.
          </p>
          <Button asChild>
            <Link href="/clients/new">
              <IconPlus className="mr-2 size-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return <ClientsTable data={clients} />
}
