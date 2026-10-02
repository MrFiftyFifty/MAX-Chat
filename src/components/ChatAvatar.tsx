import { useState } from 'react'

interface ChatAvatarProps {
  title: string
  avatarUrl?: string
}

export function ChatAvatar({ title, avatarUrl }: ChatAvatarProps) {
  const [broken, setBroken] = useState(false)
  const letter = (title || '?').trim().slice(0, 1).toUpperCase() || '?'

  if (avatarUrl && !broken) {
    return (
      <img
        className="chat-avatar chat-avatar-image"
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  }

  return <div className="chat-avatar">{letter}</div>
}
