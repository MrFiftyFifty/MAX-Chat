import type { Chat, Credentials } from './types'

const CREDENTIALS_KEY = 'greenapi-credentials'

let credentialsCache: Credentials | null | undefined
const chatsCache = new Map<string, Chat[]>()

function chatsKey(idInstance: string): string {
  return `greenapi-chats-${idInstance}`
}

export function loadCredentials(): Credentials | null {
  if (credentialsCache !== undefined) {
    return credentialsCache
  }

  const raw = sessionStorage.getItem(CREDENTIALS_KEY)
  if (!raw) {
    credentialsCache = null
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Credentials
    if (!parsed.apiUrl || !parsed.idInstance || !parsed.apiTokenInstance) {
      credentialsCache = null
      return null
    }
    credentialsCache = parsed
    return parsed
  } catch {
    credentialsCache = null
    return null
  }
}

export function saveCredentials(credentials: Credentials): void {
  sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
  credentialsCache = credentials
}

export function clearCredentials(): void {
  sessionStorage.removeItem(CREDENTIALS_KEY)
  credentialsCache = null
}

export function loadChats(idInstance: string): Chat[] {
  const cached = chatsCache.get(idInstance)
  if (cached) {
    return cached
  }

  const raw = localStorage.getItem(chatsKey(idInstance))
  if (!raw) {
    chatsCache.set(idInstance, [])
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Chat[]
    const chats = Array.isArray(parsed) ? parsed : []
    chatsCache.set(idInstance, chats)
    return chats
  } catch {
    chatsCache.set(idInstance, [])
    return []
  }
}

export function saveChats(idInstance: string, chats: Chat[]): void {
  localStorage.setItem(chatsKey(idInstance), JSON.stringify(chats))
  chatsCache.set(idInstance, chats)
}
