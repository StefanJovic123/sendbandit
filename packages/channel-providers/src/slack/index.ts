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

const SLACK_API_URL = 'https://slack.com/api'

interface SlackCredentials {
  botToken: string
  signingSecret?: string
}

export class SlackProvider extends BaseProvider {
  private credentials: SlackCredentials

  constructor(config: ProviderConfig) {
    super(config)
    this.credentials = {
      botToken: config.credentials.botToken,
      signingSecret: config.credentials.signingSecret,
    }
  }

  get channel(): Channel {
    return 'slack'
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const { recipientId, content, variables = {} } = request

    try {
      const payload = this.buildPayload(recipientId, content, variables)

      const response = await this.fetchWithRetry(`${SLACK_API_URL}/chat.postMessage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json() as { ok: boolean; ts?: string; error?: string }

      if (!data.ok) {
        return {
          success: false,
          error: {
            code: 'SLACK_ERROR',
            message: data.error || 'Failed to send message',
          },
        }
      }

      return {
        success: true,
        messageId: data.ts,
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
    channelId: string,
    content: { type: string; text?: string; mediaUrl?: string; buttons?: Array<{ type: string; text: string; url?: string }> },
    variables: Record<string, string>
  ) {
    const text = this.renderVariables(content.text || '', variables)

    const base: Record<string, unknown> = {
      channel: channelId,
      text,
    }

    // Add blocks for rich content
    const blocks: Array<Record<string, unknown>> = []

    switch (content.type) {
      case 'text':
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text,
          },
        })
        break

      case 'image':
        blocks.push({
          type: 'image',
          image_url: content.mediaUrl,
          alt_text: 'Image',
          title: content.text
            ? {
                type: 'plain_text',
                text: text,
              }
            : undefined,
        })
        break

      default:
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text,
          },
        })
    }

    // Add buttons as actions block
    if (content.buttons && content.buttons.length > 0) {
      blocks.push({
        type: 'actions',
        elements: content.buttons.map((btn, i) => {
          if (btn.type === 'url' && btn.url) {
            return {
              type: 'button',
              text: {
                type: 'plain_text',
                text: btn.text,
              },
              url: btn.url,
              action_id: `btn_${i}`,
            }
          }
          return {
            type: 'button',
            text: {
              type: 'plain_text',
              text: btn.text,
            },
            action_id: `btn_${i}`,
          }
        }),
      })
    }

    if (blocks.length > 0) {
      base.blocks = blocks
    }

    return base
  }

  async verifyWebhook(request: VerifyWebhookRequest): Promise<boolean> {
    const timestamp = request.headers['x-slack-request-timestamp']
    const signature = request.headers['x-slack-signature']

    if (!timestamp || !signature || !this.credentials.signingSecret) {
      return false
    }

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
      return false
    }

    const sigBaseString = `v0:${timestamp}:${request.body}`
    const expectedSignature = await hmacSha256(this.credentials.signingSecret, sigBaseString)

    return signature === `v0=${expectedSignature}`
  }

  async parseWebhook(body: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(body) as SlackEvent

      // Handle URL verification
      if (data.type === 'url_verification') {
        return null
      }

      // Handle events
      if (data.type === 'event_callback' && data.event) {
        const event = data.event

        // Handle messages
        if (event.type === 'message' && !event.bot_id && event.text) {
          return {
            type: 'incoming_message',
            channel: 'slack',
            data: {
              messageId: event.ts || event.client_msg_id || '',
              senderId: event.user || '',
              timestamp: new Date(parseFloat(event.ts || '0') * 1000),
              content: {
                type: 'text',
                text: event.text,
              },
            } satisfies IncomingMessageEvent,
          }
        }
      }

      return null
    } catch {
      return null
    }
  }
}

// Slack event types
interface SlackEvent {
  type: string
  challenge?: string
  event?: {
    type: string
    user?: string
    bot_id?: string
    text?: string
    ts?: string
    client_msg_id?: string
    channel?: string
  }
}
