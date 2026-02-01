export * from './roles'
export * from './channels'
export * from './statuses'

// API Constants
export const API_VERSION = 'v1'
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Rate limits (requests per minute)
export const RATE_LIMITS = {
  DEFAULT: 60,
  AUTH: 20,
  WEBHOOKS: 1000,
  BULK_OPERATIONS: 10,
} as const

// Plan limits
export const PLAN_LIMITS = {
  free: {
    contacts: 500,
    messagesPerMonth: 1000,
    campaigns: 3,
    templates: 10,
    teamMembers: 2,
    channels: 1,
  },
  starter: {
    contacts: 5000,
    messagesPerMonth: 10000,
    campaigns: 20,
    templates: 50,
    teamMembers: 5,
    channels: 3,
  },
  professional: {
    contacts: 50000,
    messagesPerMonth: 100000,
    campaigns: 100,
    templates: 200,
    teamMembers: 20,
    channels: 6,
  },
  enterprise: {
    contacts: -1, // unlimited
    messagesPerMonth: -1,
    campaigns: -1,
    templates: -1,
    teamMembers: -1,
    channels: 6,
  },
} as const

export type Plan = keyof typeof PLAN_LIMITS

// Default colors for tags
export const DEFAULT_TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
] as const

// Timezones (common ones)
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
] as const

// Webhook event types
export const WEBHOOK_EVENTS = {
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_FAILED: 'message.failed',
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_COMPLETED: 'enrollment.completed',
} as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]
