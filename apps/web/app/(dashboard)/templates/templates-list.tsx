'use client'

import Link from 'next/link'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { TemplatesGrid } from './templates-grid'
import { useTemplates } from '@/lib/hooks'

export function TemplatesList() {
  const { data: templatesData, isLoading, error } = useTemplates()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-destructive">Failed to load templates</div>
      </div>
    )
  }

  const templates = (templatesData || []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || null,
    channel: t.channel as 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord',
    status: t.status === 'approved' ? 'active' as const : t.status === 'draft' ? 'draft' as const : 'archived' as const,
    content: t.content?.text || '',
    variables: t.variables || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  if (templates.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">No templates yet</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Create your first template to use in campaigns.
          </p>
          <Button asChild>
            <Link href="/templates/new">
              <IconPlus className="mr-2 size-4" />
              Create Template
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return <TemplatesGrid templates={templates} />
}
