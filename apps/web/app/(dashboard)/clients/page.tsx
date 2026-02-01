'use client'

import Link from 'next/link'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { ClientsList } from './clients-list'

export default function ClientsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your clients and their contacts
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <IconPlus className="mr-2 size-4" />
            Add Client
          </Link>
        </Button>
      </div>

      <ClientsList />
    </div>
  )
}
