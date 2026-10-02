import type {
  AvatarResponse,
  CheckAccountResponse,
  ContactInfoResponse,
  ContactProfile,
  Credentials,
  ReceiveNotificationResponse,
  SendMessageResponse,
} from '../types'

export interface InstanceSettings {
  webhookUrl?: string
  webhookUrlToken?: string
  incomingWebhook?: string
  outgoingWebhook?: string
  outgoingMessageWebhook?: string
  outgoingAPIMessageWebhook?: string
  stateWebhook?: string
  editedMessageWebhook?: string
  deletedMessageWebhook?: string
  pollMessageWebhook?: string
  typeInstance?: string
}

export interface JournalMessage {
  type?: 'incoming' | 'outgoing'
  idMessage?: string
  timestamp?: number
  typeMessage?: string
  chatId?: string
  textMessage?: string
  senderId?: string
  senderName?: string
  senderContactName?: string
  statusMessage?: string
  extendedTextMessage?: { text?: string }
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function buildUrl(
  credentials: Credentials,
  method: string,
  extraPath = '',
  query = '',
): string {
  const base = trimSlash(credentials.apiUrl)
  const path = `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${extraPath}`
  return query ? `${path}?${query}` : path
}

async function parseError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) {
    return `HTTP ${response.status}`
  }

  try {
    const json = JSON.parse(text) as { message?: string; error?: string }
    return json.message || json.error || text
  } catch {
    return text
  }
}

export async function checkAccount(
  credentials: Credentials,
  phoneNumber: number,
): Promise<CheckAccountResponse> {
  const response = await fetch(buildUrl(credentials, 'checkAccount'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as CheckAccountResponse
}

export async function getContactInfo(
  credentials: Credentials,
  chatId: string,
): Promise<ContactInfoResponse> {
  const response = await fetch(buildUrl(credentials, 'getContactInfo'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: String(chatId) }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as ContactInfoResponse
}

export async function getAvatar(
  credentials: Credentials,
  chatId: string,
): Promise<AvatarResponse> {
  const response = await fetch(buildUrl(credentials, 'getAvatar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: String(chatId) }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as AvatarResponse
}

export async function resolveContactProfile(
  credentials: Credentials,
  chatId: string,
): Promise<ContactProfile> {
  const profile: ContactProfile = {}

  try {
    const contact = await getContactInfo(credentials, chatId)
    const maxName = contact.name?.trim()
    const bookName = contact.contactName?.trim()
    profile.title = maxName || bookName || undefined
    profile.avatarUrl = contact.avatar?.trim() || undefined
    if (contact.phoneNumber && contact.phoneNumber > 0) {
      profile.phoneNumber = String(contact.phoneNumber)
    }
  } catch {
    // continue with avatar fallback
  }

  if (!profile.avatarUrl) {
    try {
      const avatar = await getAvatar(credentials, chatId)
      const url = avatar.urlAvatar?.trim()
      if (url) {
        profile.avatarUrl = url
      }
    } catch {
      // keep empty avatar
    }
  }

  return profile
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  const response = await fetch(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as SendMessageResponse
}

export async function getSettings(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<InstanceSettings> {
  const response = await fetch(buildUrl(credentials, 'getSettings'), {
    method: 'GET',
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as InstanceSettings
}

export async function setSettings(
  credentials: Credentials,
  settings: Partial<InstanceSettings>,
): Promise<void> {
  const response = await fetch(buildUrl(credentials, 'setSettings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function ensureReceiveSettings(
  credentials: Credentials,
): Promise<void> {
  const current = await getSettings(credentials)
  const needsUpdate =
    Boolean(current.webhookUrl) ||
    current.incomingWebhook !== 'yes' ||
    current.outgoingWebhook !== 'yes' ||
    current.stateWebhook !== 'yes'

  if (!needsUpdate) {
    return
  }

  await setSettings(credentials, {
    webhookUrl: '',
    webhookUrlToken: '',
    incomingWebhook: 'yes',
    outgoingWebhook: 'yes',
    stateWebhook: 'yes',
  })
}

export async function lastIncomingMessages(
  credentials: Credentials,
  minutes = 1440,
  signal?: AbortSignal,
): Promise<JournalMessage[]> {
  const response = await fetch(
    buildUrl(credentials, 'lastIncomingMessages', '', `minutes=${minutes}`),
    { method: 'GET', signal },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const text = await response.text()
  if (!text || text === 'null') {
    return []
  }

  const parsed = JSON.parse(text) as JournalMessage[]
  return Array.isArray(parsed) ? parsed : []
}

export async function getChatHistory(
  credentials: Credentials,
  chatId: string,
  count = 100,
  signal?: AbortSignal,
): Promise<JournalMessage[]> {
  const response = await fetch(buildUrl(credentials, 'getChatHistory'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, count }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const text = await response.text()
  if (!text || text === 'null') {
    return []
  }

  const parsed = JSON.parse(text) as JournalMessage[]
  return Array.isArray(parsed) ? parsed : []
}

export function journalText(item: JournalMessage): string | null {
  const direct = item.textMessage?.trim() || item.extendedTextMessage?.text?.trim()
  if (direct) {
    return direct
  }
  if (item.typeMessage && item.typeMessage !== 'textMessage') {
    return `[${item.typeMessage}]`
  }
  return null
}

export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout = 5,
  signal?: AbortSignal,
): Promise<ReceiveNotificationResponse | null> {
  const timeout = Math.min(60, Math.max(5, receiveTimeout))
  const response = await fetch(
    buildUrl(credentials, 'receiveNotification', '', `receiveTimeout=${timeout}`),
    {
      method: 'GET',
      signal,
    },
  )

  if (response.status === 408) {
    return null
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const text = await response.text()
  if (!text || text === 'null') {
    return null
  }

  return JSON.parse(text) as ReceiveNotificationResponse
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    buildUrl(credentials, 'deleteNotification', `/${receiptId}`),
    {
      method: 'DELETE',
      signal,
    },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }
  return digits
}

export function isValidPhone(digits: string): boolean {
  return (
    (digits.length === 11 && digits.startsWith('7')) ||
    (digits.length === 12 && digits.startsWith('375'))
  )
}

export function extractIncomingText(body: {
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
    quotedMessage?: {
      textMessage?: string
      extendedTextMessage?: { text?: string }
    }
  }
}): string | null {
  const data = body.messageData
  if (!data) {
    return null
  }

  const direct =
    data.textMessageData?.textMessage?.trim() ||
    data.extendedTextMessageData?.text?.trim()
  if (direct) {
    return direct
  }

  const quoted =
    data.quotedMessage?.textMessage?.trim() ||
    data.quotedMessage?.extendedTextMessage?.text?.trim()
  if (quoted) {
    return quoted
  }

  if (data.typeMessage && data.typeMessage !== 'textMessage') {
    return `[${data.typeMessage}]`
  }

  return null
}
