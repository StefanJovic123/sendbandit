'use server'

import { getApiClient } from '@/lib/api.server'
import { getClients } from './clients'

export type CampaignWithStats = {
  id: string
  name: string
  description: string | null
  type: 'one_time' | 'recurring' | 'triggered'
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  triggerType: 'manual' | 'schedule' | 'event' | 'segment_entry' | 'segment_exit'
  clientId: string
  clientName: string
  scheduledAt: string | null
  enrolledCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Get all campaigns for the current organization
 */
export async function getCampaigns(): Promise<CampaignWithStats[]> {
  try {
    const clients = await getClients()
    if (clients.length === 0) return []

    const apiClient = await getApiClient()
    const allCampaigns: CampaignWithStats[] = []

    // Fetch campaigns for each client
    for (const client of clients) {
      try {
        const response = await apiClient.campaigns.list(client.id)

        const campaignsWithStats = response.data.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || null,
          type: c.type as CampaignWithStats['type'],
          status: c.status as CampaignWithStats['status'],
          triggerType: c.triggerType as CampaignWithStats['triggerType'],
          clientId: c.clientId,
          clientName: client.name,
          scheduledAt: c.scheduledAt || null,
          enrolledCount: c.enrolledCount || 0,
          completedCount: c.completedCount || 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }))

        allCampaigns.push(...campaignsWithStats)
      } catch (error) {
        console.error(`Failed to fetch campaigns for client ${client.id}:`, error)
      }
    }

    // Sort by updatedAt descending
    return allCampaigns.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return []
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(id: string) {
  try {
    const client = await getApiClient()
    const response = await client.campaigns.get(id)
    return response.data
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    return null
  }
}

type FlowNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

type FlowEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

type FlowData = {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: {
  clientId: string
  name: string
  description?: string
  type: 'one_time' | 'recurring' | 'triggered'
  triggerType: 'manual' | 'schedule' | 'event' | 'segment_entry' | 'segment_exit'
  triggerConfig?: Record<string, unknown>
  flowData?: FlowData
  scheduledAt?: Date
}) {
  const client = await getApiClient()
  const response = await client.campaigns.create(data.clientId, {
    name: data.name,
    description: data.description,
    type: data.type,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    flowData: data.flowData,
    scheduledAt: data.scheduledAt?.toISOString(),
  })
  return response.data
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string,
  data: {
    name?: string
    description?: string
    flowData?: FlowData
    scheduledAt?: Date | null
  }
) {
  const client = await getApiClient()
  const response = await client.campaigns.update(id, {
    name: data.name,
    description: data.description,
    flowData: data.flowData,
    scheduledAt: data.scheduledAt?.toISOString(),
  })
  return response.data
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string) {
  const client = await getApiClient()
  await client.campaigns.delete(id)
}

/**
 * Activate a campaign
 */
export async function activateCampaign(id: string) {
  const client = await getApiClient()
  const response = await client.campaigns.activate(id)
  return response.data
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string) {
  const client = await getApiClient()
  const response = await client.campaigns.pause(id)
  return response.data
}

/**
 * Resume a campaign
 */
export async function resumeCampaign(id: string) {
  const client = await getApiClient()
  const response = await client.campaigns.resume(id)
  return response.data
}

/**
 * Stop a campaign
 */
export async function stopCampaign(id: string) {
  const client = await getApiClient()
  const response = await client.campaigns.stop(id)
  return response.data
}
