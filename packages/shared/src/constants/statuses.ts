// Template statuses
export const TEMPLATE_STATUSES = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[keyof typeof TEMPLATE_STATUSES]

// Campaign statuses
export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[keyof typeof CAMPAIGN_STATUSES]

// Enrollment statuses
export const ENROLLMENT_STATUSES = {
  ACTIVE: 'active',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[keyof typeof ENROLLMENT_STATUSES]

// Message statuses
export const MESSAGE_STATUSES = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[keyof typeof MESSAGE_STATUSES]

// Subscription statuses
export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  TRIALING: 'trialing',
} as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES]

// Invoice statuses
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open',
  PAID: 'paid',
  VOID: 'void',
  UNCOLLECTIBLE: 'uncollectible',
} as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES]

// Campaign types
export const CAMPAIGN_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
  TRIGGERED: 'triggered',
} as const

export type CampaignType = (typeof CAMPAIGN_TYPES)[keyof typeof CAMPAIGN_TYPES]

// Trigger types
export const TRIGGER_TYPES = {
  MANUAL: 'manual',
  SCHEDULE: 'schedule',
  EVENT: 'event',
  SEGMENT_ENTRY: 'segment_entry',
  SEGMENT_EXIT: 'segment_exit',
} as const

export type TriggerType = (typeof TRIGGER_TYPES)[keyof typeof TRIGGER_TYPES]

// Node types for flow builder
export const NODE_TYPES = {
  TRIGGER: 'trigger',
  SEND_MESSAGE: 'send_message',
  WAIT: 'wait',
  CONDITION: 'condition',
  SPLIT: 'split',
  UPDATE_CONTACT: 'update_contact',
  ADD_TAG: 'add_tag',
  REMOVE_TAG: 'remove_tag',
  END: 'end',
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]

// Status display helpers
export const STATUS_COLORS: Record<string, string> = {
  // Template
  draft: 'gray',
  pending_approval: 'yellow',
  approved: 'green',
  rejected: 'red',
  // Campaign
  scheduled: 'blue',
  active: 'green',
  paused: 'yellow',
  completed: 'gray',
  cancelled: 'red',
  // Message
  queued: 'gray',
  sent: 'blue',
  delivered: 'green',
  read: 'green',
  failed: 'red',
  // Enrollment
  waiting: 'yellow',
}
