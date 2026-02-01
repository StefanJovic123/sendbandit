'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import {
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
  IconUsers,
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

export type Client = {
  id: string
  name: string
  description: string | null
  industry: string | null
  contactsCount: number
  createdAt: string
}

export const columns: ColumnDef<Client>[] = [
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
      const client = row.original
      return (
        <div>
          <Link
            href={`/clients/${client.id}`}
            className="font-medium hover:underline"
          >
            {client.name}
          </Link>
          {client.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">{client.description}</p>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'industry',
    header: 'Industry',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('industry') || '-'}</span>
    ),
  },
  {
    accessorKey: 'contactsCount',
    header: 'Contacts',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <IconUsers className="size-4 text-muted-foreground" />
        <span>{row.getValue('contactsCount')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return <span className="text-muted-foreground">{date.toLocaleDateString()}</span>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const client = row.original
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
              <Link href={`/clients/${client.id}`}>
                <IconEye className="mr-2 size-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/clients/${client.id}/edit`}>
                <IconPencil className="mr-2 size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <IconTrash className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
