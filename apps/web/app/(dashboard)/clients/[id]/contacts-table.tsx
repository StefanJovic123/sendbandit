'use client'

import { useMemo } from 'react'
import { DataTable } from '@/components/data-table'
import { createContactColumns, type Contact, type ContactTableCallbacks } from './contacts-columns'

interface ContactsTableProps {
  data: Contact[]
  clientId: string
  callbacks?: ContactTableCallbacks
}

export function ContactsTable({ data, clientId, callbacks = {} }: ContactsTableProps) {
  const columns = useMemo(
    () => createContactColumns(clientId, callbacks),
    [clientId, callbacks]
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search contacts..."
    />
  )
}
