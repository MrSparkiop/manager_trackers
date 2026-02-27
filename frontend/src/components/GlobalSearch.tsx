import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, CheckSquare, FolderKanban, Users, Tag, ArrowRight, Clock, Hash } from 'lucide-react'
import api from '../lib/axios'
import { useThemeStore } from '../store/themeStore'

const RECENT_KEY = 'trackflow_recent_searches'

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(q: string) {
  const recent = [q, ...getRecent().filter(r => r !== q)].slice(0, 5)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

const statusColors: Record<string, string> = {
  TODO: '#64748b', IN_PROGRESS: '#60a5fa', IN_REVIEW: '#a78bfa',
  DONE: '#4ade80', CANCELLED: '#f87171',
  ACTIVE: '#4ade80', ARCHIVED: '#64748b', ON_HOLD: '#f59e0b'
}

export default function GlobalSearch() {
  const { isDark } = useThemeStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>(getRecent())
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<any>(null)

  const colors = {
    bg:          isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    hover:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f1f5f9',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults(null)
      setSelectedIndex(0)
      setRecent(getRecent())
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(res.data)
      setSelectedIndex(0)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

  // Flatten all results for keyboard nav
  const allItems = results ? [
    ...results.tasks.map((t: any) => ({ ...t, _type: 'task' })),
    ...results.projects.map((p: any) => ({ ...p, _type: 'project' })),
    ...results.teams.map((t: any) => ({ ...t, _type: 'team' })),
    ...results.tags.map((t: any) => ({ ...t, _type: 'tag' })),
  ] : []

  const getLink = (item: any) => {
    if (item._type === 'task') return '/app/tasks'
    if (item._type === 'project') return `/app/projects`
    if (item._type === 'team') return `/app/teams/${item.id}`
    if (item._type === 'tag') return '/app/tags'
    return '/app/dashboard'
  }

  const handleSelect = (item: any) => {
    saveRecent(query)
    setOpen(false)
    navigate(getLink(item))
  }

  const handleRecentClick = (r: string) => {
    setQuery(r)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && allItems[selectedIndex]) handleSelect(allItems[selectedIndex])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, allItems, selectedIndex])

  if (!open) return null

  const totalResults = allItems.length
  let globalIndex = 0

  const ResultSection = ({ title, items, type, icon: Icon, color }: any) => {
    if (!items?.length) return null
    return (
      <div style={{ marginBottom: '4px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px 4px' }}>
          <Icon size={11} color={colors.textMuted} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </span>
        </div>

        {items.map((item: any) => {
          const idx = globalIndex++
          const isSelected = idx === selectedIndex
          return (
            <div key={item.id}
              onClick={() => handleSelect({ ...item, _type: type })}
              onMouseEnter={() => setSelectedIndex(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 16px', cursor: 'pointer',
                backgroundColor: isSelected ? colors.hover : 'transparent',
                borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.1s',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                backgroundColor: (item.color || color) + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {type === 'task' ? (
                  <CheckSquare size={14} color={item.color || color} />
                ) : type === 'project' ? (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                ) : type === 'team' ? (
                  <span style={{ fontSize: '13px', fontWeight: '800', color: item.color }}>
                    {item.name[0].toUpperCase()}
                  </span>
                ) : (
                  <Hash size={13} color={item.color || color} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px', fontWeight: '600', color: colors.text,
                  margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {item.title || item.name}
                </p>
                <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>
                  {type === 'task' && item.project && `in ${item.project.name}`}
                  {type === 'project' && `${item._count?.tasks || 0} tasks`}
                  {type === 'team' && `${item._count?.members || 0} members`}
                  {type === 'tag' && 'Tag'}
                </p>
              </div>

              {/* Badge */}
              {(item.status || item.priority) && (
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '999px', fontWeight: '600', flexShrink: 0,
                  backgroundColor: (statusColors[item.status] || '#6366f1') + '20',
                  color: statusColors[item.status] || '#818cf8'
                }}>
                  {item.status?.replace('_', ' ') || item.priority}
                </span>
              )}

              <ArrowRight size={12} color={colors.textMuted} style={{ flexShrink: 0, opacity: isSelected ? 1 : 0 }} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        backgroundColor: colors.bg,
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '80px', padding: '80px 16px 16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '580px',
        backgroundColor: colors.card,
        borderRadius: '20px',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'slideDown 0.15s ease',
      }}>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          {loading ? (
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              border: '2px solid #6366f1', borderTopColor: 'transparent',
              animation: 'spin 0.6s linear infinite'
            }} />
          ) : (
            <Search size={18} color={colors.textMuted} style={{ flexShrink: 0 }} />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, teams, tags..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '15px', color: colors.text,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textMuted, padding: '2px', display: 'flex'
            }}>
              <X size={16} />
            </button>
          )}
          <kbd style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '5px',
            backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
            color: colors.textMuted, fontFamily: 'monospace', flexShrink: 0
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '460px', overflowY: 'auto' }}>

          {/* No query — show recent searches */}
          {!query && recent.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px 4px' }}>
                <Clock size={11} color={colors.textMuted} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Recent
                </span>
              </div>
              {recent.map((r, i) => (
                <div key={i} onClick={() => handleRecentClick(r)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '9px 16px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.hover}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Clock size={13} color={colors.textMuted} />
                  <span style={{ fontSize: '13px', color: colors.textMuted }}>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* No query, no recent */}
          {!query && recent.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Search size={32} color={colors.textMuted} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 4px' }}>Search everything</p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                Tasks, projects, teams, tags...
              </p>
            </div>
          )}

          {/* Query but no results */}
          {query.length >= 2 && !loading && results && totalResults === 0 && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 4px', fontWeight: '600' }}>
                No results for "{query}"
              </p>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>
                Try a different search term
              </p>
            </div>
          )}

          {/* Query too short */}
          {query.length === 1 && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
                Type at least 2 characters to search
              </p>
            </div>
          )}

          {/* Results */}
          {results && totalResults > 0 && (
            <div style={{ padding: '8px 0' }}>
              <ResultSection title="Tasks" items={results.tasks} type="task" icon={CheckSquare} color="#6366f1" />
              <ResultSection title="Projects" items={results.projects} type="project" icon={FolderKanban} color="#8b5cf6" />
              <ResultSection title="Teams" items={results.teams} type="team" icon={Users} color="#60a5fa" />
              <ResultSection title="Tags" items={results.tags} type="tag" icon={Tag} color="#14b8a6" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '10px 16px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.subBg,
        }}>
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'select' },
            { keys: ['Esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {keys.map(k => (
                <kbd key={k} style={{
                  fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
                  backgroundColor: colors.card, border: `1px solid ${colors.border}`,
                  color: colors.textMuted, fontFamily: 'monospace'
                }}>{k}</kbd>
              ))}
              <span style={{ fontSize: '10px', color: colors.textMuted }}>{label}</span>
            </div>
          ))}
          {totalResults > 0 && (
            <span style={{ fontSize: '10px', color: colors.textMuted, marginLeft: 'auto' }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}