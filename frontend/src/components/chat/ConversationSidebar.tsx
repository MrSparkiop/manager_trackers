import { Search, MessageSquare } from 'lucide-react'
import type { Conversation, ChatUser } from '../../types'

interface Props {
  conversations: Conversation[]
  activeConvId: string | null
  onSelectConv: (id: string) => void
  onlineUsers: Set<string>
  currentUserId: string
  showNewChat: boolean
  setShowNewChat: (b: boolean) => void
  searchUsers: string
  setSearchUsers: (s: string) => void
  chatUsers: ChatUser[]
  onStartConversation: (userId: string) => void
  isMobile: boolean
  colors: Record<string, string>
  accent: string
  accentText: string
  avatarBg: string
  avatarIsGradient: boolean
  activeConvBg: string
  chatFont: string
  inputRadius: string
  borderStyle?: string
  themeBorder: string
}

export function ConversationSidebar({
  conversations, activeConvId, onSelectConv, onlineUsers, currentUserId,
  showNewChat, setShowNewChat, searchUsers, setSearchUsers, chatUsers,
  onStartConversation, isMobile, colors, accent, accentText,
  avatarBg, avatarIsGradient, activeConvBg, chatFont, inputRadius,
  borderStyle, themeBorder,
}: Props) {
  const getOtherUser = (conv: Conversation) =>
    conv.participants.find(p => p.userId !== currentUserId)?.user

  return (
    <div style={{
      width: isMobile ? '100%' : '320px', minWidth: isMobile ? '100%' : '320px',
      backgroundColor: colors.card, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${colors.border}`, minHeight: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.text, margin: 0 }}>Messages</h2>
          <button onClick={() => setShowNewChat(!showNewChat)} style={{
            backgroundColor: accent, color: accentText,
            border: borderStyle ? `${borderStyle} ${themeBorder}` : 'none',
            borderRadius: inputRadius, padding: '6px 12px', fontSize: '12px',
            fontWeight: '600', cursor: 'pointer', fontFamily: chatFont,
          }}>
            + New Chat
          </button>
        </div>
      </div>

      {/* New Chat User Search */}
      {showNewChat && (
        <div style={{ padding: '12px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.subBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.input, borderRadius: '8px', padding: '8px 10px', border: `1px solid ${colors.inputBorder}` }}>
            <Search size={14} color={colors.textMuted} />
            <input
              value={searchUsers}
              onChange={e => setSearchUsers(e.target.value)}
              placeholder="Search PRO users..."
              style={{ background: 'none', border: 'none', color: colors.text, fontSize: '13px', outline: 'none', width: '100%' }}
            />
          </div>
          <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {chatUsers.map(u => (
              <button key={u.id} onClick={() => onStartConversation(u.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '8px', borderRadius: inputRadius, border: 'none', cursor: 'pointer',
                backgroundColor: 'transparent', color: colors.text, textAlign: 'left', fontFamily: chatFont,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: avatarIsGradient ? avatarBg : undefined,
                  backgroundColor: avatarIsGradient ? undefined : accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700', color: accentText, flexShrink: 0,
                }}>
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0 }}>{u.firstName} {u.lastName}</p>
                  <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0 }}>{u.email}</p>
                </div>
              </button>
            ))}
            {chatUsers.length === 0 && searchUsers && (
              <p style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', padding: '12px' }}>No PRO users found</p>
            )}
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.textMuted }}>
            <MessageSquare size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', margin: 0 }}>No conversations yet</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Start chatting with a PRO user</p>
          </div>
        ) : conversations.map(conv => {
          const other = getOtherUser(conv)
          if (!other) return null
          const isActive = conv.id === activeConvId
          const lastMsg = conv.lastMessage
          return (
            <button key={conv.id} onClick={() => onSelectConv(conv.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
              padding: '14px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
              backgroundColor: isActive ? activeConvBg : 'transparent',
              borderBottom: `1px solid ${colors.border}`,
              color: colors.text, transition: 'background 0.1s', fontFamily: chatFont,
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: avatarIsGradient ? avatarBg : undefined,
                  backgroundColor: avatarIsGradient ? undefined : accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', color: accentText,
                }}>
                  {other.firstName[0]}{other.lastName[0]}
                </div>
                {onlineUsers.has(other.id) && (
                  <span style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: '#22c55e', border: `2px solid ${colors.card}`,
                  }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{
                    fontSize: '13px', fontWeight: conv.unreadCount > 0 ? '700' : '500', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {other.firstName} {other.lastName}
                  </p>
                  {lastMsg && (
                    <span style={{ fontSize: '10px', color: colors.textMuted, flexShrink: 0 }}>
                      {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastMsg?.type === 'CALL' ? '📞 ' + lastMsg.content
                      : lastMsg?.type === 'VOICE' ? '🎙 Voice message'
                      : lastMsg?.deletedAt ? 'Message deleted'
                      : lastMsg?.content || 'No messages yet'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      backgroundColor: accent, color: accentText, borderRadius: '999px',
                      padding: '1px 6px', fontSize: '10px', fontWeight: '700', flexShrink: 0,
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
