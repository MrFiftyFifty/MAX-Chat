import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  checkAccount,
  isValidPhone,
  normalizePhone,
  resolveContactProfile,
} from '../api/greenApi'
import type { Credentials } from '../types'

interface NewChatDialogProps {
  credentials: Credentials
  onClose: () => void
  onCreated: (chat: {
    chatId: string
    phoneNumber: string
    title: string
    avatarUrl?: string
  }) => void
}

export function NewChatDialog({
  credentials,
  onClose,
  onCreated,
}: NewChatDialogProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const digits = normalizePhone(phone)

    if (!isValidPhone(digits)) {
      setError('Номер должен быть РФ (7XXXXXXXXXX) или РБ (375XXXXXXXXX)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await checkAccount(credentials, Number(digits))

      if (result.status === false) {
        setError(result.reason || 'Инстанс недоступен')
        return
      }

      if (!result.exist || !result.chatId) {
        setError('Аккаунт MAX на этом номере не найден')
        return
      }

      const chatId = String(result.chatId)
      const profile = await resolveContactProfile(credentials, chatId)

      onCreated({
        chatId,
        phoneNumber: profile.phoneNumber || digits,
        title: profile.title || digits,
        avatarUrl: profile.avatarUrl,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка проверки номера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form
        className="dialog-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>Новый чат</h2>
        <p className="dialog-hint">Номер получателя в международном формате</p>

        <label>
          Телефон
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="79991234567"
            autoFocus
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Проверка…' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  )
}
