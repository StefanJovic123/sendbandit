'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  IconLoader2,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconVariable,
} from '@tabler/icons-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createTemplate, updateTemplate } from '@/lib/actions/templates'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(['whatsapp', 'telegram', 'facebook', 'instagram', 'slack', 'discord']),
  content: z.string().min(1, 'Content is required').max(4096),
  status: z.enum(['active', 'draft']),
})

type TemplateFormData = z.infer<typeof templateSchema>

const channels = [
  { id: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp },
  { id: 'telegram', label: 'Telegram', icon: IconBrandTelegram },
  { id: 'facebook', label: 'Facebook', icon: IconBrandFacebook },
  { id: 'instagram', label: 'Instagram', icon: IconBrandInstagram },
  { id: 'slack', label: 'Slack', icon: IconBrandSlack },
  { id: 'discord', label: 'Discord', icon: IconBrandDiscord },
]

const commonVariables = [
  { name: 'name', description: 'Contact name' },
  { name: 'email', description: 'Contact email' },
  { name: 'phone', description: 'Contact phone' },
  { name: 'company', description: 'Company name' },
]

interface TemplateFormProps {
  initialData?: TemplateFormData & { id: string }
}

export function TemplateForm({ initialData }: TemplateFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [content, setContent] = React.useState(initialData?.content || '')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const isEditing = !!initialData

  // Extract variables from content
  const variables = content.match(/\{\{(\w+)\}\}/g) || []
  const uniqueVariables = Array.from(new Set(variables.map((v) => v.replace(/[{}]/g, ''))))

  function insertVariable(variable: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = content
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newContent = `${before}{{${variable}}}${after}`

    setContent(newContent)

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPos = start + variable.length + 4
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      channel: formData.get('channel') as TemplateFormData['channel'],
      content: content,
      status: formData.get('status') as 'active' | 'draft',
    }

    const result = templateSchema.safeParse(data)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      setIsLoading(false)
      return
    }

    try {
      if (isEditing && initialData) {
        await updateTemplate(initialData.id, {
          name: result.data.name,
          description: result.data.description,
          channel: result.data.channel,
          content: result.data.content,
          status: result.data.status === 'active' ? 'approved' : 'draft',
        })
      } else {
        await createTemplate({
          name: result.data.name,
          description: result.data.description,
          channel: result.data.channel,
          content: result.data.content,
          status: result.data.status === 'active' ? 'approved' : 'draft',
        })
      }

      router.push('/templates')
      router.refresh()
    } catch (error) {
      console.error('Failed to save template:', error)
      setErrors({ form: 'Failed to save template. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Basic information about your template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.form && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.form}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Welcome Message"
                  defaultValue={initialData?.name}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Sent to new subscribers when they join"
                  defaultValue={initialData?.description}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel *</Label>
                  <Select name="channel" defaultValue={initialData?.channel || 'whatsapp'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => {
                        const Icon = channel.icon
                        return (
                          <SelectItem key={channel.id} value={channel.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              {channel.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={initialData?.status || 'draft'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Content</CardTitle>
              <CardDescription>
                Write your message template. Use {'{{variable}}'} for dynamic content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content *</Label>
                  <span className="text-xs text-muted-foreground">
                    {content.length} / 4096 characters
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  id="content"
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hi {{name}}! Welcome to {{company}}..."
                  className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-invalid={!!errors.content}
                />
                {errors.content && (
                  <p className="text-sm text-destructive">{errors.content}</p>
                )}
              </div>

              {uniqueVariables.length > 0 && (
                <div className="space-y-2">
                  <Label>Variables used</Label>
                  <div className="flex flex-wrap gap-1">
                    {uniqueVariables.map((variable) => (
                      <Badge key={variable} variant="outline">
                        <IconVariable className="mr-1 size-3" />
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Insert</CardTitle>
              <CardDescription>
                Click to insert common variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {commonVariables.map((variable) => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => insertVariable(variable.name)}
                  >
                    <IconVariable className="mr-2 size-4" />
                    {`{{${variable.name}}}`}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {variable.description}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                How your message will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 text-sm">
                {content || (
                  <span className="text-muted-foreground">
                    Your message preview will appear here...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button type="submit" name="status" value="draft" variant="outline" disabled={isLoading}>
            Save as Draft
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </div>
    </form>
  )
}
