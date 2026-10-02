import { useMemo, useState, useTransition } from 'react'
import type { Chat, Credentials } from '../types'
import { ChatList } from './ChatList'
import { ChatView } from './ChatView'
import { NewChatDialog } from './NewChatDialog'

interface ChatLayoutProps {
  credentials: Credentials
  chats: Chat[]
  activeChatId: string | null
  sending: boolean
  sendError: string
  receiveError: string | null
  onSelectChat: (chatId: string) => void
  onCreateChat: (chat: {
    chatId: string
    phoneNumber: string
    title: string
    avatarUrl?: string
  }) => void
  onDeleteChat: (chatId: string) => void
  onSend: (text: string) => Promise<void>
  onLogout: () => void
}

export function ChatLayout({
  credentials,
  chats,
  activeChatId,
  sending,
  sendError,
  receiveError,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onSend,
  onLogout,
}: ChatLayoutProps) {
  const [showNewChat, setShowNewChat] = useState(false)
  const [, startSelect] = useTransition()

  const chatsById = useMemo(() => {
    const map = new Map<string, Chat>()
    for (const chat of chats) {
      map.set(chat.chatId, chat)
    }
    return map
  }, [chats])

  const activeChat = activeChatId ? chatsById.get(activeChatId) ?? null : null

  return (
    <div className="app-shell">
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        onSelect={(chatId) => {
          startSelect(() => {
            onSelectChat(chatId)
          })
        }}
        onDelete={onDeleteChat}
        onNewChat={() => setShowNewChat(true)}
        onLogout={onLogout}
      />
      <div className="chat-column">
        {receiveError ? <p className="receive-error">{receiveError}</p> : null}
        <ChatView
          chat={activeChat}
          sending={sending}
          error={sendError}
          onSend={onSend}
        />
      </div>
      {showNewChat ? (
        <NewChatDialog
          credentials={credentials}
          onClose={() => setShowNewChat(false)}
          onCreated={onCreateChat}
        />
      ) : null}
    </div>
  )
}
