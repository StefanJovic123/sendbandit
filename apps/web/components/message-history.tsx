'use client'

import { useEffect, useRef } from 'react'
import {
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSlack,
  IconBrandDiscord,
  IconClock,
  IconCheck,
  IconChecks,
  IconEye,
  IconX,
  IconLoader2,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { MessageResponse, ChannelType } from '@sendbandit/api-client'

interface MessageHistoryProps {
  messages: MessageResponse[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

const channelIcons: Record<ChannelType, React.ElementType> = {
  whatsapp: IconBrandWhatsapp,
  telegram: IconBrandTelegram,
  facebook: IconBrandFacebook,
  instagram: IconBrandInstagram,
  slack: IconBrandSlack,
  discord: IconBrandDiscord,
}

const channelColors: Record<ChannelType, string> = {
  whatsapp: 'bg-green-500',
  telegram: 'bg-blue-500',
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-500',
  slack: 'bg-purple-500',
  discord: 'bg-indigo-500',
}

function MessageStatus({ status }: { status: MessageResponse['status'] }) {
  switch (status) {
    case 'queued':
      return (
        <span className="flex items-center gap-1 text-muted-foreground" title="Queued">
          <IconClock className="size-3" />
        </span>
      )
    case 'sent':
      return (
        <span className="flex items-center gap-1 text-muted-foreground" title="Sent">
          <IconCheck className="size-3" />
        </span>
      )
    case 'delivered':
      return (
        <span className="flex items-center gap-1 text-blue-500" title="Delivered">
          <IconChecks className="size-3" />
        </span>
      )
    case 'read':
      return (
        <span className="flex items-center gap-1 text-green-500" title="Read">
          <IconEye className="size-3" />
        </span>
      )
    case 'failed':
      return (
        <span className="flex items-center gap-1 text-destructive" title="Failed">
          <IconX className="size-3" />
        </span>
      )
    default:
      return null
  }
}

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
}

function MessageBubble({ message }: { message: MessageResponse }) {
  const isOutbound = message.direction === 'outbound'
  const Icon = channelIcons[message.channel]

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[80%]',
        isOutbound ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          channelColors[message.channel]
        )}
      >
        <Icon className="size-3 text-white" />
      </div>

      <div
        className={cn(
          'rounded-lg px-3 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {message.content.text && (
          <p className="whitespace-pre-wrap break-words text-sm">{message.content.text}</p>
        )}

        {message.content.mediaUrl && (
          <div className="mt-1">
            {message.content.type === 'image' ? (
              <img
                src={message.content.mediaUrl}
                alt="Message attachment"
                className="max-h-48 rounded"
              />
            ) : (
              <a
                href={message.content.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                View attachment
              </a>
            )}
          </div>
        )}

        <div
          className={cn(
            'mt-1 flex items-center gap-1.5 text-xs',
            isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOutbound && <MessageStatus status={message.status} />}
        </div>

        {message.status === 'failed' && message.failureReason && (
          <p className="mt-1 text-xs text-destructive">{message.failureReason}</p>
        )}
      </div>
    </div>
  )
}

export function MessageHistory({
  messages,
  loading = false,
  onLoadMore,
  hasMore = false,
}: MessageHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No messages yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a message to start the conversation
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
    >
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="mx-auto mb-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {loading ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            'Load earlier messages'
          )}
        </button>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      <div ref={bottomRef} />
    </div>
  )
}
