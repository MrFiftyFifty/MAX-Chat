import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Chat, MessageStatus } from '../types'
import { ChatAvatar } from './ChatAvatar'

interface ChatViewProps {
  chat: Chat | null
  sending: boolean
  error: string
  onSend: (text: string) => Promise<void>
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageTicks({ status }: { status?: MessageStatus }) {
  if (!status || status === 'pending') {
    return <span className="message-ticks pending" aria-label="Отправляется">…</span>
  }

  if (status === 'failed') {
    return <span className="message-ticks failed" aria-label="Ошибка">!</span>
  }

  if (status === 'sent') {
    return (
      <span className="message-ticks sent" aria-label="Отправлено">
        <svg viewBox="0 0 12 11" width="14" height="12" aria-hidden="true">
          <path
            d="M1.2 5.6 4.1 8.5 10.5 1.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  const label = status === 'read' ? 'Прочитано' : 'Доставлено'
  return (
    <span className={`message-ticks ${status}`} aria-label={label}>
      <svg viewBox="0 0 16 11" width="18" height="12" aria-hidden="true">
        <path
          d="M1 5.6 3.9 8.5 10.3 1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.2 5.6 8.1 8.5 14.5 1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function ChatView({ chat, sending, error, onSend }: ChatViewProps) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const messageCount = chat?.messages.length ?? 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageCount, chat?.chatId])

  if (!chat) {
    return (
      <section className="chat-view empty-view">
        <p>Выберите чат или создайте новый</p>
      </section>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) {
      return
    }
    await onSend(trimmed)
    setText('')
  }

  return (
    <section className="chat-view">
      <header className="chat-view-header">
        <ChatAvatar title={chat.title} avatarUrl={chat.avatarUrl} />
        <div>
          <h2>{chat.title}</h2>
          <p className="chat-subtitle">{chat.phoneNumber}</p>
        </div>
      </header>

      <div className="message-list">
        {chat.messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}
          >
            <div className={`message-bubble ${message.direction === 'outgoing' ? 'outgoing' : 'incoming'}`}>
              <p>{message.text}</p>
              <span className="message-meta">
                <span className="message-time">{formatMessageTime(message.timestamp)}</span>
                {message.direction === 'outgoing' ? (
                  <MessageTicks status={message.status} />
                ) : null}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="chat-send-error">{error}</p> : null}

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Сообщение"
          maxLength={4000}
          disabled={sending}
        />
        <button
          type="submit"
          className="send-button"
          disabled={sending || !text.trim()}
          aria-label="Отправить"
        >
          {sending ? (
            <span className="send-button-loading">…</span>
          ) : (
            <svg
              className="send-button-icon"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
            >
              <path
                d="M5 12h12M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>
    </section>
  )
}
