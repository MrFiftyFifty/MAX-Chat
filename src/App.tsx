import { useCallback, useEffect, useMemo, useState } from 'react'
import { ensureReceiveSettings, resolveContactProfile, sendMessage } from './api/greenApi'
import { ChatLayout } from './components/ChatLayout'
import { LoginScreen } from './components/LoginScreen'
import {
  upsertChatMessages,
  useChatHistorySync,
} from './hooks/useChatHistorySync'
import {
  applyContactProfile,
  useContactProfileSync,
} from './hooks/useContactProfileSync'
import {
  canUpgradeStatus,
  useNotificationPoll,
} from './hooks/useNotificationPoll'
import {
  clearCredentials,
  loadChats,
  loadCredentials,
  saveChats,
  saveCredentials,
} from './storage'
import type { Chat, ChatMessage, Credentials } from './types'
import './styles.css'

function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    loadCredentials(),
  )
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = loadCredentials()
    return saved ? loadChats(saved.idInstance) : []
  })
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [receiveError, setReceiveError] = useState<string | null>(null)

  const activeChat = useMemo(
    () => chats.find((chat) => chat.chatId === activeChatId) ?? null,
    [chats, activeChatId],
  )

  useEffect(() => {
    if (credentials) {
      saveChats(credentials.idInstance, chats)
    }
  }, [chats, credentials])

  useEffect(() => {
    if (!credentials) {
      return
    }
    void ensureReceiveSettings(credentials).catch(() => undefined)
  }, [credentials])

  const handleLogin = (next: Credentials) => {
    saveCredentials(next)
    setCredentials(next)
    setChats(loadChats(next.idInstance))
    setActiveChatId(null)
    setSendError('')
    setReceiveError(null)
  }

  const handleLogout = () => {
    clearCredentials()
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setSendError('')
    setReceiveError(null)
  }

  const handleProfileUpdate = useCallback(
    (
      chatId: string,
      profile: { title?: string; avatarUrl?: string; phoneNumber?: string },
    ) => {
      setChats((prev) => applyContactProfile(prev, chatId, profile))
    },
    [],
  )

  useContactProfileSync(credentials, activeChat, handleProfileUpdate)

  const handleCreateChat = (chat: {
    chatId: string
    phoneNumber: string
    title: string
    avatarUrl?: string
  }) => {
    setChats((prev) => {
      const existing = prev.find((item) => item.chatId === chat.chatId)
      if (existing) {
        return prev.map((item) =>
          item.chatId === chat.chatId
            ? {
                ...item,
                title: chat.title || item.title,
                phoneNumber: chat.phoneNumber || item.phoneNumber,
                avatarUrl: chat.avatarUrl || item.avatarUrl,
              }
            : item,
        )
      }
      return [
        {
          chatId: chat.chatId,
          phoneNumber: chat.phoneNumber,
          title: chat.title,
          avatarUrl: chat.avatarUrl,
          messages: [],
        },
        ...prev,
      ]
    })
    setActiveChatId(chat.chatId)
  }

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.chatId !== chatId))
    setActiveChatId((current) => (current === chatId ? null : current))
    setSendError('')
  }

  const handleIncoming = useCallback(
    (payload: {
      chatId: string
      message: ChatMessage
      chatName?: string
      phoneNumber?: string
    }) => {
      setChats((prev) => {
        let index = prev.findIndex((chat) => chat.chatId === payload.chatId)
        if (index === -1 && payload.phoneNumber) {
          index = prev.findIndex((chat) => chat.phoneNumber === payload.phoneNumber)
        }

        if (index === -1) {
          const created: Chat = {
            chatId: payload.chatId,
            phoneNumber: payload.phoneNumber || payload.chatId,
            title: payload.chatName || payload.phoneNumber || payload.chatId,
            messages: [payload.message],
          }
          return [created, ...prev]
        }

        const current = prev[index]
        if (current.messages.some((message) => message.id === payload.message.id)) {
          return prev
        }

        const updated: Chat = {
          ...current,
          chatId: payload.chatId,
          title: payload.chatName || current.title,
          phoneNumber: payload.phoneNumber || current.phoneNumber,
          messages: [...current.messages, payload.message],
        }

        const next = [...prev]
        next.splice(index, 1)
        return [updated, ...next]
      })

      if (credentials) {
        void resolveContactProfile(credentials, payload.chatId)
          .then((profile) => {
            if (profile.title || profile.avatarUrl || profile.phoneNumber) {
              setChats((prev) => applyContactProfile(prev, payload.chatId, profile))
            }
          })
          .catch(() => undefined)
      }
    },
    [credentials],
  )

  const handleStatus = useCallback(
    (payload: {
      chatId?: string
      idMessage: string
      status: ChatMessage['status']
    }) => {
      if (!payload.status) {
        return
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (payload.chatId && chat.chatId !== payload.chatId) {
            return chat
          }

          let changed = false
          const messages = chat.messages.map((message) => {
            if (message.id !== payload.idMessage || message.direction !== 'outgoing') {
              return message
            }
            if (!canUpgradeStatus(message.status, payload.status!)) {
              return message
            }
            changed = true
            return { ...message, status: payload.status }
          })

          return changed ? { ...chat, messages } : chat
        }),
      )
    },
    [],
  )

  const handleHistoryMessages = useCallback((chatId: string, messages: ChatMessage[]) => {
    setChats((prev) => upsertChatMessages(prev, chatId, messages))
  }, [])

  useNotificationPoll(credentials, handleIncoming, handleStatus, setReceiveError)
  useChatHistorySync(credentials, activeChatId, handleHistoryMessages)

  const handleSend = async (text: string) => {
    if (!credentials || !activeChatId) {
      return
    }

    setSending(true)
    setSendError('')

    try {
      const response = await sendMessage(credentials, activeChatId, text)
      const message: ChatMessage = {
        id: response.idMessage,
        text,
        timestamp: Date.now(),
        direction: 'outgoing',
        status: 'sent',
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === activeChatId
            ? { ...chat, messages: [...chat.messages, message] }
            : chat,
        ),
      )
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Не удалось отправить')
    } finally {
      setSending(false)
    }
  }

  if (!credentials) {
    return <LoginScreen onSubmit={handleLogin} />
  }

  return (
    <ChatLayout
      credentials={credentials}
      chats={chats}
      activeChatId={activeChatId}
      sending={sending}
      sendError={sendError}
      receiveError={receiveError}
      onSelectChat={setActiveChatId}
      onCreateChat={handleCreateChat}
      onDeleteChat={handleDeleteChat}
      onSend={handleSend}
      onLogout={handleLogout}
    />
  )
}

export default App
