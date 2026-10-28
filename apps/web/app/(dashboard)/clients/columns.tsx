'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { ApiError } from '@sendbandit/api-client'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteClient } from '@/lib/hooks'

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
    cell: ({ row }) => <ClientActions client={row.original} />,
  },
]

function ClientActions({ client }: { client: Client }) {
  const deleteClient = useDeleteClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    try {
      // The clients query is invalidated on success, so the row disappears from the table
      await deleteClient.mutateAsync(client.id)
    } catch (error) {
      console.error('Delete failed:', error)
      alert(error instanceof ApiError ? error.message : 'Failed to delete client')
    }
  }

  return (
    <>
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
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <IconTrash className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{client.name}&quot; will be deleted permanently, together with its {client.contactsCount}{' '}
              contacts, their messages and the client&apos;s campaigns. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
