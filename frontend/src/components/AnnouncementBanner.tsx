import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../lib/axios'

const typeConfig: Record<string, any> = {
  INFO:    { icon: Info,          color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  WARNING: { icon: AlertTriangle, color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)'  },
  ERROR:   { icon: AlertCircle,   color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  SUCCESS: { icon: CheckCircle,   color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)'  },
}

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>([])

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements/active').then(r => r.data),
    refetchInterval: 60000, // refresh every minute
  })

  const visible = announcements.filter((a: any) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {visible.map((a: any) => {
        const config = typeConfig[a.type] || typeConfig.INFO
        const Icon = config.icon
        return (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px',
            backgroundColor: config.bg,
            borderBottom: `1px solid ${config.border}`,
          }}>
            <Icon size={15} color={config.color} style={{ flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: '13px', color: config.color, margin: 0, fontWeight: '500' }}>
              {a.message}
            </p>
            <button
              onClick={() => setDismissed(d => [...d, a.id])}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: config.color, padding: '2px', display: 'flex',
                alignItems: 'center', opacity: 0.7, flexShrink: 0
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}