import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Search, Shield, User, Trash2, ChevronLeft, ChevronRight, Crown, Ban, Users } from 'lucide-react'
import api from '../../lib/axios'
import toast from 'react-hot-toast'
import { TableRowSkeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuthStore } from '../../store/authStore'

export default function AdminUsersPage() {
  const { isDark, isMobile } = useOutletContext<{ isDark: boolean; isMobile: boolean }>()
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [searchInput, setSearchInput] = useState('')

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    confirmText?: string
    actionLabel?: string
    variant?: 'danger' | 'warning'
    onConfirm: () => void
  }>({
    isOpen: false, title: '', description: '', onConfirm: () => {}
  })

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }))

  const colors = {
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=15&search=${search}`).then(r => r.data),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated!')
      closeConfirm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update role')
      closeConfirm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('User deleted')
      closeConfirm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete user')
      closeConfirm()
    },
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      api.put(`/admin/users/${id}/suspend`, { isSuspended }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated!')
      closeConfirm()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update user')
      closeConfirm()
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const isSelf = (userId: string) => userId === (currentUser as any)?.id

  const handleRoleChange = (e: React.MouseEvent, u: any) => {
    e.stopPropagation()

    // Self-protection
    if (isSelf(u.id)) {
      toast.error("You can't change your own role")
      return
    }

    const nextRole = u.role === 'ADMIN' ? 'USER' : u.role === 'PRO' ? 'ADMIN' : 'PRO'
    const isRevokingAdmin = u.role === 'ADMIN' && nextRole === 'USER'

    setConfirmModal({
      isOpen: true,
      title: isRevokingAdmin ? 'Revoke Admin Role' : `Make ${nextRole.charAt(0) + nextRole.slice(1).toLowerCase()}`,
      description: isRevokingAdmin
        ? `This will remove admin access from ${u.firstName} ${u.lastName}. They will lose all admin privileges immediately.`
        : `This will change ${u.firstName} ${u.lastName}'s role from ${u.role} to ${nextRole}.`,
      variant: isRevokingAdmin ? 'warning' : 'danger',
      actionLabel: `Change to ${nextRole}`,
      confirmText: isRevokingAdmin ? 'REVOKE' : undefined,
      onConfirm: () => roleMutation.mutate({ id: u.id, role: nextRole }),
    })
  }

  const handleSuspend = (e: React.MouseEvent, u: any) => {
    e.stopPropagation()

    // Self-protection
    if (isSelf(u.id)) {
      toast.error("You can't suspend your own account")
      return
    }

    const suspending = !u.isSuspended
    setConfirmModal({
      isOpen: true,
      title: suspending ? `Suspend ${u.firstName} ${u.lastName}` : `Unsuspend ${u.firstName} ${u.lastName}`,
      description: suspending
        ? `${u.firstName} ${u.lastName} will be immediately logged out and unable to access their account.`
        : `${u.firstName} ${u.lastName} will regain access to their account immediately.`,
      variant: suspending ? 'danger' : 'warning',
      actionLabel: suspending ? 'Suspend User' : 'Unsuspend User',
      confirmText: suspending ? 'SUSPEND' : undefined,
      onConfirm: () => suspendMutation.mutate({ id: u.id, isSuspended: suspending }),
    })
  }

  const handleDelete = (e: React.MouseEvent, u: any) => {
    e.stopPropagation()

    // Self-protection
    if (isSelf(u.id)) {
      toast.error("You can't delete your own account")
      return
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete ${u.firstName} ${u.lastName}`,
      description: `This will permanently delete ${u.firstName} ${u.lastName} and all their data including tasks, projects, time entries and team memberships. This cannot be undone.`,
      variant: 'danger',
      actionLabel: 'Delete User',
      confirmText: 'DELETE',
      onConfirm: () => deleteMutation.mutate(u.id),
    })
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.text, margin: 0 }}>
            Users
          </h1>
          <p style={{ color: colors.textMuted, marginTop: '4px', fontSize: '14px' }}>
            {data?.total || 0} total users
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
          <input
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            style={{
              width: '100%', paddingLeft: '36px', padding: '10px 14px 10px 36px',
              backgroundColor: colors.input, border: `1px solid ${colors.inputBorder}`,
              borderRadius: '10px', color: colors.text, fontSize: '14px', outline: 'none',
              boxSizing: 'border-box' as const
            }}
          />
        </div>
        <button type="submit" style={{
          padding: '10px 18px', backgroundColor: '#ef4444', border: 'none',
          borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
        }}>
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} style={{
            padding: '10px 14px', backgroundColor: colors.subBg, border: `1px solid ${colors.border}`,
            borderRadius: '10px', color: colors.textMuted, fontSize: '14px', cursor: 'pointer'
          }}>
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div style={{
        backgroundColor: colors.card, borderRadius: '16px',
        border: `1px solid ${colors.border}`, overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr auto' : '2fr 1fr 1fr 1fr auto',
          gap: '12px', padding: '12px 20px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.subBg,
        }}>
          {['User', !isMobile && 'Tasks', !isMobile && 'Projects', !isMobile && 'Joined', 'Actions']
            .filter(Boolean).map(h => (
              <span key={h as string} style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </span>
            ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            {[...Array(8)].map((_, i) => <TableRowSkeleton key={i} isDark={isDark} />)}
          </div>
        ) : data?.users?.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="No users match your search or filters."
            isDark={isDark}
            color="#6366f1"
          />
        ) : (
          data?.users?.map((u: any) => {
            const self = isSelf(u.id)
            return (
              <div key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr auto' : '2fr 1fr 1fr 1fr auto',
                  gap: '12px', padding: '14px 20px',
                  borderBottom: `1px solid ${colors.border}`,
                  alignItems: 'center',
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.subBg + '80'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* User info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: u.role === 'ADMIN'
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', color: '#fff'
                  }}>
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: colors.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.firstName} {u.lastName}
                      </p>
                      {u.role === 'ADMIN' && <Crown size={11} color="#f87171" />}
                      {/* You badge */}
                      {self && (
                        <span style={{
                          fontSize: '9px', padding: '1px 6px', borderRadius: '999px',
                          backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
                          fontWeight: '700', flexShrink: 0
                        }}>YOU</span>
                      )}
                      {/* Suspended badge */}
                      {u.isSuspended && (
                        <span style={{
                          fontSize: '9px', padding: '1px 6px', borderRadius: '999px',
                          backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171',
                          fontWeight: '700', flexShrink: 0
                        }}>SUSPENDED</span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: colors.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                {!isMobile && <span style={{ fontSize: '13px', color: colors.text, fontWeight: '600' }}>{u._count.tasks}</span>}

                {/* Projects */}
                {!isMobile && <span style={{ fontSize: '13px', color: colors.text, fontWeight: '600' }}>{u._count.projects}</span>}

                {/* Joined */}
                {!isMobile && (
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Role toggle */}
                  <button
                    onClick={(e) => handleRoleChange(e, u)}
                    title={self ? "Can't change own role" : u.role === 'ADMIN' ? 'Revoke Admin' : u.role === 'PRO' ? 'Make Admin' : 'Make Pro'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '5px 10px', borderRadius: '7px', border: 'none',
                      cursor: self ? 'not-allowed' : 'pointer',
                      fontSize: '11px', fontWeight: '600',
                      opacity: self ? 0.4 : 1,
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' :
                                       u.role === 'PRO'   ? 'rgba(245,158,11,0.15)' :
                                       'rgba(99,102,241,0.15)',
                      color: u.role === 'ADMIN' ? '#f87171' : u.role === 'PRO' ? '#f59e0b' : '#818cf8',
                      transition: 'all 0.15s'
                    }}
                  >
                    {u.role === 'ADMIN' ? <><Shield size={11} /> Admin</> :
                     u.role === 'PRO'   ? '✨ Pro' :
                     <><User size={11} /> User</>}
                  </button>

                  {/* Suspend */}
                  <button
                    onClick={(e) => handleSuspend(e, u)}
                    title={self ? "Can't suspend yourself" : u.isSuspended ? 'Unsuspend' : 'Suspend'}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '6px', borderRadius: '7px', border: 'none',
                      cursor: self ? 'not-allowed' : 'pointer',
                      backgroundColor: 'transparent',
                      color: u.isSuspended ? '#4ade80' : colors.textMuted,
                      opacity: self ? 0.4 : 1,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (self) return
                      e.currentTarget.style.backgroundColor = u.isSuspended ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'
                      e.currentTarget.style.color = u.isSuspended ? '#4ade80' : '#f87171'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = u.isSuspended ? '#4ade80' : colors.textMuted
                    }}
                  >
                    <Ban size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, u)}
                    title={self ? "Can't delete yourself" : 'Delete user'}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '6px', borderRadius: '7px', border: 'none',
                      cursor: self ? 'not-allowed' : 'pointer',
                      backgroundColor: 'transparent', color: colors.textMuted,
                      opacity: self ? 0.4 : 1,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (self) return
                      e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
                      e.currentTarget.style.color = '#f87171'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = colors.textMuted
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            display: 'flex', alignItems: 'center', padding: '8px 12px',
            backgroundColor: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: '9px', color: page === 1 ? colors.textMuted : colors.text,
            cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px'
          }}>
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: data.totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === data.totalPages || Math.abs(p - page) <= 1)
            .map((p, i, arr) => (
              <>
                {i > 0 && arr[i - 1] !== p - 1 && (
                  <span key={`dots-${p}`} style={{ color: colors.textMuted, fontSize: '13px' }}>...</span>
                )}
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: '8px 13px',
                  backgroundColor: p === page ? '#ef4444' : colors.card,
                  border: `1px solid ${p === page ? '#ef4444' : colors.border}`,
                  borderRadius: '9px', color: p === page ? '#fff' : colors.text,
                  cursor: 'pointer', fontSize: '13px', fontWeight: p === page ? '600' : '400'
                }}>
                  {p}
                </button>
              </>
            ))
          }

          <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} style={{
            display: 'flex', alignItems: 'center', padding: '8px 12px',
            backgroundColor: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: '9px', color: page === data.totalPages ? colors.textMuted : colors.text,
            cursor: page === data.totalPages ? 'not-allowed' : 'pointer', fontSize: '13px'
          }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        actionLabel={confirmModal.actionLabel}
        variant={confirmModal.variant}
        isLoading={deleteMutation.isPending || suspendMutation.isPending || roleMutation.isPending}
        isDark={isDark}
      />
    </div>
  )
}