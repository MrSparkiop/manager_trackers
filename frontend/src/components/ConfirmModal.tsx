import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X, Trash2, Shield } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string        // text user must type
  actionLabel?: string        // button label
  variant?: 'danger' | 'warning'
  isLoading?: boolean
  isDark: boolean
}

export default function ConfirmModal({
  isOpen, onClose, onConfirm, title, description,
  confirmText, actionLabel = 'Confirm', variant = 'danger',
  isLoading = false, isDark
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const colors = {
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    textMuted: isDark ? '#64748b' : '#94a3b8',
    subBg:     isDark ? '#1e293b' : '#f8fafc',
    input:     isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const accentColor = variant === 'danger' ? '#ef4444' : '#f59e0b'
  const accentBg    = variant === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'
  const accentBorder = variant === 'danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'
  const Icon = variant === 'danger' ? Trash2 : Shield

  // Reset typed when opened
  useEffect(() => {
    if (isOpen) {
      setTyped('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  const isConfirmed = confirmText ? typed === confirmText : true
  const canSubmit   = isConfirmed && !isLoading

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: colors.card, borderRadius: '20px',
        border: `1px solid ${colors.border}`,
        padding: '32px', width: '100%', maxWidth: '440px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        animation: 'slideDown 0.2s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
              backgroundColor: accentBg, border: `1px solid ${accentBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={22} color={accentColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: colors.text, margin: 0 }}>
                {title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                <AlertTriangle size={11} color={accentColor} />
                <span style={{ fontSize: '11px', color: accentColor, fontWeight: '600' }}>
                  {variant === 'danger' ? 'This action cannot be undone' : 'Proceed with caution'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: colors.textMuted, padding: '2px', flexShrink: 0
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p style={{
          fontSize: '14px', color: colors.textMuted, margin: '0 0 20px',
          lineHeight: '1.6', backgroundColor: colors.subBg,
          padding: '12px 14px', borderRadius: '10px',
          border: `1px solid ${colors.border}`
        }}>
          {description}
        </p>

        {/* Confirmation input */}
        {confirmText && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
              Type{' '}
              <code style={{
                fontSize: '13px', fontWeight: '700', color: accentColor,
                backgroundColor: accentBg, padding: '1px 6px', borderRadius: '5px',
                fontFamily: 'monospace'
              }}>
                {confirmText}
              </code>
              {' '}to confirm:
            </label>
            <input
              ref={inputRef}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onConfirm() }}
              placeholder={`Type "${confirmText}" here`}
              style={{
                width: '100%', backgroundColor: colors.input,
                border: `1px solid ${typed && !isConfirmed ? accentColor : isConfirmed && typed ? '#4ade80' : colors.inputBorder}`,
                borderRadius: '10px', padding: '10px 14px',
                color: colors.text, fontSize: '14px', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
                fontFamily: 'monospace',
              }}
            />
            {typed && !isConfirmed && (
              <p style={{ fontSize: '11px', color: accentColor, margin: '5px 0 0' }}>
                ✗ Doesn't match — type exactly: {confirmText}
              </p>
            )}
            {isConfirmed && typed && (
              <p style={{ fontSize: '11px', color: '#4ade80', margin: '5px 0 0' }}>
                ✓ Confirmed
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: '10px',
            backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
            color: colors.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: '500'
          }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canSubmit}
            style={{
              flex: 1, padding: '11px', borderRadius: '10px', border: 'none',
              backgroundColor: canSubmit ? accentColor : colors.subBg,
              color: canSubmit ? '#fff' : colors.textMuted,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontSize: '14px', fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', animation: 'spin 0.6s linear infinite'
                }} />
                Processing...
              </>
            ) : (
              <>{actionLabel}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}