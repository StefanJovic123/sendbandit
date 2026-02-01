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

const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0/me/messages'

interface FacebookCredentials {
  pageAccessToken: string
  appSecret?: string
}

export class FacebookProvider extends BaseProvider {
  private credentials: FacebookCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      pageAccessToken: config.credentials.pageAccessToken,
      appSecret: config.credentials.appSecret,
    }
  }

  get channel(): Channel {
    return 'facebook'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    try {
      const payload = this.buildPayload(recipientId, content, variables)

      const response = await this.fetchWithRetry(
        `${FACEBOOK_API_URL}?access_token=${this.credentials.pageAccessToken}`,
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
    content: { type: string; text?: string; mediaUrl?: string; buttons?: Array<{ type: string; text: string; url?: string }> },
    variables: Record<string, string>
  ) {
    const recipient = { id: recipientId }

    switch (content.type) {
      case 'text':
        if (content.buttons && content.buttons.length > 0) {
          return {
            recipient,
            message: {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text: this.renderVariables(content.text || '', variables),
                  buttons: content.buttons.map((btn) => {
                    if (btn.type === 'url' && btn.url) {
                      return {
                        type: 'web_url',
                        url: btn.url,
                        title: btn.text,
                      }
                    }
                    return {
                      type: 'postback',
                      title: btn.text,
                      payload: btn.text,
                    }
                  }),
                },
              },
            },
          }
        }

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
                is_reusable: true,
              },
            },
          },
        }

      case 'video':
        return {
          recipient,
          message: {
            attachment: {
              type: 'video',
              payload: {
                url: content.mediaUrl,
                is_reusable: true,
              },
            },
          },
        }

      case 'document':
        return {
          recipient,
          message: {
            attachment: {
              type: 'file',
              payload: {
                url: content.mediaUrl,
                is_reusable: true,
              },
            },
          },
        }

      case 'audio':
        return {
          recipient,
          message: {
            attachment: {
              type: 'audio',
              payload: {
                url: content.mediaUrl,
                is_reusable: true,
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
      const data = JSON.parse(body) as FacebookWebhookPayload

      if (data.object !== 'page') {
        return null
      }

      for (const entry of data.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            return {
              type: 'incoming_message',
              channel: 'facebook',
              data: {
                messageId: messaging.message.mid,
                senderId: messaging.sender.id,
                timestamp: new Date(messaging.timestamp),
                content: this.parseMessageContent(messaging.message),
              } satisfies IncomingMessageEvent,
            }
          }

          // Handle postback (button clicks)
          if (messaging.postback) {
            return {
              type: 'incoming_message',
              channel: 'facebook',
              data: {
                messageId: `postback_${messaging.timestamp}`,
                senderId: messaging.sender.id,
                timestamp: new Date(messaging.timestamp),
                content: {
                  type: 'text',
                  text: messaging.postback.payload,
                },
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

  private parseMessageContent(message: FacebookMessage): IncomingMessageEvent['content'] {
    if (message.text) {
      return {
        type: 'text',
        text: message.text,
      }
    }

    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0]

      switch (attachment.type) {
        case 'image':
          return {
            type: 'image',
            mediaUrl: attachment.payload?.url,
          }
        case 'video':
          return {
            type: 'video',
            mediaUrl: attachment.payload?.url,
          }
        case 'audio':
          return {
            type: 'audio',
            mediaUrl: attachment.payload?.url,
          }
        case 'file':
          return {
            type: 'document',
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

// Facebook webhook types
interface FacebookWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    time: number
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      timestamp: number
      message?: FacebookMessage
      postback?: {
        title: string
        payload: string
      }
    }>
  }>
}

interface FacebookMessage {
  mid: string
  text?: string
  attachments?: Array<{
    type: 'image' | 'video' | 'audio' | 'file' | 'location'
    payload?: {
      url?: string
    }
  }>
}
