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
import { hmacSha256 } from '@sendbandit/shared/utils'

const INSTAGRAM_API_URL = 'https://graph.facebook.com/v18.0'

interface InstagramCredentials {
  accessToken: string
  igUserId: string
  appSecret?: string
}

export class InstagramProvider extends BaseProvider {
  private credentials: InstagramCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      accessToken: config.credentials.accessToken,
      igUserId: config.credentials.igUserId,
      appSecret: config.credentials.appSecret,
    }
  }

  get channel(): Channel {
    return 'instagram'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    try {
      const payload = this.buildPayload(recipientId, content, variables)

      const response = await this.fetchWithRetry(
        `${INSTAGRAM_API_URL}/${this.credentials.igUserId}/messages?access_token=${this.credentials.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json() as { message_id?: string; error?: { message: string; code: number } }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code?.toString() || 'UNKNOWN',
            message: data.error?.message || 'Failed to send message',
          },
        }
      }

      return {
        success: true,
        messageId: data.message_id,
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

  private buildPayload(
    recipientId: string,
    content: { type: string; text?: string; mediaUrl?: string },
    variables: Record<string, string>
  ) {
    const recipient = { id: recipientId }

    switch (content.type) {
      case 'text':
        return {
          recipient,
          message: {
            text: this.renderVariables(content.text || '', variables),
          },
        }

      case 'image':
        return {
          recipient,
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: content.mediaUrl,
              },
            },
          },
        }

      default:
        return {
          recipient,
          message: {
            text: this.renderVariables(content.text || '', variables),
          },
        }
    }
  }

  async verifyWebhook(request: VerifyWebhookRequest): Promise<boolean> {
    const signature = request.headers['x-hub-signature-256']
    if (!signature || !this.credentials.appSecret) {
      return false
    }

    const expectedSignature = await hmacSha256(this.credentials.appSecret, request.body)
    return signature === `sha256=${expectedSignature}`
  }

  async parseWebhook(body: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as InstagramWebhookPayload

      if (data.object !== 'instagram') {
        return null
      }

      for (const entry of data.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            return {
              type: 'incoming_message',
              channel: 'instagram',
              data: {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                timestamp: new Date(messaging.timestamp),
                content: this.parseMessageContent(messaging.message),
              } satisfies IncomingMessageEvent,
            }
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  private parseMessageContent(message: InstagramMessage): IncomingMessageEvent['content'] {
    if (message.text) {
      return {
        type: 'text',
        text: message.text,
      }
    }

    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]

      if (attachment.type === 'image') {
        return {
          type: 'image',
          mediaUrl: attachment.payload?.url,
        }
      }
    }

    return {
      type: 'text',
      text: '[Unsupported message type]',
    }
  }
}

// Instagram webhook types
interface InstagramWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    time: number
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      timestamp: number
      message?: InstagramMessage
    }>
  }>
}

interface InstagramMessage {
  mid: string
  text?: string
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file'
    payload?: {
      url?: string
    }
  }>
}
