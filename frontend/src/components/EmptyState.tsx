import { type ComponentProps } from 'react'

type IconComponent = React.ComponentType<{ size?: number; color?: string } & ComponentProps<'svg'>>

interface EmptyStateProps {
  icon: IconComponent
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  isDark: boolean
  color?: string
}

export default function EmptyState({ icon: Icon, title, description, action, isDark, color = '#6366f1' }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        margin: '0 auto 20px',
        background: `linear-gradient(135deg, ${color}30, ${color}15)`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={32} color={color} />
      </div>
      <h3 style={{
        fontSize: '18px', fontWeight: '700',
        color: isDark ? '#ffffff' : '#0f172a',
        margin: '0 0 8px'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '14px', color: isDark ? '#64748b' : '#94a3b8',
        margin: '0 0 24px', maxWidth: '300px', marginLeft: 'auto',
        marginRight: 'auto', lineHeight: '1.6'
      }}>
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} style={{
          padding: '10px 24px',
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          border: 'none', borderRadius: '10px', color: '#fff',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}>
          {action.label}
        </button>
      )}
    </div>
  )
}