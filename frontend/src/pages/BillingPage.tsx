import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import {
  Zap, CreditCard, Check, ExternalLink, Star,
  FileText, AlertCircle, RefreshCw, Download,
} from 'lucide-react'

interface Invoice {
  id: string
  number: string | null
  date: string
  amount: number
  currency: string
  status: string | null
  pdfUrl: string | null
  hostedUrl: string | null
}

interface Subscription {
  active: boolean
  status?: string
  plan: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  amount?: number
  currency?: string
  invoices?: Invoice[]
}

export default function BillingPage() {
  const { user } = useAuthStore()
  const { isDark } = useThemeStore()
  const isPro   = (user as any)?.role === 'PRO'
  const isAdmin = (user as any)?.role === 'ADMIN'

  const c = {
    bg:        isDark ? '#030712' : '#f1f5f9',
    card:      isDark ? '#0f172a' : '#ffffff',
    border:    isDark ? '#1e293b' : '#e2e8f0',
    text:      isDark ? '#ffffff' : '#0f172a',
    muted:     isDark ? '#64748b' : '#94a3b8',
    subtle:    isDark ? '#1e293b' : '#f8fafc',
  }

  const card = {
    backgroundColor: c.card,
    borderRadius: '16px',
    border: `1px solid ${c.border}`,
    padding: '28px',
    marginBottom: '16px',
  }

  // ── Subscription data ────────────────────────────────────────────────
  const { data: sub, isLoading: subLoading, refetch } = useQuery<Subscription>({
    queryKey: ['billing-subscription'],
    queryFn: () => api.get('/billing/subscription').then(r => r.data),
    enabled: isPro,
  })

  // ── Checkout ─────────────────────────────────────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: () => api.post('/billing/checkout').then(r => r.data),
    onSuccess: (data) => { if (data.url) window.location.href = data.url },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not start checkout'),
  })

  // ── Customer Portal ───────────────────────────────────────────────────
  const portalMutation = useMutation({
    mutationFn: () => api.post('/billing/portal').then(r => r.data),
    onSuccess: (data) => { if (data.url) window.location.href = data.url },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not open portal'),
  })

  const FREE_FEATURES = ['Up to 3 projects', '50 tasks', '1 team', 'Basic analytics']
  const PRO_FEATURES  = ['Unlimited projects', 'Unlimited tasks', 'Unlimited teams', 'Advanced analytics', 'Priority support', 'Early access to new features']

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const fmtAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount)

  const statusColor = (status: string | null | undefined) => {
    if (status === 'paid')   return { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' }
    if (status === 'open')   return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
    if (status === 'void' || status === 'uncollectible') return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' }
    return { bg: 'rgba(100,116,139,0.12)', color: c.muted }
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', backgroundColor: c.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: c.text, margin: '0 0 8px' }}>Billing & Plans</h1>
        <p style={{ color: c.muted, marginBottom: '32px', fontSize: '14px' }}>
          Manage your subscription, payment method, and billing history.
        </p>

        {/* ── Current Plan Banner ───────────────────────────────────────── */}
        <div style={{
          ...card,
          background: isPro
            ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))'
            : c.card,
          border: isPro ? '1px solid rgba(245,158,11,0.4)' : `1px solid ${c.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isPro || isAdmin
                ? <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={20} color="#fff" fill="#fff" />
                  </div>
                : <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={20} color="#6366f1" />
                  </div>
              }
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: c.text, margin: 0 }}>
                  {isAdmin ? 'Admin Account' : isPro ? 'Pro Plan' : 'Free Plan'}
                </p>
                <p style={{ fontSize: '13px', color: c.muted, margin: '2px 0 0' }}>
                  {isAdmin ? 'Full platform access' : isPro
                    ? sub?.cancelAtPeriodEnd
                      ? `Cancels ${sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : '...'}`
                      : sub?.currentPeriodEnd
                        ? `Renews ${fmtDate(sub.currentPeriodEnd)}`
                        : 'All features unlocked'
                    : 'Limited to free tier'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isPro && !isAdmin && (
                <button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(245,158,11,0.4)',
                    borderRadius: '10px', padding: '8px 16px',
                    color: '#f59e0b', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={13} />
                  {portalMutation.isPending ? 'Opening...' : 'Manage'}
                </button>
              )}
              {isPro && (
                <button
                  onClick={() => refetch()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${c.border}`,
                    borderRadius: '10px', padding: '8px 12px',
                    color: c.muted, fontSize: '13px', cursor: 'pointer',
                  }}
                  title="Refresh"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Subscription stats row */}
          {isPro && sub?.active && (
            <div style={{
              marginTop: '20px', paddingTop: '20px',
              borderTop: `1px solid rgba(245,158,11,0.2)`,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
            }}>
              {[
                { label: 'Monthly cost', value: sub.amount != null ? fmtAmount(sub.amount, sub.currency ?? 'usd') : '—' },
                { label: 'Next billing', value: sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : '—' },
                { label: 'Status', value: sub.cancelAtPeriodEnd ? 'Cancels soon' : 'Active' },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: '11px', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: c.text, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Plan Cards ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Free */}
          <div style={{
            backgroundColor: c.card, borderRadius: '16px',
            border: !isPro && !isAdmin ? '2px solid #6366f1' : `1px solid ${c.border}`,
            padding: '24px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Free</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: c.text, margin: '0 0 4px' }}>$0</p>
            <p style={{ fontSize: '13px', color: c.muted, margin: '0 0 20px' }}>forever</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: c.muted }}>
                  <Check size={14} color="#6366f1" /> {f}
                </li>
              ))}
            </ul>
            <div style={{
              textAlign: 'center', padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              backgroundColor: !isPro && !isAdmin ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: !isPro && !isAdmin ? '#6366f1' : c.muted,
              border: `1px solid ${!isPro && !isAdmin ? '#6366f1' : c.border}`,
            }}>
              {!isPro && !isAdmin ? 'Current plan' : 'Free tier'}
            </div>
          </div>

          {/* Pro */}
          <div style={{
            borderRadius: '16px',
            border: isPro ? '2px solid #f59e0b' : `1px solid ${c.border}`,
            padding: '24px',
            background: isDark ? 'linear-gradient(145deg, #1e1a0e, #0f172a)' : 'linear-gradient(145deg, #fffbeb, #ffffff)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)', pointerEvents: 'none' }} />
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Pro</p>
            <p style={{ fontSize: '28px', fontWeight: '800', color: c.text, margin: '0 0 4px' }}>
              $9.99<span style={{ fontSize: '14px', fontWeight: '500', color: c.muted }}>/mo</span>
            </p>
            <p style={{ fontSize: '13px', color: c.muted, margin: '0 0 20px' }}>billed monthly</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRO_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: c.text }}>
                  <Check size={14} color="#f59e0b" /> {f}
                </li>
              ))}
            </ul>

            {!isPro && !isAdmin ? (
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                style={{
                  width: '100%', padding: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}
              >
                <Zap size={14} />
                {checkoutMutation.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
              </button>
            ) : (
              <div style={{
                textAlign: 'center', padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.4)',
              }}>
                {isAdmin ? 'Admin access' : '✓ Current plan'}
              </div>
            )}
          </div>
        </div>

        {/* ── Payment Method / Cancel actions ───────────────────────────── */}
        {isPro && !isAdmin && (
          <div style={card}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: c.text, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={16} color="#6366f1" /> Payment & Subscription
            </h2>
            <p style={{ fontSize: '13px', color: c.muted, margin: '0 0 20px' }}>
              Update your payment method, download invoices, or cancel your subscription via the Stripe customer portal.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: '10px', padding: '10px 20px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                <CreditCard size={14} />
                {portalMutation.isPending ? 'Opening...' : 'Update Payment Method'}
              </button>
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${c.border}`,
                  borderRadius: '10px', padding: '10px 20px',
                  color: c.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                <ExternalLink size={14} />
                Open Billing Portal
              </button>
            </div>

            {sub?.cancelAtPeriodEnd && (
              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <AlertCircle size={15} color="#ef4444" />
                <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>
                  Your subscription will cancel on <strong>{sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : '...'}</strong>. You can reactivate it in the billing portal.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Invoice History ───────────────────────────────────────────── */}
        {isPro && !isAdmin && (
          <div style={card}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: c.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#6366f1" /> Invoice History
            </h2>

            {subLoading ? (
              <p style={{ fontSize: '13px', color: c.muted }}>Loading invoices...</p>
            ) : !sub?.invoices?.length ? (
              <p style={{ fontSize: '13px', color: c.muted }}>No invoices yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sub.invoices.map(inv => {
                  const sc = statusColor(inv.status)
                  return (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: '10px',
                        backgroundColor: c.subtle, border: `1px solid ${c.border}`,
                        flexWrap: 'wrap', gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={15} color={c.muted} />
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: c.text, margin: 0 }}>
                            {inv.number ?? inv.id.slice(-8).toUpperCase()}
                          </p>
                          <p style={{ fontSize: '12px', color: c.muted, margin: '2px 0 0' }}>{fmtDate(inv.date)}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: c.text, margin: 0 }}>
                          {fmtAmount(inv.amount, inv.currency)}
                        </p>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 8px',
                          borderRadius: '6px', backgroundColor: sc.bg, color: sc.color,
                          textTransform: 'capitalize',
                        }}>
                          {inv.status ?? 'unknown'}
                        </span>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            style={{ color: c.muted, display: 'flex', alignItems: 'center' }}
                          >
                            <Download size={15} />
                          </a>
                        )}
                        {inv.hostedUrl && (
                          <a
                            href={inv.hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View invoice"
                            style={{ color: c.muted, display: 'flex', alignItems: 'center' }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Test mode notice ─────────────────────────────────────────── */}
        <p style={{ fontSize: '12px', color: c.muted, textAlign: 'center', marginTop: '8px' }}>
          🧪 Stripe is in <strong>test mode</strong> — use card <code>4242 4242 4242 4242</code> with any future expiry and CVC.
        </p>
      </div>
    </div>
  )
}
