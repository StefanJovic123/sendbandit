'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from './use-api'
import { useActiveOrg } from './use-active-org'
import type { CreateTemplateRequest, UpdateTemplateRequest } from '@sendbandit/shared/types'

export function useTemplates(params?: {
  page?: number
  pageSize?: number
  channel?: string
  status?: string
}) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    // The API answers for the session's active organization, so every key includes it
    queryKey: ['templates', orgId, params],
    queryFn: async () => {
      const response = await api.templates.list(params)
      return response.data
    },
    enabled: isLoaded,
  })
}

export function useTemplate(id: string) {
  const api = useApiClient()
  const { isLoaded, orgId } = useActiveOrg()

  return useQuery({
    queryKey: ['templates', orgId, id],
    queryFn: async () => {
      const response = await api.templates.get(id)
      return response.data
    },
    enabled: isLoaded && !!id,
  })
}

export function useCreateTemplate() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const response = await api.templates.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] })
    },
  })
}

export function useUpdateTemplate() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateRequest }) => {
      const response = await api.templates.update(id, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] })
      queryClient.invalidateQueries({ queryKey: ['templates', orgId, id] })
    },
  })
}

export function useDeleteTemplate() {
  const api = useApiClient()
  const { orgId } = useActiveOrg()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.templates.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] })
    },
  })
}
