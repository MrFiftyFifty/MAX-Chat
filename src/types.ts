export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ChatMessage {
  id: string
  text: string
  timestamp: number
  direction: 'outgoing' | 'incoming'
  status?: MessageStatus
}

export interface Chat {
  chatId: string
  phoneNumber: string
  title: string
  avatarUrl?: string
  messages: ChatMessage[]
}

export interface CheckAccountResponse {
  exist: boolean
  chatId: string
  fromCache?: boolean
  status?: boolean
  reason?: string
}

export interface ContactInfoResponse {
  avatar?: string
  name?: string
  contactName?: string
  chatId?: string
  chatType?: string
  lastSeen?: number | null
  phoneNumber?: number
}

export interface AvatarResponse {
  urlAvatar?: string
}

export interface ContactProfile {
  title?: string
  avatarUrl?: string
  phoneNumber?: string
}

export interface SendMessageResponse {
  idMessage: string
}

export interface NotificationBody {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  chatId?: string
  status?: string
  senderData?: {
    chatId?: string
    chatName?: string
    sender?: string
    senderName?: string
    senderPhoneNumber?: number
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: {
      textMessage?: string
    }
    extendedTextMessageData?: {
      text?: string
    }
  }
}

export interface ReceiveNotificationResponse {
  receiptId: number
  body: NotificationBody
}
