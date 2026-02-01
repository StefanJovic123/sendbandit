import { nanoid } from 'nanoid'

const PREFIXES = {
  organization: 'org',
  user: 'usr',
  client: 'cli',
  contact: 'con',
  tag: 'tag',
  segment: 'seg',
  template: 'tpl',
  templateVersion: 'tpv',
  campaign: 'cmp',
  enrollment: 'enr',
  message: 'msg',
  channelConnection: 'chn',
  subscription: 'sub',
  invoice: 'inv',
  event: 'evt',
} as const

type IdPrefix = keyof typeof PREFIXES

/**
 * Generate a prefixed ID for a given entity type
 * @param type - The entity type
 * @param size - Optional size for the nanoid (default: 21)
 * @returns Prefixed ID (e.g., "cli_abc123...")
 */
export function generateId(type: IdPrefix, size: number = 21): string {
  return `${PREFIXES[type]}_${nanoid(size)}`
}

/**
 * Generate a simple nanoid without prefix
 * @param size - Optional size (default: 21)
 */
export function generateSimpleId(size: number = 21): string {
  return nanoid(size)
}

/**
 * Extract the prefix from an ID
 * @param id - The prefixed ID
 */
export function getIdPrefix(id: string): string | null {
  const parts = id.split('_')
  return parts.length >= 2 ? parts[0] : null
}

/**
 * Validate that an ID has the expected prefix
 * @param id - The ID to validate
 * @param type - The expected entity type
 */
export function validateIdPrefix(id: string, type: IdPrefix): boolean {
  const prefix = getIdPrefix(id)
  return prefix === PREFIXES[type]
}
