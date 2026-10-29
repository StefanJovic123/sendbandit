'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient, updateClient } from '@/lib/actions/clients'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  industry: z.string().optional(),
  timezone: z.string().default('UTC'),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  initialData?: ClientFormData & { id: string }
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (China)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia)' },
]

const industries = [
  'Technology',
  'Software',
  'Finance',
  'Healthcare',
  'Retail',
  'E-commerce',
  'Manufacturing',
  'Real Estate',
  'Education',
  'Marketing',
  'Media',
  'Other',
]

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const isEditing = !!initialData

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      industry: formData.get('industry') as string || undefined,
      timezone: formData.get('timezone') as string || 'UTC',
    }

    const result = clientSchema.safeParse(data)

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
        await updateClient(initialData.id, result.data)
      } else {
        await createClient(result.data)
      }

      router.push('/clients')
      router.refresh()
    } catch (error) {
      console.error('Failed to save client:', error)
      setErrors({ form: 'Failed to save client. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Client' : 'Client Information'}</CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update the client details below'
              : 'Enter the details for your new client'}
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
              placeholder="Acme Corporation"
              defaultValue={initialData?.name}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the client..."
              defaultValue={initialData?.description}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              {/* undefined, not '': only then does the hidden form <select> get an empty option. Without it the
                  browser selects the first industry and submits it although none was picked. */}
              <Select name="industry" defaultValue={initialData?.industry || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select name="timezone" defaultValue={initialData?.timezone || 'UTC'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? 'Update Client' : 'Create Client'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
