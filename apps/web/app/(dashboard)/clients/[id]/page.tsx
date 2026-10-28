'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useActiveOrg } from '@/lib/hooks'
import {
  IconArrowLeft,
  IconBuilding,
  IconClock,
  IconFileDescription,
  IconPencil,
  IconPlus,
  IconUpload,
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { ContactsTable } from './contacts-table'
import { SendMessageDialog } from '@/components/send-message-dialog'
import { AddContactDialog } from '@/components/add-contact-dialog'
import { EditContactDialog } from '@/components/edit-contact-dialog'
import { ImportContactsDialog } from '@/components/import-contacts-dialog'
import { createBrowserClient } from '@/lib/api'
import type { Contact } from './contacts-columns'

type Client = {
  id: string
  name: string
  description: string | null
  industry: string | null
  timezone: string
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { getToken } = useAuth()
  const { isLoaded, orgId } = useActiveOrg()
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected contact for actions
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState(false)

  const id = params.id as string

  // Fetch contacts function (reusable for refresh)
  const fetchContacts = useCallback(async () => {
    try {
      const apiClient = createBrowserClient(getToken)
      const contactsRes = await apiClient.contacts.list(id)
      setContacts(
        (contactsRes.data || []).map((c: any) => ({
          id: c.id,
          firstName: c.firstName || null,
          lastName: c.lastName || null,
          email: c.email || null,
          phone: c.phone || null,
          whatsappId: c.whatsappId || null,
          telegramId: c.telegramId || null,
          facebookId: c.facebookId || null,
          instagramId: c.instagramId || null,
          slackId: c.slackId || null,
          discordId: c.discordId || null,
          createdAt: c.createdAt,
        }))
      )
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }, [id, getToken])

  useEffect(() => {
    if (!isLoaded) return
    if (!orgId) {
      router.push('/dashboard')
      return
    }

    async function fetchData() {
      try {
        const apiClient = createBrowserClient(getToken)
        const [clientRes, contactsRes] = await Promise.all([
          apiClient.clients.get(id),
          apiClient.contacts.list(id),
        ])

        if (!clientRes.data) {
          router.push('/clients')
          return
        }

        setClient({
          id: clientRes.data.id,
          name: clientRes.data.name,
          description: clientRes.data.description || null,
          industry: clientRes.data.industry || null,
          timezone: clientRes.data.timezone,
        })

        setContacts(
          (contactsRes.data || []).map((c: any) => ({
            id: c.id,
            firstName: c.firstName || null,
            lastName: c.lastName || null,
            email: c.email || null,
            phone: c.phone || null,
            whatsappId: c.whatsappId || null,
            telegramId: c.telegramId || null,
            facebookId: c.facebookId || null,
            instagramId: c.instagramId || null,
            slackId: c.slackId || null,
            discordId: c.discordId || null,
            createdAt: c.createdAt,
          }))
        )
      } catch (error) {
        console.error('Failed to fetch client:', error)
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoaded, orgId, id, getToken, router])

  // Contact action handlers
  function handleSendMessage(contact: Contact) {
    setSelectedContact(contact)
    setMessageDialogOpen(true)
  }

  function handleEditContact(contact: Contact) {
    setSelectedContact(contact)
    setEditDialogOpen(true)
  }

  function handleDeleteContact(contact: Contact) {
    setSelectedContact(contact)
    setDeleteDialogOpen(true)
  }

  async function confirmDeleteContact() {
    if (!selectedContact) return

    setDeleting(true)
    try {
      const apiClient = createBrowserClient(getToken)
      await apiClient.contacts.delete(id, selectedContact.id)
      setDeleteDialogOpen(false)
      setSelectedContact(null)
      await fetchContacts()
    } catch (error) {
      console.error('Failed to delete contact:', error)
    } finally {
      setDeleting(false)
    }
  }

  const contactTableCallbacks = {
    onSendMessage: handleSendMessage,
    onEdit: handleEditContact,
    onDelete: handleDeleteContact,
  }

  // Get contact name for dialogs
  const selectedContactName = selectedContact
    ? [selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(' ') ||
      selectedContact.email ||
      'this contact'
    : 'this contact'

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading client...</div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <IconArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          {client.industry && (
            <p className="text-muted-foreground">{client.industry}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clients/${id}/edit`}>
            <IconPencil className="mr-2 size-4" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {client.description && (
              <div className="flex items-start gap-3 md:col-span-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IconFileDescription className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{client.description}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <IconBuilding className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-medium">{client.industry || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <IconClock className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{client.timezone}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} for this client
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <IconUpload className="mr-2 size-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <IconPlus className="mr-2 size-4" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">
                No contacts yet. Add your first contact or import from CSV.
              </p>
            </div>
          ) : (
            <ContactsTable data={contacts} clientId={id} callbacks={contactTableCallbacks} />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SendMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        contact={selectedContact}
        clientId={id}
      />

      <AddContactDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clientId={id}
        onSuccess={fetchContacts}
      />

      <EditContactDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        clientId={id}
        contact={selectedContact}
        onSuccess={fetchContacts}
      />

      <ImportContactsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        clientId={id}
        onSuccess={fetchContacts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedContactName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteContact}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
