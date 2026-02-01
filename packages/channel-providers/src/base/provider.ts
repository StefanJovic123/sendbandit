import type {
  ProviderConfig,
  SendMessageRequest,
  SendMessageResponse,
  WebhookEvent,
  VerifyWebhookRequest,
} from './types'
import type { Channel } from '@sendbandit/shared/types'

export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  abstract get channel(): Channel

  /**
   * Send a message to a recipient
   */
  abstract sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(request: VerifyWebhookRequest): Promise<boolean>

  /**
   * Parse webhook payload into standardized event
   */
  abstract parseWebhook(body: string): Promise<WebhookEvent | null>

  /**
   * Render template variables in content
   */
  protected renderVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] ?? match
    })
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response
        }

        // Retry server errors (5xx)
        if (response.status >= 500) {
          if (attempt === maxRetries) {
            return response
          }
          await this.sleep(Math.pow(2, attempt) * 1000) // Exponential backoff
          continue
        }

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt === maxRetries) {
          throw lastError
        }

        await this.sleep(Math.pow(2, attempt) * 1000)
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
