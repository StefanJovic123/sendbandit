export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  SLACK: 'slack',
  DISCORD: 'discord',
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

export const CHANNEL_CONFIG: Record<
  Channel,
  {
    name: string
    icon: string
    color: string
    maxMessageLength: number
    supportsMedia: boolean
    supportsButtons: boolean
    requiresApproval: boolean
  }
> = {
  whatsapp: {
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    maxMessageLength: 4096,
    supportsMedia: true,
    supportsButtons: true,
    requiresApproval: true,
  },
  telegram: {
    name: 'Telegram',
    icon: 'telegram',
    color: '#0088CC',
    maxMessageLength: 4096,
    supportsMedia: true,
    supportsButtons: true,
    requiresApproval: false,
  },
  facebook: {
    name: 'Facebook Messenger',
    icon: 'facebook',
    color: '#1877F2',
    maxMessageLength: 2000,
    supportsMedia: true,
    supportsButtons: true,
    requiresApproval: false,
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    maxMessageLength: 1000,
    supportsMedia: true,
    supportsButtons: false,
    requiresApproval: false,
  },
  slack: {
    name: 'Slack',
    icon: 'slack',
    color: '#4A154B',
    maxMessageLength: 40000,
    supportsMedia: true,
    supportsButtons: true,
    requiresApproval: false,
  },
  discord: {
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    maxMessageLength: 2000,
    supportsMedia: true,
    supportsButtons: true,
    requiresApproval: false,
  },
}

export const SUPPORTED_CHANNELS = Object.values(CHANNELS)
