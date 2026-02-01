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
import { hmacSha256 } from '@sendbandit/shared/utils'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

interface WhatsAppCredentials {
  accessToken: string
  phoneNumberId: string
  businessAccountId?: string
}

export class WhatsAppProvider extends BaseProvider {
  private credentials: WhatsAppCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      accessToken: config.credentials.accessToken,
      phoneNumberId: config.credentials.phoneNumberId,
      businessAccountId: config.credentials.businessAccountId,
    }
  }

  get channel(): Channel {
    return 'whatsapp'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    // WhatsApp requires phone number without + prefix
    const cleanRecipientId = recipientId.replace(/^\+/, '')

    try {
      const payload = this.buildMessagePayload(cleanRecipientId, content, variables)

      const response = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.credentials.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json() as { messages?: Array<{ id: string }>; error?: { message: string; code: number } }

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
        messageId: data.messages?.[0]?.id,
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

  private buildMessagePayload(
    recipientId: string,
    content: {
      type: string
      text?: string
      mediaUrl?: string
      buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>
      templateName?: string
      templateLanguage?: string
      templateComponents?: Array<{
        type: 'header' | 'body' | 'button'
        parameters?: Array<{ type: string; text?: string; image?: { link: string }; video?: { link: string }; document?: { link: string } }>
      }>
    },
    variables: Record<string, string>
  ) {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientId,
    }

    switch (content.type) {
      case 'text':
        return {
          ...base,
          type: 'text',
          text: {
            preview_url: true,
            body: this.renderVariables(content.text || '', variables),
          },
        }

      case 'image':
        return {
          ...base,
          type: 'image',
          image: {
            link: content.mediaUrl,
            caption: content.text ? this.renderVariables(content.text, variables) : undefined,
          },
        }

      case 'video':
        return {
          ...base,
          type: 'video',
          video: {
            link: content.mediaUrl,
            caption: content.text ? this.renderVariables(content.text, variables) : undefined,
          },
        }

      case 'document':
        return {
          ...base,
          type: 'document',
          document: {
            link: content.mediaUrl,
            caption: content.text ? this.renderVariables(content.text, variables) : undefined,
          },
        }

      case 'interactive':
        return {
          ...base,
          type: 'interactive',
          interactive: this.buildInteractivePayload(content, variables),
        }

      case 'template':
        return {
          ...base,
          type: 'template',
          template: {
            name: content.templateName,
            language: { code: content.templateLanguage || 'en_US' },
            components: content.templateComponents || [],
          },
        }

      default:
        return {
          ...base,
          type: 'text',
          text: {
            body: this.renderVariables(content.text || '', variables),
          },
        }
    }
  }

  private buildInteractivePayload(
    content: { text?: string; buttons?: Array<{ type: string; text: string; url?: string; phone?: string }> },
    variables: Record<string, string>
  ) {
    const buttons = content.buttons || []

    if (buttons.every((b) => b.type === 'quick_reply')) {
      return {
        type: 'button',
        body: {
          text: this.renderVariables(content.text || '', variables),
        },
        action: {
          buttons: buttons.map((b, i) => ({
            type: 'reply',
            reply: {
              id: `btn_${i}`,
              title: b.text,
            },
          })),
        },
      }
    }

    // URL/Phone buttons use CTA template
    return {
      type: 'cta_url',
      body: {
        text: this.renderVariables(content.text || '', variables),
      },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: buttons[0]?.text,
          url: buttons[0]?.url,
        },
      },
    }
  }

  async verifyWebhook(request: VerifyWebhookRequest): Promise<boolean> {
    const signature = request.headers['x-hub-signature-256']
    if (!signature || !this.config.webhookSecret) {
      return false
    }

    const expectedSignature = await hmacSha256(this.config.webhookSecret, request.body)
    return signature === `sha256=${expectedSignature}`
  }

  async parseWebhook(body: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as WhatsAppWebhookPayload

      if (data.object !== 'whatsapp_business_account') {
        return null
      }

      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              return {
                type: 'message_status',
                channel: 'whatsapp',
                data: {
                  messageId: status.id,
                  status: this.mapStatus(status.status),
                  timestamp: new Date(parseInt(status.timestamp) * 1000),
                  recipientId: status.recipient_id,
                  error: status.errors?.[0]
                    ? {
                        code: status.errors[0].code?.toString() || 'UNKNOWN',
                        message: status.errors[0].title || 'Unknown error',
                      }
                    : undefined,
                } satisfies MessageStatusEvent,
              }
            }
          }

          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const contact = value.contacts?.find((c) => c.wa_id === message.from)

              return {
                type: 'incoming_message',
                channel: 'whatsapp',
                data: {
                  messageId: message.id,
                  senderId: message.from,
                  senderName: contact?.profile?.name,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  content: this.parseMessageContent(message),
                } satisfies IncomingMessageEvent,
              }
            }
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  private mapStatus(status: string): 'sent' | 'delivered' | 'read' | 'failed' {
    switch (status) {
      case 'sent':
        return 'sent'
      case 'delivered':
        return 'delivered'
      case 'read':
        return 'read'
      case 'failed':
        return 'failed'
      default:
        return 'sent'
    }
  }

  private parseMessageContent(message: WhatsAppMessage): IncomingMessageEvent['content'] {
    switch (message.type) {
      case 'text':
        return {
          type: 'text',
          text: message.text?.body,
        }
      case 'image':
        return {
          type: 'image',
          mediaUrl: message.image?.id,
          caption: message.image?.caption,
        }
      case 'video':
        return {
          type: 'video',
          mediaUrl: message.video?.id,
          caption: message.video?.caption,
        }
      case 'document':
        return {
          type: 'document',
          mediaUrl: message.document?.id,
          caption: message.document?.caption,
        }
      case 'audio':
        return {
          type: 'audio',
          mediaUrl: message.audio?.id,
        }
      default:
        return {
          type: 'text',
          text: '[Unsupported message type]',
        }
    }
  }
}

// WhatsApp webhook types
interface WhatsAppWebhookPayload {
  object: string
  entry?: Array<{
    id: string
    changes?: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: WhatsAppMessage[]
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
          errors?: Array<{
            code: number
            title: string
          }>
        }>
      }
      field: string
    }>
  }>
}

interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; caption?: string }
  video?: { id: string; caption?: string }
  document?: { id: string; caption?: string; filename?: string }
  audio?: { id: string }
}
