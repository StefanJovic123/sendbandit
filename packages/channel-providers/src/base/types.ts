import type { Channel, MessageContent } from '@sendbandit/shared/types'

export interface ProviderCredentials {
  [key: string]: string
}

export interface SendMessageRequest {
  recipientId: string
  content: MessageContent
  variables?: Record<string, string>
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string
  error?: {
    code: string
    message: string
  }
}

export interface MessageStatus {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  error?: {
    code: string
    message: string
  }
}

export interface WebhookEvent {
  type: 'message_status' | 'incoming_message'
  channel: Channel
  data: MessageStatusEvent | IncomingMessageEvent
}

export interface MessageStatusEvent {
  messageId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: Date
  recipientId: string
  error?: {
    code: string
    message: string
  }
}

export interface IncomingMessageEvent {
  messageId: string
  senderId: string
  senderName?: string
  timestamp: Date
  content: {
    type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact'
    text?: string
    mediaUrl?: string
    caption?: string
  }
}

export interface VerifyWebhookRequest {
  headers: Record<string, string>
  body: string
  signature?: string
}

export interface ProviderConfig {
  channel: Channel
  credentials: ProviderCredentials
  webhookSecret?: string
}
