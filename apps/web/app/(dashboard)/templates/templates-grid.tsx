'use client'

import * as React from 'react'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
} from '@tabler/icons-react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateCard, type Template } from './template-card'

const channels = [
  { id: 'all', label: 'All', icon: null },
  { id: 'whatsapp', label: 'WhatsApp', icon: IconBrandWhatsapp },
  { id: 'telegram', label: 'Telegram', icon: IconBrandTelegram },
  { id: 'facebook', label: 'Facebook', icon: IconBrandFacebook },
  { id: 'instagram', label: 'Instagram', icon: IconBrandInstagram },
  { id: 'slack', label: 'Slack', icon: IconBrandSlack },
  { id: 'discord', label: 'Discord', icon: IconBrandDiscord },
]

interface TemplatesGridProps {
  templates: Template[]
}

export function TemplatesGrid({ templates }: TemplatesGridProps) {
  const [selectedChannel, setSelectedChannel] = React.useState('all')

  const filteredTemplates =
    selectedChannel === 'all'
      ? templates
      : templates.filter((t) => t.channel === selectedChannel)

  return (
    <div className="space-y-4">
      <Tabs value={selectedChannel} onValueChange={setSelectedChannel}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          {channels.map((channel) => {
            const Icon = channel.icon
            const count =
              channel.id === 'all'
                ? templates.length
                : templates.filter((t) => t.channel === channel.id).length

            return (
              <TabsTrigger
                key={channel.id}
                value={channel.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 rounded-full border px-3 py-1.5"
              >
                {Icon && <Icon className="size-4" />}
                {channel.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {count}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No templates found for this channel.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}
