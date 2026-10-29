'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from './use-api'
import { useActiveOrg } from './use-active-org'
import type {
  CreateClientRequest,
  UpdateClientRequest,
  CreateContactRequest,
  UpdateContactRequest,
  ImportContactsRequest,
} from '@sendbandit/shared/types'

// Clients
export function useClients(params?: { page?: number; pageSize?: number }) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    // The API answers for the session's active organization, so every key includes it
    queryKey: ['clients', orgId, params],
    queryFn: async () => {
      const response = await api.clients.list(params)
      return response.data
    },
    enabled: isLoaded,
  })
}

export function useClient(id: string) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    queryKey: ['clients', orgId, id],
    queryFn: async () => {
      const response = await api.clients.get(id)
      return response.data
    },
    enabled: isLoaded && !!id,
  })
}

export function useCreateClient() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClientRequest) => {
      const response = await api.clients.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] })
    },
  })
}

export function useUpdateClient() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientRequest }) => {
      const response = await api.clients.update(id, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] })
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, id] })
    },
  })
}

export function useDeleteClient() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.clients.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] })
    },
  })
}

// Contacts
export function useContacts(
  clientId: string,
  params?: { page?: number; pageSize?: number; search?: string }
) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    queryKey: ['clients', orgId, clientId, 'contacts', params],
    queryFn: async () => {
      const response = await api.contacts.list(clientId, params)
      return response.data
    },
    enabled: isLoaded && !!clientId,
  })
}

export function useContact(clientId: string, contactId: string) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    queryKey: ['clients', orgId, clientId, 'contacts', contactId],
    queryFn: async () => {
      const response = await api.contacts.get(clientId, contactId)
      return response.data
    },
    enabled: isLoaded && !!clientId && !!contactId,
  })
}

export function useCreateContact() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string
      data: CreateContactRequest
    }) => {
      const response = await api.contacts.create(clientId, data)
      return response.data
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId, 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId] })
    },
  })
}

export function useUpdateContact() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      contactId,
      data,
    }: {
      clientId: string
      contactId: string
      data: UpdateContactRequest
    }) => {
      const response = await api.contacts.update(clientId, contactId, data)
      return response.data
    },
    onSuccess: (_, { clientId, contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId, 'contacts'] })
      queryClient.invalidateQueries({
        queryKey: ['clients', orgId, clientId, 'contacts', contactId],
      })
    },
  })
}

export function useDeleteContact() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      contactId,
    }: {
      clientId: string
      contactId: string
    }) => {
      await api.contacts.delete(clientId, contactId)
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId, 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId] })
    },
  })
}

export function useImportContacts() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string
      data: ImportContactsRequest
    }) => {
      const response = await api.contacts.import(clientId, data)
      return response.data
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId, 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['clients', orgId, clientId] })
    },
  })
}
