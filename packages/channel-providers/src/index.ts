export * from './base'
export { WhatsAppProvider } from './whatsapp'
export { TelegramProvider } from './telegram'
export { FacebookProvider } from './facebook'
export { InstagramProvider } from './instagram'
export { SlackProvider } from './slack'
export { DiscordProvider } from './discord'

import type { Channel } from '@sendbandit/shared/types'
import type { ProviderConfig } from './base/types'
import { BaseProvider } from './base/provider'
import { WhatsAppProvider } from './whatsapp'
import { TelegramProvider } from './telegram'
import { FacebookProvider } from './facebook'
import { InstagramProvider } from './instagram'
import { SlackProvider } from './slack'
import { DiscordProvider } from './discord'

export function createProvider(config: ProviderConfig): BaseProvider {
  switch (config.channel) {
    case 'whatsapp':
      return new WhatsAppProvider(config)
    case 'telegram':
      return new TelegramProvider(config)
    case 'facebook':
      return new FacebookProvider(config)
    case 'instagram':
      return new InstagramProvider(config)
    case 'slack':
      return new SlackProvider(config)
    case 'discord':
      return new DiscordProvider(config)
    default:
      throw new Error(`Unsupported channel: ${config.channel}`)
  }
}
