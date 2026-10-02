import { useState } from 'react'
import type { FormEvent } from 'react'
import { ensureReceiveSettings } from '../api/greenApi'
import type { Credentials } from '../types'
import { MaxLogo } from './MaxLogo'

interface LoginScreenProps {
  onSubmit: (credentials: Credentials) => void
}

export function LoginScreen({ onSubmit }: LoginScreenProps) {
  const [apiUrl, setApiUrl] = useState('')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedUrl = apiUrl.trim().replace(/\/+$/, '')
    const trimmedId = idInstance.trim()
    const trimmedToken = apiTokenInstance.trim()

    if (!trimmedUrl || !trimmedId || !trimmedToken) {
      setError('Заполните все поля')
      return
    }

    try {
      new URL(trimmedUrl)
    } catch {
      setError('Некорректный apiUrl')
      return
    }

    const credentials: Credentials = {
      apiUrl: trimmedUrl,
      idInstance: trimmedId,
      apiTokenInstance: trimmedToken,
    }

    setLoading(true)
    setError('')

    try {
      await ensureReceiveSettings(credentials)
      onSubmit(credentials)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <MaxLogo />
        </div>
        <h1>MAX</h1>
        <p className="login-subtitle">Вход по данным инстанса GREEN-API</p>

        <label>
          apiUrl
          <input
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://XXXX.api.green-api.com"
            autoComplete="off"
          />
        </label>

        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="idInstance"
            autoComplete="off"
          />
        </label>

        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="Токен инстанса"
            autoComplete="off"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Проверка…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
