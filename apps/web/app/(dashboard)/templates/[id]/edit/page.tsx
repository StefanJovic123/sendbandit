'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { TemplateForm } from '../../template-form'
import { createBrowserClient } from '@/lib/api'

type Template = {
  id: string
  name: string
  description?: string
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  status: 'active' | 'draft'
  content: string
}

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const { orgId, getToken } = useAuth()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    if (orgId === null) {
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
          description: res.data.description || undefined,
          channel: res.data.channel as Template['channel'],
          status: res.data.status as Template['status'],
          content: typeof res.data.content === 'string' ? res.data.content : (res.data.content?.text || ''),
        })
      } catch (error) {
        console.error('Failed to fetch template:', error)
        router.push('/templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [orgId, id, getToken, router])

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

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Template</h1>
        <p className="text-muted-foreground">Update your message template</p>
      </div>

      <TemplateForm initialData={template} />
    </div>
  )
}
