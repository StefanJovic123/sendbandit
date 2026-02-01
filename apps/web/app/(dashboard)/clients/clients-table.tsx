'use client'

import { DataTable } from '@/components/data-table'
import { columns, type Client } from './columns'

interface ClientsTableProps {
  data: Client[]
}

export function ClientsTable({ data }: ClientsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search clients..."
    />
  )
}
