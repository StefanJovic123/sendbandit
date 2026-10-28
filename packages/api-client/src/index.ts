import { hc } from 'hono/client'
import type {
  ApiResponse,
  CreateClientRequest,
  UpdateClientRequest,
  CreateContactRequest,
  UpdateContactRequest,
  ImportContactsRequest,
  ImportContactsResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ClientResponse,
  ContactResponse,
  TemplateResponse,
  CampaignResponse,
  OrganizationResponse,
} from '@sendbandit/shared/types'

// Channel connection types
export type ChannelType = 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'slack' | 'discord'

export interface ChannelConnectionResponse {
  id: string
  organizationId: string
  channel: ChannelType
  name: string
  credentials: Record<string, string> // Masked credentials
  isActive: boolean
  webhookUrl: string | null
  webhookSecret: string | null
  lastVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateChannelConnectionRequest {
  channel: ChannelType
  name: string
  credentials: Record<string, string>
  isActive?: boolean
}

export interface UpdateChannelConnectionRequest {
  name?: string
  credentials?: Record<string, string>
  isActive?: boolean
}

export interface ChannelVerifyResponse {
  valid: boolean
  error?: string
  verifiedAt: string | null
}

// Message types
export interface MessageContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio'
  text?: string
  mediaUrl?: string
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone'
    text: string
    value?: string
  }>
}

export interface SendMessageRequest {
  channel: ChannelType
  content: MessageContent
  templateId?: string
  variables?: Record<string, string>
}

export interface MessageResponse {
  id: string
  contactId: string
  channel: ChannelType
  direction: 'outbound' | 'inbound'
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  content: MessageContent
  providerMessageId: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  failureReason: string | null
  createdAt: string
}

export interface ApiClientConfig {
  baseUrl: string
  getToken: () => Promise<string> | string
}

export class SendBanditClient {
  private baseUrl: string
  private getToken: () => Promise<string> | string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl
    this.getToken = config.getToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: { code?: string; message?: string } }
      throw new ApiError(
        errorData.error?.code || 'UNKNOWN_ERROR',
        errorData.error?.message || 'An error occurred',
        response.status
      )
    }

    return (await response.json()) as ApiResponse<T>
  }

  // Organizations
  organizations = {
    get: async (id: string): Promise<ApiResponse<OrganizationResponse>> => {
      return this.request(`/auth/organizations/${id}`)
    },

    list: async (): Promise<ApiResponse<OrganizationResponse[]>> => {
      return this.request('/auth/organizations')
    },

    current: async (): Promise<ApiResponse<OrganizationResponse>> => {
      return this.request('/auth/organizations/current')
    },
  }

  // Clients
  clients = {
    list: async (params?: {
      page?: number
      pageSize?: number
    }): Promise<ApiResponse<ClientResponse[]>> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
      const query = searchParams.toString()
      return this.request(`/clients${query ? `?${query}` : ''}`)
    },

    get: async (id: string): Promise<ApiResponse<ClientResponse>> => {
      return this.request(`/clients/${id}`)
    },

    create: async (data: CreateClientRequest): Promise<ApiResponse<ClientResponse>> => {
      return this.request('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    update: async (id: string, data: UpdateClientRequest): Promise<ApiResponse<ClientResponse>> => {
      return this.request(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request(`/clients/${id}`, {
        method: 'DELETE',
      })
    },
  }

  // Contacts
  contacts = {
    list: async (
      clientId: string,
      params?: { page?: number; pageSize?: number; search?: string }
    ): Promise<ApiResponse<ContactResponse[]>> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
      if (params?.search) searchParams.set('search', params.search)
      const query = searchParams.toString()
      return this.request(`/clients/${clientId}/contacts${query ? `?${query}` : ''}`)
    },

    get: async (clientId: string, contactId: string): Promise<ApiResponse<ContactResponse>> => {
      return this.request(`/clients/${clientId}/contacts/${contactId}`)
    },

    create: async (clientId: string, data: CreateContactRequest): Promise<ApiResponse<ContactResponse>> => {
      return this.request(`/clients/${clientId}/contacts`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    update: async (
      clientId: string,
      contactId: string,
      data: UpdateContactRequest
    ): Promise<ApiResponse<ContactResponse>> => {
      return this.request(`/clients/${clientId}/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: async (
      clientId: string,
      contactId: string
    ): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request(`/clients/${clientId}/contacts/${contactId}`, {
        method: 'DELETE',
      })
    },

    import: async (
      clientId: string,
      data: ImportContactsRequest
    ): Promise<ApiResponse<ImportContactsResponse>> => {
      return this.request(`/clients/${clientId}/contacts/import`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  }

  // Templates
  templates = {
    list: async (params?: {
      page?: number
      pageSize?: number
      channel?: string
      status?: string
    }): Promise<ApiResponse<TemplateResponse[]>> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
      if (params?.channel) searchParams.set('channel', params.channel)
      if (params?.status) searchParams.set('status', params.status)
      const query = searchParams.toString()
      return this.request(`/templates${query ? `?${query}` : ''}`)
    },

    get: async (id: string): Promise<ApiResponse<TemplateResponse>> => {
      return this.request(`/templates/${id}`)
    },

    create: async (data: CreateTemplateRequest): Promise<ApiResponse<TemplateResponse>> => {
      return this.request('/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    update: async (id: string, data: UpdateTemplateRequest): Promise<ApiResponse<TemplateResponse>> => {
      return this.request(`/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request(`/templates/${id}`, {
        method: 'DELETE',
      })
    },

    render: async (
      id: string,
      variables: Record<string, string>
    ): Promise<ApiResponse<{ content: string }>> => {
      return this.request(`/templates/${id}/render`, {
        method: 'POST',
        body: JSON.stringify({ variables }),
      })
    },
  }

  // Campaigns
  campaigns = {
    list: async (
      clientId: string,
      params?: { page?: number; pageSize?: number; status?: string }
    ): Promise<ApiResponse<CampaignResponse[]>> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString())
      if (params?.status) searchParams.set('status', params.status)
      const query = searchParams.toString()
      return this.request(`/campaigns?clientId=${clientId}${query ? `&${query}` : ''}`)
    },

    get: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}`)
    },

    create: async (clientId: string, data: CreateCampaignRequest): Promise<ApiResponse<CampaignResponse>> => {
      return this.request('/campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...data, clientId }),
      })
    },

    update: async (id: string, data: UpdateCampaignRequest): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request(`/campaigns/${id}`, {
        method: 'DELETE',
      })
    },

    activate: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}/activate`, {
        method: 'POST',
      })
    },

    pause: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}/pause`, {
        method: 'POST',
      })
    },

    resume: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}/resume`, {
        method: 'POST',
      })
    },

    stop: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}/stop`, {
        method: 'POST',
      })
    },

    duplicate: async (id: string): Promise<ApiResponse<CampaignResponse>> => {
      return this.request(`/campaigns/${id}/duplicate`, {
        method: 'POST',
      })
    },

    enrollContacts: async (
      id: string,
      contactIds: string[]
    ): Promise<ApiResponse<{ enrolled: number }>> => {
      return this.request(`/campaigns/${id}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ contactIds }),
      })
    },
  }

  // Analytics
  analytics = {
    getDashboard: async (params?: {
      startDate?: string
      endDate?: string
    }): Promise<
      ApiResponse<{
        messagesSent: number
        messagesDelivered: number
        messagesRead: number
        messagesFailed: number
        activeCampaigns: number
        totalContacts: number
      }>
    > => {
      const searchParams = new URLSearchParams()
      if (params?.startDate) searchParams.set('startDate', params.startDate)
      if (params?.endDate) searchParams.set('endDate', params.endDate)
      const query = searchParams.toString()
      return this.request(`/analytics/dashboard${query ? `?${query}` : ''}`)
    },

    getCampaignStats: async (
      campaignId: string
    ): Promise<
      ApiResponse<{
        totalEnrollments: number
        activeEnrollments: number
        completedEnrollments: number
        failedEnrollments: number
        messagesSent: number
        messagesDelivered: number
        messagesRead: number
        messagesFailed: number
      }>
    > => {
      return this.request(`/analytics/campaigns/${campaignId}`)
    },
  }

  // Channel Connections
  channels = {
    list: async (): Promise<ApiResponse<ChannelConnectionResponse[]>> => {
      return this.request('/clients/channels')
    },

    get: async (id: string): Promise<ApiResponse<ChannelConnectionResponse>> => {
      return this.request(`/clients/channels/${id}`)
    },

    create: async (data: CreateChannelConnectionRequest): Promise<ApiResponse<ChannelConnectionResponse>> => {
      return this.request('/clients/channels', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    update: async (
      id: string,
      data: UpdateChannelConnectionRequest
    ): Promise<ApiResponse<ChannelConnectionResponse>> => {
      return this.request(`/clients/channels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request(`/clients/channels/${id}`, {
        method: 'DELETE',
      })
    },

    verify: async (id: string): Promise<ApiResponse<ChannelVerifyResponse>> => {
      return this.request(`/clients/channels/${id}/verify`, {
        method: 'POST',
      })
    },
  }

  // Messages
  messages = {
    send: async (
      clientId: string,
      contactId: string,
      data: SendMessageRequest
    ): Promise<ApiResponse<MessageResponse>> => {
      return this.request(`/clients/${clientId}/contacts/${contactId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    list: async (
      clientId: string,
      contactId: string,
      params?: { limit?: number; offset?: number; channel?: string }
    ): Promise<ApiResponse<MessageResponse[]>> => {
      const searchParams = new URLSearchParams()
      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.offset) searchParams.set('offset', params.offset.toString())
      if (params?.channel) searchParams.set('channel', params.channel)
      const query = searchParams.toString()
      return this.request(`/clients/${clientId}/contacts/${contactId}/messages${query ? `?${query}` : ''}`)
    },

    get: async (id: string): Promise<ApiResponse<MessageResponse>> => {
      return this.request(`/clients/messages/${id}`)
    },
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createClient(config: ApiClientConfig): SendBanditClient {
  return new SendBanditClient(config)
}
