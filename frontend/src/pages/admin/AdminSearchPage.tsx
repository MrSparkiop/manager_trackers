import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { Search, Users, CheckSquare, FolderKanban, Crown, Ban } from 'lucide-react'
import api from '../../lib/axios'

export default function AdminSearchPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || query.length < 2) return
    setLoading(true)
    try {
      const res = await api.get(`/admin/search?q=${encodeURIComponent(query)}`)
      setResults(res.data)
    } finally {
      setLoading(false)
    }
  }

  const totalResults = results
    ? (results.users?.length || 0) + (results.tasks?.length || 0) + (results.projects?.length || 0)
    : 0

  const statusColors: Record<string, string> = {
    TODO: '#64748b', IN_PROGRESS: '#60a5fa', DONE: '#4ade80',
    CANCELLED: '#f87171', HIGH: '#fb923c', URGENT: '#f87171',
    MEDIUM: '#facc15', LOW: '#64748b',
    ACTIVE: '#34d399', COMPLETED: '#4ade80', ARCHIVED: '#64748b', ON_HOLD: '#fb923c',
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
          Global Search
        </h1>
        <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
          Search across all users, tasks and projects
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '28px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search users, tasks, projects..."
            autoFocus
            style={{
              width: '100%', padding: '12px 16px 12px 42px',
              backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
              borderRadius: '12px', color: colors.text, fontSize: '15px', outline: 'none',
              boxSizing: 'border-box' as const,
            }}
            onFocus={e => e.target.style.borderColor = '#ef4444'}
            onBlur={e => e.target.style.borderColor = colors.inputBorder}
          />
        </div>
        <button type="submit" disabled={loading} style={{
          padding: '12px 24px', backgroundColor: '#ef4444', border: 'none',
          borderRadius: '12px', color: '#fff', fontSize: '15px',
          fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}>
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {results && (
        <>
          <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '20px' }}>
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Users */}
            {results.users?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Users size={14} color="#60a5fa" />
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Users ({results.users.length})
                  </h3>
                </div>
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {results.users.map((u: any) => (
                    <div key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
                        cursor: 'pointer', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.subBg}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '700', color: '#fff'
                      }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>
                            {u.firstName} {u.lastName}
                          </span>
                          {u.role === 'ADMIN' && <Crown size={11} color="#f87171" />}
                          {u.isSuspended && <Ban size={11} color="#f87171" />}
                        </div>
                        <span style={{ fontSize: '11px', color: colors.textMuted }}>{u.email}</span>
                      </div>
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                        backgroundColor: u.isSuspended ? 'rgba(248,113,113,0.15)' : 'rgba(99,102,241,0.15)',
                        color: u.isSuspended ? '#f87171' : '#818cf8', fontWeight: '600'
                      }}>
                        {u.isSuspended ? 'Suspended' : u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {results.tasks?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <CheckSquare size={14} color="#34d399" />
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tasks ({results.tasks.length})
                  </h3>
                </div>
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {results.tasks.map((t: any) => (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{t.title}</span>
                        <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>
                          by {t.user.firstName} {t.user.lastName}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                          backgroundColor: (statusColors[t.status] || '#64748b') + '20',
                          color: statusColors[t.status] || '#64748b', fontWeight: '600'
                        }}>{t.status}</span>
                        <span style={{
                          fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                          backgroundColor: (statusColors[t.priority] || '#64748b') + '20',
                          color: statusColors[t.priority] || '#64748b', fontWeight: '600'
                        }}>{t.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {results.projects?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <FolderKanban size={14} color="#a78bfa" />
                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Projects ({results.projects.length})
                  </h3>
                </div>
                <div style={{ backgroundColor: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                  {results.projects.map((p: any) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
                    }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: colors.text }}>{p.name}</span>
                        <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>
                          by {p.user.firstName} {p.user.lastName}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                        backgroundColor: (statusColors[p.status] || '#64748b') + '20',
                        color: statusColors[p.status] || '#64748b', fontWeight: '600'
                      }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalResults === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: colors.textMuted }}>
                No results found for "{query}"
              </div>
            )}
          </div>
        </>
      )}

      {!results && !loading && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{
            width: '64px', height: '64px', backgroundColor: 'rgba(239,68,68,0.1)',
            borderRadius: '16px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Search size={28} color="#f87171" />
          </div>
          <p style={{ color: colors.text, fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>
            Search anything
          </p>
          <p style={{ color: colors.textMuted, fontSize: '14px', margin: 0 }}>
            Find users by name or email, tasks by title, projects by name
          </p>
        </div>
      )}
    </div>
  )
}