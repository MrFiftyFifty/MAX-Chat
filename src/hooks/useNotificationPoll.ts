import { useEffect, useRef } from 'react'
import {
  deleteNotification,
  extractIncomingText,
  receiveNotification,
} from '../api/greenApi'
import type { ChatMessage, Credentials, MessageStatus } from '../types'

interface IncomingPayload {
  chatId: string
  message: ChatMessage
  chatName?: string
  phoneNumber?: string
}

interface StatusPayload {
  chatId?: string
  idMessage: string
  status: MessageStatus
}

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

function normalizeStatus(raw?: string): MessageStatus | null {
  if (!raw) {
    return null
  }

  const value = raw.toLowerCase()
  if (value === 'sent' || value === 'delivered' || value === 'read') {
    return value
  }
  if (value === 'failed' || value === 'noaccount' || value === 'notindialog') {
    return 'failed'
  }
  return null
}

function asChatId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return String(value)
}

export function useNotificationPoll(
  credentials: Credentials | null,
  onIncoming: (payload: IncomingPayload) => void,
  onStatus?: (payload: StatusPayload) => void,
  onError?: (message: string | null) => void,
): void {
  const onIncomingRef = useRef(onIncoming)
  const onStatusRef = useRef(onStatus)
  const onErrorRef = useRef(onError)
  onIncomingRef.current = onIncoming
  onStatusRef.current = onStatus
  onErrorRef.current = onError

  useEffect(() => {
    if (!credentials) {
      return
    }

    const controller = new AbortController()
    let active = true

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const loop = async () => {
      while (active) {
        try {
          const notification = await receiveNotification(
            credentials,
            5,
            controller.signal,
          )

          if (!active) {
            break
          }

          onErrorRef.current?.(null)

          if (!notification) {
            continue
          }

          const { receiptId, body } = notification

          try {
            if (body.typeWebhook === 'incomingMessageReceived') {
              const text = extractIncomingText(body) || '[сообщение]'
              const chatId =
                asChatId(body.senderData?.chatId) || asChatId(body.senderData?.sender)

              if (chatId) {
                onIncomingRef.current({
                  chatId,
                  chatName: body.senderData?.chatName || body.senderData?.senderName,
                  phoneNumber: body.senderData?.senderPhoneNumber
                    ? String(body.senderData.senderPhoneNumber)
                    : undefined,
                  message: {
                    id: body.idMessage || `${receiptId}-${Date.now()}`,
                    text,
                    timestamp:
                      (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
                    direction: 'incoming',
                  },
                })
              }
            }

            if (body.typeWebhook === 'outgoingMessageStatus') {
              const status = normalizeStatus(body.status)
              if (status && body.idMessage) {
                onStatusRef.current?.({
                  chatId:
                    asChatId(body.chatId) ||
                    asChatId(body.senderData?.chatId) ||
                    undefined,
                  idMessage: body.idMessage,
                  status,
                })
              }
            }

            if (body.typeWebhook === 'quotaExceeded') {
              onErrorRef.current?.(
                'Лимит тарифа MAX Developer: входящие только от 3 чатов в месяц',
              )
            }
          } finally {
            await deleteNotification(credentials, receiptId, controller.signal)
          }
        } catch (error) {
          if (!active || controller.signal.aborted) {
            break
          }
          if (error instanceof DOMException && error.name === 'AbortError') {
            break
          }

          const message =
            error instanceof Error ? error.message : 'Ошибка получения уведомлений'
          if (/408|timeout|timed out/i.test(message)) {
            onErrorRef.current?.(null)
            continue
          }
          onErrorRef.current?.(message)
          await sleep(3000)
        }
      }
    }

    void loop()

    return () => {
      active = false
      controller.abort()
    }
  }, [credentials])
}

export function canUpgradeStatus(
  current: MessageStatus | undefined,
  next: MessageStatus,
): boolean {
  if (!current) {
    return true
  }
  if (next === 'failed') {
    return current !== 'read' && current !== 'delivered'
  }
  return STATUS_RANK[next] > STATUS_RANK[current]
}
