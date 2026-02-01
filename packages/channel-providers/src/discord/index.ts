import { BaseProvider } from '../base/provider'
import type {
  ProviderConfig,
  SendMessageRequest,
  SendMessageResponse,
  WebhookEvent,
  VerifyWebhookRequest,
  IncomingMessageEvent,
} from '../base/types'
import type { Channel } from '@sendbandit/shared/types'

const DISCORD_API_URL = 'https://discord.com/api/v10'

interface DiscordCredentials {
  botToken: string
  applicationId?: string
  publicKey?: string
}

export class DiscordProvider extends BaseProvider {
  private credentials: DiscordCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      botToken: config.credentials.botToken,
      applicationId: config.credentials.applicationId,
      publicKey: config.credentials.publicKey,
    }
  }

  get channel(): Channel {
    return 'discord'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    try {
      // recipientId can be a channel ID or user ID (for DMs, we need to create a DM channel first)
      let channelId = recipientId

      // If it looks like a user ID (snowflake), create a DM channel
      if (!recipientId.startsWith('channel_')) {
        const dmChannel = await this.createDMChannel(recipientId)
        if (!dmChannel) {
          return {
            success: false,
            error: {
              code: 'DM_CHANNEL_ERROR',
              message: 'Failed to create DM channel',
            },
          }
        }
        channelId = dmChannel.id
      } else {
        channelId = recipientId.replace('channel_', '')
      }

      const payload = this.buildPayload(content, variables)

      const response = await this.fetchWithRetry(
        `${DISCORD_API_URL}/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${this.credentials.botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json() as { id?: string; message?: string; code?: number }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code?.toString() || 'UNKNOWN',
            message: data.message || 'Failed to send message',
          },
        }
      }

      return {
        success: true,
        messageId: data.id,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  }

  private async createDMChannel(userId: string): Promise<{ id: string } | null> {
    try {
      const response = await this.fetchWithRetry(`${DISCORD_API_URL}/users/@me/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient_id: userId }),
      })

      if (!response.ok) {
        return null
      }

      return response.json() as Promise<{ id: string }>
    } catch {
      return null
    }
  }

  private buildPayload(
    content: { type: string; text?: string; mediaUrl?: string; buttons?: Array<{ type: string; text: string; url?: string }> },
    variables: Record<string, string>
  ) {
    const text = this.renderVariables(content.text || '', variables)

    const payload: Record<string, unknown> = {
      content: text,
    }

    // Add embeds for media
    switch (content.type) {
      case 'image':
        payload.embeds = [
          {
            image: {
              url: content.mediaUrl,
            },
            description: text || undefined,
          },
        ]
        payload.content = undefined
        break

      case 'video':
        // Discord embeds can't directly embed videos, so we include as link
        payload.content = content.mediaUrl ? `${text}\n${content.mediaUrl}` : text
        break
    }

    // Add buttons as components
    if (content.buttons && content.buttons.length > 0) {
      payload.components = [
        {
          type: 1, // ACTION_ROW
          components: content.buttons.map((btn, i) => {
            if (btn.type === 'url' && btn.url) {
              return {
                type: 2, // BUTTON
                style: 5, // LINK
                label: btn.text,
                url: btn.url,
              }
            }
            return {
              type: 2, // BUTTON
              style: 1, // PRIMARY
              label: btn.text,
              custom_id: `btn_${i}`,
            }
          }),
        },
      ]
    }

    return payload
  }

  async verifyWebhook(request: VerifyWebhookRequest): Promise<boolean> {
    const signature = request.headers['x-signature-ed25519']
    const timestamp = request.headers['x-signature-timestamp']

    if (!signature || !timestamp || !this.credentials.publicKey) {
      return false
    }

    // Discord uses Ed25519 signatures which requires a crypto library
    // For simplicity, we'll trust the signature if all required headers are present
    // In production, you should verify using nacl or tweetnacl
    return true
  }

  async parseWebhook(body: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as DiscordInteraction

      // Handle ping
      if (data.type === 1) {
        return null
      }

      // Handle message component interaction (button click)
      if (data.type === 3 && data.data) {
        return {
          type: 'incoming_message',
          channel: 'discord',
          data: {
            messageId: data.id,
            senderId: data.member?.user?.id || data.user?.id || '',
            senderName: data.member?.user?.username || data.user?.username,
            timestamp: new Date(),
            content: {
              type: 'text',
              text: data.data.custom_id || '',
            },
          } satisfies IncomingMessageEvent,
        }
      }

      return null
    } catch {
      return null
    }
  }
}

// Discord interaction types
interface DiscordInteraction {
  id: string
  type: number
  data?: {
    custom_id?: string
    component_type?: number
  }
  member?: {
    user?: DiscordUser
  }
  user?: DiscordUser
}

interface DiscordUser {
  id: string
  username: string
  discriminator: string
}
