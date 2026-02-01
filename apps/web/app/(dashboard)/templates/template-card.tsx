'use client'

import Link from 'next/link'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconDotsVertical,
  IconPencil,
  IconCopy,
  IconTrash,
} from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type Template = {
  id: string
  name: string
  description: string | null
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'
  content: string
  status: 'active' | 'draft' | 'archived'
  createdAt: string
  updatedAt: string
}

const channelConfig = {
  whatsapp: {
    icon: IconBrandWhatsapp,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  telegram: {
    icon: IconBrandTelegram,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  facebook: {
    icon: IconBrandFacebook,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
  },
  instagram: {
    icon: IconBrandInstagram,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  slack: {
    icon: IconBrandSlack,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  discord: {
    icon: IconBrandDiscord,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
}

interface TemplateCardProps {
  template: Template
}

export function TemplateCard({ template }: TemplateCardProps) {
  const config = channelConfig[template.channel]
  const Icon = config.icon

  // Extract variables from content
  const variables = template.content.match(/\{\{(\w+)\}\}/g) || []
  const uniqueVariables = Array.from(new Set(variables.map((v) => v.replace(/[{}]/g, ''))))

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`flex size-10 items-center justify-center rounded-lg ${config.bg}`}>
            <Icon className={`size-5 ${config.color}`} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/templates/${template.id}/edit`}>
                  <IconPencil className="mr-2 size-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCopy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <IconTrash className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-1 pt-2">
          <CardTitle className="line-clamp-1">
            <Link href={`/templates/${template.id}`} className="hover:underline">
              {template.name}
            </Link>
          </CardTitle>
          {template.description && (
            <CardDescription className="line-clamp-2">
              {template.description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="line-clamp-3 text-muted-foreground">{template.content}</p>
        </div>
        {uniqueVariables.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {uniqueVariables.slice(0, 3).map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {`{{${variable}}}`}
              </Badge>
            ))}
            {uniqueVariables.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{uniqueVariables.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <div className="flex w-full items-center justify-between">
          <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
            {template.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
