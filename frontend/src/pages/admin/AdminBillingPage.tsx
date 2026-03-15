import { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { CreditCard, Crown, User, Shield, Search, Zap, RefreshCw } from 'lucide-react'

interface BillingUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isSuspended: boolean
  createdAt: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

interface BillingOverview {
  users: BillingUser[]
  stats: { total: number; pro: number; admin: number; free: number }
}

export default function AdminBillingPage() {
  const { isDark } = useThemeStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'PRO' | 'USER' | 'ADMIN'>('ALL')

  const c = {
    bg:     isDark ? '#030712' : '#f1f5f9',
    card:   isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '#1e293b' : '#e2e8f0',
    text:   isDark ? '#ffffff' : '#0f172a',
    muted:  isDark ? '#64748b' : '#94a3b8',
    subtle: isDark ? '#1e293b' : '#f8fafc',
    input:  isDark ? '#1e293b' : '#f8fafc',
  }

  const { data, isLoading, refetch } = useQuery<BillingOverview>({
    queryKey: ['admin-billing'],
    queryFn: () => api.get('/admin/billing').then(r => r.data),
  })

  const grantMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/billing/${userId}/grant-pro`),
    onSuccess: (_, userId) => {
      toast.success('PRO granted')
      qc.invalidateQueries({ queryKey: ['admin-billing'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/billing/${userId}/revoke-pro`),
    onSuccess: () => {
      toast.success('PRO revoked')
      qc.invalidateQueries({ queryKey: ['admin-billing'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  })

  const filtered = (data?.users ?? []).filter(u => {
    const matchRole = filter === 'ALL' || u.role === filter
    const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const roleStyle = (role: string) => {
    if (role === 'ADMIN') return { bg: 'rgba(239,68,68,0.12)', color: '#f87171' }
    if (role === 'PRO')   return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
    return { bg: 'rgba(100,116,139,0.12)', color: c.muted }
  }

  const RoleIcon = ({ role }: { role: string }) =>
    role === 'ADMIN' ? <Shield size={12} /> : role === 'PRO' ? <Crown size={12} /> : <User size={12} />

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', backgroundColor: c.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '960px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: c.text, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={20} color="#f59e0b" /> Billing Management
            </h1>
            <p style={{ color: c.muted, fontSize: '13px', margin: 0 }}>Grant or revoke PRO access and view subscription status.</p>
          </div>
          <button onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid ${c.border}`, borderRadius: '10px', padding: '8px 14px', color: c.muted, fontSize: '13px', cursor: 'pointer' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Users', value: data?.stats.total ?? '—', color: '#6366f1' },
            { label: 'PRO',         value: data?.stats.pro   ?? '—', color: '#f59e0b' },
            { label: 'Free',        value: data?.stats.free  ?? '—', color: c.muted   },
            { label: 'Admin',       value: data?.stats.admin ?? '—', color: '#f87171' },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: c.card, borderRadius: '14px', border: `1px solid ${c.border}`, padding: '18px 20px' }}>
              <p style={{ fontSize: '11px', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} color={c.muted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              style={{ width: '100%', paddingLeft: '34px', padding: '9px 12px 9px 34px', borderRadius: '10px', border: `1px solid ${c.border}`, backgroundColor: c.input, color: c.text, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {(['ALL', 'PRO', 'USER', 'ADMIN'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                border: `1px solid ${filter === f ? '#6366f1' : c.border}`,
                backgroundColor: filter === f ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: filter === f ? '#6366f1' : c.muted,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ backgroundColor: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>No users found.</div>
          ) : (
            filtered.map((u, i) => {
              const rs = roleStyle(u.role)
              const isPending = grantMutation.isPending || revokeMutation.isPending
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', gap: '12px', flexWrap: 'wrap',
                    borderTop: i === 0 ? 'none' : `1px solid ${c.border}`,
                  }}
                >
                  {/* User info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: c.text, margin: 0 }}>{u.firstName} {u.lastName}</p>
                      <p style={{ fontSize: '12px', color: c.muted, margin: '1px 0 0' }}>{u.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', backgroundColor: rs.bg, color: rs.color }}>
                    <RoleIcon role={u.role} /> {u.role}
                  </span>

                  {/* Stripe info */}
                  <div style={{ fontSize: '11px', color: c.muted, minWidth: '130px' }}>
                    {u.stripeSubscriptionId
                      ? <span style={{ color: '#22c55e' }}>● Stripe active</span>
                      : u.stripeCustomerId
                        ? <span style={{ color: '#f59e0b' }}>● Customer only</span>
                        : <span>No Stripe data</span>
                    }
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {u.role !== 'ADMIN' && (
                      u.role === 'PRO' ? (
                        <button
                          onClick={() => revokeMutation.mutate(u.id)}
                          disabled={isPending}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}
                        >
                          Revoke PRO
                        </button>
                      ) : (
                        <button
                          onClick={() => grantMutation.mutate(u.id)}
                          disabled={isPending}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}
                        >
                          <Zap size={11} /> Grant PRO
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p style={{ fontSize: '12px', color: c.muted, marginTop: '16px', textAlign: 'center' }}>
          Granting PRO manually bypasses Stripe — no charge is created.
        </p>
      </div>
    </div>
  )
}
