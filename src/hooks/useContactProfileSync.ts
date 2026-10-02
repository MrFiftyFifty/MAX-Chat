import { useEffect, useRef } from 'react'
import { resolveContactProfile } from '../api/greenApi'
import type { Chat, Credentials } from '../types'

function looksLikePlaceholder(title: string, phoneNumber: string, chatId: string): boolean {
  const value = title.trim()
  if (!value) {
    return true
  }
  if (value === phoneNumber || value === chatId) {
    return true
  }
  return /^\d{10,15}$/.test(value)
}

export function useContactProfileSync(
  credentials: Credentials | null,
  chat: Chat | null,
  onUpdate: (chatId: string, profile: { title?: string; avatarUrl?: string; phoneNumber?: string }) => void,
): void {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const successRef = useRef<Set<string>>(new Set())

  const chatId = chat?.chatId ?? null
  const title = chat?.title ?? ''
  const phoneNumber = chat?.phoneNumber ?? ''
  const avatarUrl = chat?.avatarUrl

  useEffect(() => {
    if (!credentials || !chatId) {
      return
    }

    const needsName = looksLikePlaceholder(title, phoneNumber, chatId)
    const needsAvatar = !avatarUrl
    if (!needsName && !needsAvatar) {
      successRef.current.add(chatId)
      return
    }

    if (successRef.current.has(chatId)) {
      return
    }

    let cancelled = false

    void resolveContactProfile(credentials, chatId)
      .then((profile) => {
        if (cancelled) {
          return
        }
        if (!profile.title && !profile.avatarUrl && !profile.phoneNumber) {
          return
        }
        successRef.current.add(chatId)
        onUpdateRef.current(chatId, profile)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [credentials, chatId, title, phoneNumber, avatarUrl])
}

export function applyContactProfile(
  chats: Chat[],
  chatId: string,
  profile: { title?: string; avatarUrl?: string; phoneNumber?: string },
): Chat[] {
  return chats.map((chat) => {
    if (chat.chatId !== chatId) {
      return chat
    }

    const placeholder = looksLikePlaceholder(chat.title, chat.phoneNumber, chat.chatId)
    const phonePlaceholder =
      !chat.phoneNumber || chat.phoneNumber === chat.chatId

    return {
      ...chat,
      title:
        profile.title && (placeholder || profile.title !== chat.title)
          ? profile.title
          : chat.title,
      avatarUrl: profile.avatarUrl || chat.avatarUrl,
      phoneNumber:
        profile.phoneNumber && phonePlaceholder
          ? profile.phoneNumber
          : chat.phoneNumber,
    }
  })
}
