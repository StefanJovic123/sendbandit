// Import types from constants to avoid duplicate exports
import type { OrganizationRole } from '../constants/roles'
import type { Channel } from '../constants/channels'
import type {
  TemplateStatus,
  CampaignType,
  CampaignStatus,
  TriggerType,
  NodeType,
  EnrollmentStatus,
  MessageStatus,
  SubscriptionStatus,
  InvoiceStatus,
} from '../constants/statuses'

// Re-export imported types for convenience
export type {
  OrganizationRole,
  Channel,
  TemplateStatus,
  CampaignType,
  CampaignStatus,
  TriggerType,
  NodeType,
  EnrollmentStatus,
  MessageStatus,
  SubscriptionStatus,
  InvoiceStatus,
}

// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: OrganizationRole
  createdAt: Date
}

// User types
export interface UserProfile {
  id: string
  clerkId: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// Client types
export interface Client {
  id: string
  organizationId: string
  name: string
  description: string | null
  industry: string | null
  timezone: string
  createdAt: Date
  updatedAt: Date
}

export interface Contact {
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
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  clientId: string
  name: string
  color: string
  createdAt: Date
}

export interface Segment {
  id: string
  clientId: string
  name: string
  description: string | null
  filters: SegmentFilter[]
  createdAt: Date
  updatedAt: Date
}

export interface SegmentFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: unknown
}

// Template types
export interface Template {
  id: string
  organizationId: string
  name: string
  description: string | null
  channel: Channel
  status: TemplateStatus
  currentVersionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: number
  content: TemplateContent
  variables: string[]
  createdById: string
  createdAt: Date
}

export interface TemplateContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive' | 'template'
  text?: string
  mediaUrl?: string
  buttons?: TemplateButton[]
  header?: {
    type: 'text' | 'image' | 'video' | 'document'
    content: string
  }
  footer?: string
  // Template-specific fields (for WhatsApp template messages)
  templateName?: string
  templateLanguage?: string
  templateComponents?: TemplateComponent[]
}

export interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone'
  text: string
  url?: string
  phone?: string
}

// Campaign types
export interface Campaign {
  id: string
  clientId: string
  name: string
  description: string | null
  type: CampaignType
  status: CampaignStatus
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  flowData: FlowData
  scheduledAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TriggerConfig {
  schedule?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly'
    time: string
    timezone: string
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
  event?: {
    name: string
    conditions?: Record<string, unknown>
  }
  segmentId?: string
}

export interface FlowData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

export interface NodeData {
  label?: string
  templateId?: string
  channel?: Channel
  waitDuration?: {
    value: number
    unit: 'minutes' | 'hours' | 'days'
  }
  condition?: {
    field: string
    operator: string
    value: unknown
  }
  splitPercentages?: number[]
  tagId?: string
  contactFields?: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface CampaignEnrollment {
  id: string
  campaignId: string
  contactId: string
  status: EnrollmentStatus
  currentNodeId: string | null
  nodeHistory: NodeHistoryEntry[]
  waitUntil: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NodeHistoryEntry {
  nodeId: string
  enteredAt: Date
  exitedAt: Date | null
  outcome?: string
}

// Message types
export interface Message {
  id: string
  campaignId: string | null
  enrollmentId: string | null
  contactId: string
  templateId: string | null
  channel: Channel
  direction: 'outbound' | 'inbound'
  status: MessageStatus
  content: MessageContent
  providerMessageId: string | null
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  failedAt: Date | null
  failureReason: string | null
  createdAt: Date
}

export interface MessageContent {
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive' | 'template'
  text?: string
  mediaUrl?: string
  buttons?: TemplateButton[]
  // Template-specific fields (for WhatsApp template messages)
  templateName?: string
  templateLanguage?: string
  templateComponents?: TemplateComponent[]
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters?: TemplateParameter[]
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'video' | 'document'
  text?: string
  image?: { link: string }
  video?: { link: string }
  document?: { link: string }
}

// Channel types
export interface ChannelConnection {
  id: string
  organizationId: string
  channel: Channel
  name: string
  credentials: Record<string, string>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Billing types
export interface Subscription {
  id: string
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'

export interface UsageRecord {
  id: string
  organizationId: string
  period: string // YYYY-MM
  messagesCount: number
  contactsCount: number
  campaignsCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  organizationId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  status: InvoiceStatus
  paidAt: Date | null
  createdAt: Date
}

// Analytics types
export interface AnalyticsEvent {
  id: string
  organizationId: string
  clientId: string | null
  campaignId: string | null
  contactId: string | null
  eventType: string
  eventData: Record<string, unknown>
  createdAt: Date
}

export interface CampaignStats {
  campaignId: string
  totalEnrollments: number
  activeEnrollments: number
  completedEnrollments: number
  failedEnrollments: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
}
