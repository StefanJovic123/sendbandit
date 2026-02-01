'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from './use-api'
import type { CreateTemplateRequest, UpdateTemplateRequest } from '@sendbandit/shared/types'

export function useTemplates(params?: {
  page?: number
  pageSize?: number
  channel?: string
  status?: string
}) {
  const api = useApiClient()

  return useQuery({
    queryKey: ['templates', params],
    queryFn: async () => {
      const response = await api.templates.list(params)
      return response.data
    },
  })
}

export function useTemplate(id: string) {
  const api = useApiClient()

  return useQuery({
    queryKey: ['templates', id],
    queryFn: async () => {
      const response = await api.templates.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const response = await api.templates.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useUpdateTemplate() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateRequest }) => {
      const response = await api.templates.update(id, data)
      return response.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['templates', id] })
    },
  })
}

export function useDeleteTemplate() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.templates.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
