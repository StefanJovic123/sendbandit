'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import {
  IconArrowLeft,
  IconPencil,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
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
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/api'

type Template = {
  id: string
  name: string
  description: string | null
  channel: string
  status: 'active' | 'draft'
  content: string
  variables: string[]
  createdAt: string
  updatedAt: string
}

const channelIcons: Record<string, any> = {
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

export default function TemplateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchTemplate() {
      try {
        const apiClient = createBrowserClient(getToken)
        const res = await apiClient.templates.get(id)

        if (!res.data) {
          router.push('/templates')
          return
        }

        setTemplate({
          id: res.data.id,
          name: res.data.name,
          description: res.data.description || null,
          channel: res.data.channel,
          status: res.data.status as Template['status'],
          content: typeof res.data.content === 'string' ? res.data.content : (res.data.content?.text || ''),
          variables: res.data.variables || [],
          createdAt: res.data.createdAt,
          updatedAt: res.data.updatedAt,
        })
      } catch (error) {
        console.error('Failed to fetch template:', error)
        router.push('/templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [isLoaded, orgId, id, getToken, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  const ChannelIcon = channelIcons[template.channel] || IconBrandWhatsapp

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/templates">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
            <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
              {template.status}
            </Badge>
          </div>
          {template.description && (
            <p className="text-muted-foreground">{template.description}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/templates/${id}/edit`}>
            <IconPencil className="mr-2 size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-lg ${channelColors[template.channel]}`}>
                <ChannelIcon className="size-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Channel</p>
                <p className="font-medium capitalize">{template.channel}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(template.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(template.updatedAt).toLocaleDateString()}</p>
            </div>
            {template.variables.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Variables</p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
            <CardDescription>How your message will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4">
              <pre className="whitespace-pre-wrap text-sm">{template.content}</pre>
            </div>
            <Button variant="outline" size="sm" className="mt-4">
              <IconCopy className="mr-2 size-4" />
              Copy Content
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
