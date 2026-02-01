'use server'

import { getApiClient } from '@/lib/api.server'

export type ClientWithCount = {
  id: string
  name: string
  description: string | null
  industry: string | null
  contactsCount: number
  createdAt: string
}

/**
 * Get all clients for the current organization
 */
export async function getClients(): Promise<ClientWithCount[]> {
  try {
    const client = await getApiClient()
    const response = await client.clients.list()

    return response.data.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || null,
      industry: c.industry || null,
      contactsCount: c.contactsCount || 0,
      createdAt: c.createdAt,
    }))
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return []
  }
}

/**
 * Get a single client by ID
 */
export async function getClient(id: string) {
  try {
    const client = await getApiClient()
    const response = await client.clients.get(id)
    return response.data
  } catch (error) {
    console.error('Failed to fetch client:', error)
    return null
  }
}

/**
 * Create a new client
 */
export async function createClient(data: {
  name: string
  description?: string
  industry?: string
  timezone?: string
}) {
  const client = await getApiClient()
  const response = await client.clients.create(data)
  return response.data
}

/**
 * Update a client
 */
export async function updateClient(
  id: string,
  data: {
    name?: string
    description?: string
    industry?: string
    timezone?: string
  }
) {
  const client = await getApiClient()
  const response = await client.clients.update(id, data)
  return response.data
}

/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  const client = await getApiClient()
  await client.clients.delete(id)
}

/**
 * Get contacts for a client
 */
export async function getClientContacts(clientId: string) {
  try {
    const client = await getApiClient()
    const response = await client.contacts.list(clientId)

    return response.data.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName || null,
      lastName: contact.lastName || null,
      email: contact.email || null,
      phone: contact.phone || null,
      whatsappId: contact.whatsappId || null,
      telegramId: contact.telegramId || null,
      facebookId: contact.facebookId || null,
      instagramId: contact.instagramId || null,
      slackId: contact.slackId || null,
      discordId: contact.discordId || null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }))
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return []
  }
}

/**
 * Create a contact for a client
 */
export async function createContact(
  clientId: string,
  data: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    whatsappId?: string
    telegramId?: string
    facebookId?: string
    instagramId?: string
    slackId?: string
    discordId?: string
    externalId?: string
    metadata?: Record<string, unknown>
  }
) {
  const client = await getApiClient()
  const response = await client.contacts.create(clientId, data)
  return response.data
}
