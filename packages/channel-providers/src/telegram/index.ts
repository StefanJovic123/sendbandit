import { BaseProvider } from '../base/provider'
import type {
  ProviderConfig,
  SendMessageRequest,
  SendMessageResponse,
  WebhookEvent,
  VerifyWebhookRequest,
  MessageStatusEvent,
  IncomingMessageEvent,
} from '../base/types'
import type { Channel } from '@sendbandit/shared/types'
import { sha256 } from '@sendbandit/shared/utils'

const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

interface TelegramCredentials {
  botToken: string
}

export class TelegramProvider extends BaseProvider {
  private credentials: TelegramCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      botToken: config.credentials.botToken,
    }
  }

  get channel(): Channel {
    return 'telegram'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    try {
      const endpoint = this.getEndpoint(content.type)
      const payload = this.buildPayload(recipientId, content, variables)

      const response = await this.fetchWithRetry(
        `${TELEGRAM_API_URL}${this.credentials.botToken}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string }

      if (!data.ok) {
        return {
          success: false,
          error: {
            code: 'TELEGRAM_ERROR',
            message: data.description || 'Failed to send message',
          },
        }
      }

      return {
        success: true,
        messageId: data.result?.message_id?.toString(),
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

  private getEndpoint(contentType: string): string {
    switch (contentType) {
      case 'image':
        return 'sendPhoto'
      case 'video':
        return 'sendVideo'
      case 'document':
        return 'sendDocument'
      case 'audio':
        return 'sendAudio'
      default:
        return 'sendMessage'
    }
  }

  private buildPayload(
    chatId: string,
    content: { type: string; text?: string; mediaUrl?: string; buttons?: Array<{ type: string; text: string; url?: string }> },
    variables: Record<string, string>
  ) {
    const base: Record<string, unknown> = {
      chat_id: chatId,
      parse_mode: 'HTML',
    }

    // Add inline keyboard if buttons present
    if (content.buttons && content.buttons.length > 0) {
      base.reply_markup = {
        inline_keyboard: [
          content.buttons.map((btn) => {
            if (btn.type === 'url' && btn.url) {
              return { text: btn.text, url: btn.url }
            }
            return { text: btn.text, callback_data: btn.text }
          }),
        ],
      }
    }

    switch (content.type) {
      case 'text':
        return {
          ...base,
          text: this.renderVariables(content.text || '', variables),
        }

      case 'image':
        return {
          ...base,
          photo: content.mediaUrl,
          caption: content.text ? this.renderVariables(content.text, variables) : undefined,
        }

      case 'video':
        return {
          ...base,
          video: content.mediaUrl,
          caption: content.text ? this.renderVariables(content.text, variables) : undefined,
        }

      case 'document':
        return {
          ...base,
          document: content.mediaUrl,
          caption: content.text ? this.renderVariables(content.text, variables) : undefined,
        }

      case 'audio':
        return {
          ...base,
          audio: content.mediaUrl,
          caption: content.text ? this.renderVariables(content.text, variables) : undefined,
        }

      default:
        return {
          ...base,
          text: this.renderVariables(content.text || '', variables),
        }
    }
  }

  async verifyWebhook(request: VerifyWebhookRequest): Promise<boolean> {
    // Telegram webhook verification is done by checking the secret token header
    const secretToken = request.headers['x-telegram-bot-api-secret-token']
    if (!secretToken || !this.config.webhookSecret) {
      // If no secret configured, consider it valid (not recommended for production)
      return !this.config.webhookSecret
    }

    return secretToken === this.config.webhookSecret
  }

  async parseWebhook(body: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as TelegramUpdate

      // Handle incoming messages
      if (data.message) {
        const message = data.message

        return {
          type: 'incoming_message',
          channel: 'telegram',
          data: {
            messageId: message.message_id.toString(),
            senderId: message.from.id.toString(),
            senderName: [message.from.first_name, message.from.last_name]
              .filter(Boolean)
              .join(' ') || message.from.username,
            timestamp: new Date(message.date * 1000),
            content: this.parseMessageContent(message),
          } satisfies IncomingMessageEvent,
        }
      }

      // Handle callback queries (button clicks)
      if (data.callback_query) {
        const query = data.callback_query

        return {
          type: 'incoming_message',
          channel: 'telegram',
          data: {
            messageId: query.id,
            senderId: query.from.id.toString(),
            senderName: [query.from.first_name, query.from.last_name]
              .filter(Boolean)
              .join(' ') || query.from.username,
            timestamp: new Date(),
            content: {
              type: 'text',
              text: query.data,
            },
          } satisfies IncomingMessageEvent,
        }
      }

      return null
    } catch {
      return null
    }
  }

  private parseMessageContent(message: TelegramMessage): IncomingMessageEvent['content'] {
    if (message.text) {
      return {
        type: 'text',
        text: message.text,
      }
    }

    if (message.photo) {
      const photo = message.photo[message.photo.length - 1] // Get largest photo
      return {
        type: 'image',
        mediaUrl: photo.file_id,
        caption: message.caption,
      }
    }

    if (message.video) {
      return {
        type: 'video',
        mediaUrl: message.video.file_id,
        caption: message.caption,
      }
    }

    if (message.document) {
      return {
        type: 'document',
        mediaUrl: message.document.file_id,
        caption: message.caption,
      }
    }

    if (message.audio) {
      return {
        type: 'audio',
        mediaUrl: message.audio.file_id,
      }
    }

    if (message.voice) {
      return {
        type: 'audio',
        mediaUrl: message.voice.file_id,
      }
    }

    return {
      type: 'text',
      text: '[Unsupported message type]',
    }
  }
}

// Telegram webhook types
interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: {
    id: string
    from: TelegramUser
    message?: TelegramMessage
    data?: string
  }
}

interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  date: number
  text?: string
  caption?: string
  photo?: Array<{ file_id: string; width: number; height: number }>
  video?: { file_id: string }
  document?: { file_id: string; file_name?: string }
  audio?: { file_id: string }
  voice?: { file_id: string }
}

interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
}
