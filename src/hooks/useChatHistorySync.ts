import { useEffect, useRef } from 'react'
import { getChatHistory, journalText } from '../api/greenApi'
import type { Chat, ChatMessage, Credentials, MessageStatus } from '../types'

function mapStatus(raw?: string): MessageStatus | undefined {
  if (!raw) {
    return undefined
  }
  const value = raw.toLowerCase()
  if (value === 'sent' || value === 'delivered' || value === 'read' || value === 'failed') {
    return value
  }
  return undefined
}

export function useChatHistorySync(
  credentials: Credentials | null,
  chatId: string | null,
  onMessages: (chatId: string, messages: ChatMessage[]) => void,
): void {
  const onMessagesRef = useRef(onMessages)
  onMessagesRef.current = onMessages

  useEffect(() => {
    if (!credentials || !chatId) {
      return
    }

    const controller = new AbortController()

    const load = async () => {
      try {
        const history = await getChatHistory(credentials, chatId, 100, controller.signal)
        const mapped: ChatMessage[] = []

        for (const item of history) {
          const text = journalText(item)
          if (!text || !item.idMessage) {
            continue
          }

          const direction = item.type === 'outgoing' ? 'outgoing' : 'incoming'
          mapped.push({
            id: item.idMessage,
            text,
            timestamp: (item.timestamp || Math.floor(Date.now() / 1000)) * 1000,
            direction,
            status: direction === 'outgoing' ? mapStatus(item.statusMessage) : undefined,
          })
        }

        mapped.reverse()
        onMessagesRef.current(chatId, mapped)
      } catch {
        // history is a best-effort sync
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 15000)

    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [credentials, chatId])
}

export function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  if (incoming.length === 0) {
    return current
  }

  const byId = new Map<string, ChatMessage>()
  for (const message of current) {
    byId.set(message.id, message)
  }
  for (const message of incoming) {
    const existing = byId.get(message.id)
    if (!existing) {
      byId.set(message.id, message)
      continue
    }
    byId.set(message.id, {
      ...existing,
      text: message.text || existing.text,
      timestamp: message.timestamp || existing.timestamp,
      direction: existing.direction || message.direction,
      status: message.status || existing.status,
    })
  }

  return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
}

export function upsertChatMessages(
  chats: Chat[],
  chatId: string,
  messages: ChatMessage[],
): Chat[] {
  const index = chats.findIndex((chat) => chat.chatId === chatId)
  if (index === -1) {
    return chats
  }

  const current = chats[index]
  const merged = mergeChatMessages(current.messages, messages)
  if (merged === current.messages || merged.length === current.messages.length) {
    const same = merged.every((message, i) => {
      const prev = current.messages[i]
      return (
        prev &&
        prev.id === message.id &&
        prev.text === message.text &&
        prev.status === message.status
      )
    })
    if (same && merged.length === current.messages.length) {
      return chats
    }
  }

  const updated = { ...current, messages: merged }
  const next = [...chats]
  next[index] = updated
  return next
}
