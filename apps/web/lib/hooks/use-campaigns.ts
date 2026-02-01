'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from './use-api'
import type { CreateCampaignRequest, UpdateCampaignRequest } from '@sendbandit/shared/types'

export function useCampaigns(
  clientId: string,
  params?: { page?: number; pageSize?: number; status?: string }
) {
  const api = useApiClient()

  return useQuery({
    queryKey: ['campaigns', clientId, params],
    queryFn: async () => {
      const response = await api.campaigns.list(clientId, params)
      return response.data
    },
    enabled: !!clientId,
  })
}

export function useCampaign(id: string) {
  const api = useApiClient()

  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      const response = await api.campaigns.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clientId,
      data,
    }: {
      clientId: string
      data: CreateCampaignRequest
    }) => {
      const response = await api.campaigns.create(clientId, data)
      return response.data
    },
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', clientId] })
    },
  })
}

export function useUpdateCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampaignRequest }) => {
      const response = await api.campaigns.update(id, data)
      return response.data
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useDeleteCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.campaigns.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useActivateCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.campaigns.activate(id)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function usePauseCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.campaigns.pause(id)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useResumeCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.campaigns.resume(id)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useStopCampaign() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.campaigns.stop(id)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
    },
  })
}

export function useEnrollContacts() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      contactIds,
    }: {
      campaignId: string
      contactIds: string[]
    }) => {
      const response = await api.campaigns.enrollContacts(campaignId, contactIds)
      return response.data
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] })
    },
  })
}
