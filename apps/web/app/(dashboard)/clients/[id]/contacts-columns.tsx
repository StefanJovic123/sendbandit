'use client'

import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconSend,
  IconMessageCircle,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type Contact = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  whatsappId: string | null
  telegramId: string | null
  facebookId: string | null
  instagramId: string | null
  slackId: string | null
  discordId: string | null
  createdAt: string
}

function getContactName(contact: Contact): string {
  if (contact.firstName || contact.lastName) {
    return [contact.firstName, contact.lastName].filter(Boolean).join(' ')
  }
  return contact.email || contact.phone || 'Unknown'
}

function getChannels(contact: Contact): Array<{ id: string; icon: typeof IconBrandWhatsapp; color: string }> {
  const channels: Array<{ id: string; icon: typeof IconBrandWhatsapp; color: string }> = []

  if (contact.whatsappId) channels.push({ id: 'whatsapp', icon: IconBrandWhatsapp, color: 'text-green-500' })
  if (contact.telegramId) channels.push({ id: 'telegram', icon: IconBrandTelegram, color: 'text-blue-500' })
  if (contact.facebookId) channels.push({ id: 'facebook', icon: IconBrandFacebook, color: 'text-blue-600' })
  if (contact.instagramId) channels.push({ id: 'instagram', icon: IconBrandInstagram, color: 'text-pink-500' })
  if (contact.slackId) channels.push({ id: 'slack', icon: IconBrandSlack, color: 'text-purple-500' })
  if (contact.discordId) channels.push({ id: 'discord', icon: IconBrandDiscord, color: 'text-indigo-500' })

  return channels
}

export interface ContactTableCallbacks {
  onSendMessage?: (contact: Contact) => void
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
}

export function createContactColumns(
  clientId: string,
  callbacks: ContactTableCallbacks = {}
): ColumnDef<Contact>[] {
  return [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const contact = row.original
      return (
        <Link
          href={`/clients/${clientId}/contacts/${contact.id}`}
          className="block hover:underline"
        >
          <p className="font-medium">{getContactName(contact)}</p>
          {contact.email && (
            <p className="text-sm text-muted-foreground">{contact.email}</p>
          )}
        </Link>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue('phone') || '-'}
      </span>
    ),
  },
  {
    id: 'channels',
    header: 'Channels',
    cell: ({ row }) => {
      const channels = getChannels(row.original)
      if (channels.length === 0) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex items-center gap-1.5">
          {channels.map((channel) => {
            const Icon = channel.icon
            return (
              <Icon
                key={channel.id}
                className={`size-4 ${channel.color}`}
                title={channel.id}
              />
            )
          })}
        </div>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Added',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return <span className="text-muted-foreground">{date.toLocaleDateString()}</span>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const contact = row.original
      const hasChannels =
        contact.whatsappId ||
        contact.telegramId ||
        contact.facebookId ||
        contact.instagramId ||
        contact.slackId ||
        contact.discordId

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/clients/${clientId}/contacts/${contact.id}`}>
                <IconMessageCircle className="mr-2 size-4" />
                View Messages
              </Link>
            </DropdownMenuItem>
            {hasChannels && callbacks.onSendMessage && (
              <DropdownMenuItem onClick={() => callbacks.onSendMessage?.(contact)}>
                <IconSend className="mr-2 size-4" />
                Send Message
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => callbacks.onEdit?.(contact)}>
              <IconPencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => callbacks.onDelete?.(contact)}
            >
              <IconTrash className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
  ]
}
