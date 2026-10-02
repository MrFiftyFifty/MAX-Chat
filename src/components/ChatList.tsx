import { useState } from 'react'
import type { Chat } from '../types'
import { ChatAvatar } from './ChatAvatar'

interface ChatListProps {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onDelete: (chatId: string) => void
  onNewChat: () => void
  onLogout: () => void
}

function lastPreview(chat: Chat): string {
  const last = chat.messages[chat.messages.length - 1]
  return last ? last.text : 'Нет сообщений'
}

function formatTime(chat: Chat): string {
  const last = chat.messages[chat.messages.length - 1]
  if (!last) {
    return ''
  }
  return new Date(last.timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatList({
  chats,
  activeChatId,
  onSelect,
  onDelete,
  onNewChat,
  onLogout,
}: ChatListProps) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const visibleChats = normalized
    ? chats.filter(
        (chat) =>
          chat.title.toLowerCase().includes(normalized) ||
          chat.phoneNumber.includes(normalized),
      )
    : chats

  return (
    <aside className="chat-list">
      <div className="chat-list-header">
        <h1>Чаты</h1>
        <div className="chat-list-actions">
          <button
            type="button"
            className="icon-button"
            onClick={onNewChat}
            title="Новый чат"
            aria-label="Новый чат"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 6v12M6 12h12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button type="button" className="text-button" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </div>

      <input
        className="chat-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Найти"
        aria-label="Найти"
      />

      <div className="chat-list-body">
        {visibleChats.length === 0 ? (
          <p className="empty-hint">
            {chats.length === 0
              ? 'Создайте чат по номеру телефона'
              : 'Ничего не найдено'}
          </p>
        ) : (
          visibleChats.map((chat) => (
            <div
              key={chat.chatId}
              className={`chat-list-item-wrap${activeChatId === chat.chatId ? ' active' : ''}`}
            >
              <button
                type="button"
                className="chat-list-item"
                onClick={() => onSelect(chat.chatId)}
              >
                <ChatAvatar title={chat.title} avatarUrl={chat.avatarUrl} />
                <div className="chat-list-meta">
                  <div className="chat-list-row">
                    <span className="chat-list-title">{chat.title}</span>
                    <span className="chat-list-time">{formatTime(chat)}</span>
                  </div>
                  <span className="chat-list-preview">{lastPreview(chat)}</span>
                </div>
              </button>
              <button
                type="button"
                className="delete-chat-button"
                title="Удалить чат"
                aria-label={`Удалить чат ${chat.title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(chat.chatId)
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M3.5 4.5h9M6 4.5V3.5h4v1M5.5 4.5l.5 8h4l.5-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
