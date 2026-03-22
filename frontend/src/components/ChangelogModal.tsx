import { useState, useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'
import { useColors } from '../lib/useColors'
import api from '../lib/axios'

interface ChangelogEntry {
  id: string
  version: string
  title: string
  content: string
  publishedAt: string
}

export default function ChangelogModal() {
  const { isDark } = useThemeStore()
  const colors = useColors(isDark)
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get('/changelog').then(res => {
      if (res.data && res.data.length > 0) {
        setEntries(res.data)
        setOpen(true)
      }
    }).catch(() => {})
  }, [])

  const handleDismiss = async () => {
    try {
      await api.post('/changelog/mark-seen')
    } catch {}
    setOpen(false)
  }

  if (!open || entries.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          width: '90%',
          maxWidth: '520px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              <span role="img" aria-label="sparkles" style={{ lineHeight: 1 }}>&#9733;</span>
            </div>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.text,
                margin: 0,
              }}>
                What's New
              </h2>
              <p style={{
                fontSize: '13px',
                color: colors.textMuted,
                margin: '2px 0 0',
              }}>
                Latest updates and improvements
              </p>
            </div>
          </div>
        </div>

        {/* Entries */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              padding: '16px',
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
              }}>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  color: '#818cf8',
                }}>
                  v{entry.version}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: colors.textMuted,
                }}>
                  {new Date(entry.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: '600',
                color: colors.text,
                margin: '0 0 6px',
              }}>
                {entry.title}
              </h3>
              <p style={{
                fontSize: '13px',
                color: colors.textMuted,
                margin: 0,
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}>
                {entry.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
