import type { Chat } from '../types'

interface ForwardDialogProps {
  chats: Chat[]
  excludeChatId: string
  onClose: () => void
  onSelect: (chatId: string) => void
}

export function ForwardDialog({
  chats,
  excludeChatId,
  onClose,
  onSelect,
}: ForwardDialogProps) {
  const targets = chats.filter((chat) => chat.chatId !== excludeChatId)

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-card forward-dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Переслать</h2>
        <p className="dialog-hint">Выберите чат</p>
        {targets.length === 0 ? (
          <p className="form-error">Нет других чатов. Создайте ещё один.</p>
        ) : (
          <ul className="forward-list">
            {targets.map((chat) => (
              <li key={chat.chatId}>
                <button
                  type="button"
                  className="forward-item"
                  onClick={() => onSelect(chat.chatId)}
                >
                  <span className="forward-item-title">{chat.title}</span>
                  <span className="forward-item-sub">{chat.phoneNumber}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
