'use client'

import Link from 'next/link'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { TemplatesList } from './templates-list'

export default function TemplatesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Create and manage message templates for your campaigns
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <IconPlus className="mr-2 size-4" />
            Create Template
          </Link>
        </Button>
      </div>

      <TemplatesList />
    </div>
  )
}
