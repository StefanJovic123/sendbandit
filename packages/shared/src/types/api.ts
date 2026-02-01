// API Response types
export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    pageSize?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  cursor?: string
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Client API types
export interface CreateClientRequest {
  name: string
  description?: string
  industry?: string
  timezone?: string
}

export interface UpdateClientRequest {
  name?: string
  description?: string
  industry?: string
  timezone?: string
}

// Contact API types
export interface CreateContactRequest {
  externalId?: string
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
  metadata?: Record<string, unknown>
  tags?: string[]
}

export interface UpdateContactRequest {
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
  metadata?: Record<string, unknown>
}

export interface ImportContactsRequest {
  contacts: CreateContactRequest[]
  updateExisting?: boolean
  tagIds?: string[]
}

export interface ImportContactsResponse {
  imported: number
  updated: number
  failed: number
  errors?: Array<{
    row: number
    error: string
  }>
}

// Template API types
export interface CreateTemplateRequest {
  name: string
  description?: string
  channel: string
  content: {
    type: string
    text?: string
    mediaUrl?: string
    buttons?: Array<{
      type: string
      text: string
      url?: string
      phone?: string
    }>
    header?: {
      type: string
      content: string
    }
    footer?: string
  }
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  content?: {
    type: string
    text?: string
    mediaUrl?: string
    buttons?: Array<{
      type: string
      text: string
      url?: string
      phone?: string
    }>
    header?: {
      type: string
      content: string
    }
    footer?: string
  }
}

// Campaign API types
export interface CreateCampaignRequest {
  name: string
  description?: string
  type: 'one_time' | 'recurring' | 'triggered'
  triggerType: 'manual' | 'schedule' | 'event' | 'segment_entry' | 'segment_exit'
  triggerConfig?: Record<string, unknown>
  flowData?: {
    nodes: Array<{
      id: string
      type: string
      position: { x: number; y: number }
      data: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
      label?: string
    }>
  }
  scheduledAt?: string
}

export interface UpdateCampaignRequest {
  name?: string
  description?: string
  triggerConfig?: Record<string, unknown>
  flowData?: {
    nodes: Array<{
      id: string
      type: string
      position: { x: number; y: number }
      data: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
      label?: string
    }>
  }
  scheduledAt?: string
}

// Organization API types
export interface CreateOrganizationRequest {
  name: string
  slug: string
}

export interface UpdateOrganizationRequest {
  name?: string
  slug?: string
  logoUrl?: string
}

export interface InviteMemberRequest {
  email: string
  role: 'admin' | 'manager' | 'user' | 'viewer'
}

// Webhook event types
export interface WebhookEvent {
  id: string
  type: string
  timestamp: string
  data: Record<string, unknown>
}

export interface WhatsAppWebhookEvent {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
        }>
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

export interface TelegramWebhookEvent {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
  }
}

// API Response Entity Types (serialized, with computed fields)
// These represent what the API actually returns (dates as ISO strings, extra fields)

export interface ClientResponse {
  id: string
  organizationId: string
  name: string
  description: string | null
  industry: string | null
  timezone: string
  contactsCount: number
  createdAt: string
  updatedAt: string
}

export interface ContactResponse {
  id: string
  clientId: string
  externalId: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  whatsappId: string | null
  telegramId: string | null
  facebookId: string | null
  instagramId: string | null
  slackId: string | null
  discordId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TemplateResponse {
  id: string
  organizationId: string
  name: string
  description: string | null
  channel: string
  status: string
  currentVersionId: string | null
  content: {
    type: string
    text?: string
    mediaUrl?: string
    buttons?: Array<{
      type: string
      text: string
      url?: string
      phone?: string
    }>
    header?: {
      type: string
      content: string
    }
    footer?: string
  } | null
  variables: string[]
  createdAt: string
  updatedAt: string
}

export interface CampaignResponse {
  id: string
  clientId: string
  name: string
  description: string | null
  type: string
  status: string
  triggerType: string
  triggerConfig: Record<string, unknown>
  flowData: {
    nodes: Array<{
      id: string
      type: string
      position: { x: number; y: number }
      data: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
      label?: string
    }>
  } | null
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  enrolledCount: number
  completedCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationResponse {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: string
  updatedAt: string
}
