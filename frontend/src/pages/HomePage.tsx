import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Timer, CheckSquare, BarChart3, Calendar, ArrowRight,
  Zap, Shield, Clock, Users, ChevronDown, Menu, X,
  FolderKanban, Tag, TrendingUp
} from 'lucide-react'

// ── Animated counter ──────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0
        const step = Math.ceil(to / 60)
        const timer = setInterval(() => {
          start += step
          if (start >= to) { setCount(to); clearInterval(timer) }
          else setCount(start)
        }, 16)
        observer.disconnect()
      }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── FAQ Item ──────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.2s'
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '24px 0', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left', gap: '16px'
      }}>
        <span style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0', lineHeight: '1.4' }}>{q}</span>
        <ChevronDown size={18} color="#6366f1" style={{
          flexShrink: 0, transition: 'transform 0.3s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
        }} />
      </button>
      {open && (
        <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.7', margin: '0 0 24px', paddingRight: '32px' }}>
          {a}
        </p>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: CheckSquare, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  title: 'Task Management',    desc: 'Create, organize and track tasks with priorities, subtasks, drag & drop and bulk actions.' },
    { icon: FolderKanban, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', title: 'Project Tracking',  desc: 'Manage multiple projects with Kanban boards, progress bars and deadline tracking.' },
    { icon: Timer,        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  title: 'Time Tracker',      desc: 'Track time spent on tasks with a live timer, manual entries and detailed summaries.' },
    { icon: Calendar,     color: '#f472b6', bg: 'rgba(244,114,182,0.1)', title: 'Calendar View',     desc: 'Visualize your schedule with a monthly calendar, events and task deadlines.' },
    { icon: BarChart3,    color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  title: 'Analytics',         desc: 'Get insights into your productivity with charts for tasks, priorities and project progress.' },
    { icon: Tag,          color: '#facc15', bg: 'rgba(250,204,21,0.1)',  title: 'Tags & Labels',     desc: 'Organize tasks with color-coded tags for fast filtering and categorization.' },
  ]

  const stats = [
    { value: 12,   suffix: '+', label: 'Features built-in' },
    { value: 100,  suffix: '%', label: 'Free to use' },
    { value: 0,    suffix: '',  label: 'Ads, ever' },
    { value: 1,    suffix: '',  label: 'Place for everything' },
  ]

  const pricing = [
    {
      name: 'Free', price: '0', period: 'forever',
      color: '#64748b', buttonBg: 'rgba(99,102,241,0.15)', buttonColor: '#818cf8',
      buttonBorder: 'rgba(99,102,241,0.3)',
      features: ['Unlimited tasks', 'Up to 5 projects', 'Time tracker', 'Calendar view', 'Basic analytics'],
      cta: 'Get started free'
    },
    {
      name: 'Pro', price: '9', period: 'per month',
      color: '#6366f1', buttonBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      buttonColor: '#ffffff', buttonBorder: 'transparent',
      popular: true,
      features: ['Everything in Free', 'Unlimited projects', 'Advanced analytics', 'Priority support', 'Tags & labels', 'Export data'],
      cta: 'Start free trial'
    },
    {
      name: 'Team', price: '29', period: 'per month',
      color: '#8b5cf6', buttonBg: 'rgba(139,92,246,0.15)', buttonColor: '#a78bfa',
      buttonBorder: 'rgba(139,92,246,0.3)',
      features: ['Everything in Pro', 'Up to 10 members', 'Shared projects', 'Team analytics', 'Admin controls', 'Priority support'],
      cta: 'Contact sales'
    },
  ]

  const faqs = [
    { q: 'Is TrackFlow really free?', a: 'Yes! The free tier is fully featured with unlimited tasks, time tracking and calendar. No credit card required.' },
    { q: 'Can I use TrackFlow on mobile?', a: 'Absolutely. TrackFlow is fully responsive and works great on phones and tablets through your browser.' },
    { q: 'Is my data secure?', a: 'All data is stored securely with bcrypt password hashing, HttpOnly cookie authentication and encrypted connections.' },
    { q: 'Can I export my data?', a: 'Pro and Team plans include full data export. Your data always belongs to you.' },
    { q: 'Do I need to install anything?', a: 'No installation needed. TrackFlow runs entirely in your browser — just sign up and start working.' },
  ]

  return (
    <div style={{ backgroundColor: '#030712', fontFamily: "'DM Sans', Inter, sans-serif", color: '#e2e8f0', overflowX: 'hidden' }}>

      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(99,102,241,0.3); color: #fff; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.3); }
          50%       { box-shadow: 0 0 80px rgba(99,102,241,0.5); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
        .hero-badge {
          animation: fadeUp 0.6s ease both;
        }
        .hero-title {
          animation: fadeUp 0.6s ease 0.1s both;
        }
        .hero-sub {
          animation: fadeUp 0.6s ease 0.2s both;
        }
        .hero-cta {
          animation: fadeUp 0.6s ease 0.3s both;
        }
        .hero-card {
          animation: float 4s ease-in-out infinite, fadeUp 0.6s ease 0.4s both;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99,102,241,0.3) !important;
        }
        .pricing-card:hover {
          transform: translateY(-4px);
        }
        .nav-link:hover {
          color: #ffffff !important;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #6366f1, #a78bfa, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        backgroundColor: scrolled ? 'rgba(3,7,18,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', backgroundColor: '#6366f1',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse-glow 3s ease-in-out infinite'
            }}>
              <Timer size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>TrackFlow</span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link" style={{
                fontSize: '14px', fontWeight: '500', color: '#64748b',
                textDecoration: 'none', transition: 'color 0.2s'
              }}>
                {item}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/login" style={{
              fontSize: '14px', fontWeight: '500', color: '#94a3b8',
              textDecoration: 'none', padding: '8px 16px',
              transition: 'color 0.2s'
            }}>
              Sign in
            </Link>
            <Link to="/register" style={{
              fontSize: '14px', fontWeight: '600', color: '#fff',
              textDecoration: 'none', padding: '9px 20px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '9px',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              transition: 'opacity 0.2s'
            }}>
              Get started free
            </Link>
            {/* Mobile menu btn */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              display: 'none', background: 'none', border: 'none',
              color: '#94a3b8', cursor: 'pointer', padding: '4px'
            }} className="mobile-menu-btn">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            padding: '16px 0 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column', gap: '4px'
          }}>
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontSize: '15px', fontWeight: '500', color: '#94a3b8',
                  textDecoration: 'none', padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}>
                {item}
              </a>
            ))}
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{
              marginTop: '12px', fontSize: '15px', fontWeight: '600',
              color: '#fff', textDecoration: 'none', padding: '12px 20px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '10px', textAlign: 'center'
            }}>
              Get started free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background effects */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.2) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          top: '10%', left: '-10%', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          bottom: '10%', right: '-5%', pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '860px', textAlign: 'center', position: 'relative' }}>
          {/* Badge */}
          <div className="hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '999px', padding: '6px 16px', marginBottom: '32px'
          }}>
            <Zap size={12} color="#818cf8" />
            <span style={{ fontSize: '13px', color: '#818cf8', fontWeight: '600' }}>
              All-in-one productivity platform
            </span>
          </div>

          {/* Title */}
          <h1 className="hero-title" style={{
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: '800', lineHeight: '1.1',
            margin: '0 0 24px', letterSpacing: '-0.03em',
            fontFamily: "'DM Serif Display', serif",
          }}>
            Your work,{' '}
            <span className="shimmer-text">organized.</span>
            <br />
            <span style={{ color: '#e2e8f0' }}>Finally.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub" style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)', color: '#64748b',
            lineHeight: '1.7', margin: '0 auto 40px', maxWidth: '580px',
          }}>
            TrackFlow brings together tasks, projects, time tracking and your calendar
            into one beautiful, distraction-free workspace.
          </p>

          {/* CTA buttons */}
          <div className="hero-cta" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '16px', fontWeight: '700', color: '#fff',
              textDecoration: 'none', padding: '14px 28px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.4)'
              }}
            >
              Start for free <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '16px', fontWeight: '600', color: '#94a3b8',
              textDecoration: 'none', padding: '14px 28px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', transition: 'all 0.2s',
              backgroundColor: 'rgba(255,255,255,0.03)'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = '#94a3b8'
              }}
            >
              Sign in
            </Link>
          </div>

          {/* Trust line */}
          <p style={{ marginTop: '24px', fontSize: '13px', color: '#334155' }}>
            No credit card required · Free forever plan · Setup in 30 seconds
          </p>

          {/* Floating preview card */}
          <div className="hero-card" style={{
            marginTop: '72px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
            textAlign: 'left',
          }}>
            {/* Fake browser bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444', opacity: 0.7 }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#facc15', opacity: 0.7 }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4ade80', opacity: 0.7 }} />
              <div style={{
                flex: 1, height: '24px', backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: '6px', marginLeft: '8px', display: 'flex', alignItems: 'center',
                paddingLeft: '10px'
              }}>
                <span style={{ fontSize: '11px', color: '#334155' }}>app.trackflow.io/dashboard</span>
              </div>
            </div>

            {/* Mini dashboard preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: "Today's Tasks", value: '8', color: '#60a5fa' },
                { label: 'Overdue', value: '2', color: '#f87171' },
                { label: 'Projects', value: '5', color: '#a78bfa' },
                { label: 'Time Today', value: '3h 20m', color: '#34d399' },
              ].map(s => (
                <div key={s.label} style={{
                  backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                  padding: '14px', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: '11px', color: '#334155', margin: '4px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mini task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { title: 'Design new landing page', status: 'IN_PROGRESS', priority: 'HIGH', color: '#fb923c' },
                { title: 'Review pull requests', status: 'TODO', priority: 'URGENT', color: '#f87171' },
                { title: 'Update documentation', status: 'DONE', priority: 'LOW', color: '#4ade80' },
              ].map((task, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                  padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: `2px solid ${task.status === 'DONE' ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
                    backgroundColor: task.status === 'DONE' ? 'rgba(74,222,128,0.15)' : 'transparent',
                    flexShrink: 0
                  }} />
                  <span style={{
                    fontSize: '13px', color: task.status === 'DONE' ? '#334155' : '#94a3b8',
                    textDecoration: task.status === 'DONE' ? 'line-through' : 'none', flex: 1
                  }}>
                    {task.title}
                  </span>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: task.color + '20', color: task.color, fontWeight: '600'
                  }}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{
        padding: '60px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(99,102,241,0.03)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px'
        }}>
          {stats.map(({ value, suffix, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: '800', color: '#fff', margin: 0, fontFamily: "'DM Serif Display', serif" }}>
                <Counter to={value} suffix={suffix} />
              </p>
              <p style={{ fontSize: '14px', color: '#475569', margin: '6px 0 0', fontWeight: '500' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: 'clamp(60px, 10vw, 120px) 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '999px', padding: '5px 14px', marginBottom: '20px'
            }}>
              <TrendingUp size={12} color="#818cf8" />
              <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Features
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '800',
              color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em',
              fontFamily: "'DM Serif Display', serif",
            }}>
              Everything you need,<br />
              <span className="shimmer-text">nothing you don't.</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#475569', maxWidth: '520px', margin: '0 auto', lineHeight: '1.7' }}>
              Built for developers, designers, and teams who want to stay focused without juggling five different tools.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {features.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="feature-card" style={{
                backgroundColor: '#0f172a', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '28px', cursor: 'default',
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{
                  width: '48px', height: '48px', backgroundColor: bg,
                  borderRadius: '14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '20px'
                }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 10px' }}>{title}</h3>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why TrackFlow ── */}
      <section style={{
        padding: 'clamp(60px, 10vw, 120px) 24px',
        background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.04), transparent)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px'
          }}>
            {[
              { icon: Zap,     color: '#facc15', title: 'Blazing fast',       desc: 'Optimized queries, database indexes and smart caching mean everything loads instantly.' },
              { icon: Shield,  color: '#34d399', title: 'Secure by default',  desc: 'HttpOnly cookies, bcrypt hashing, refresh token rotation — security best practices out of the box.' },
              { icon: Clock,   color: '#60a5fa', title: 'Saves you time',     desc: 'Quick add tasks, keyboard shortcuts, bulk actions and drag & drop to move fast.' },
              { icon: Users,   color: '#f472b6', title: 'Built for humans',   desc: 'Clean UI with dark mode, responsive design and thoughtful UX that gets out of your way.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: color + '15', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  <Icon size={18} color={color} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: 'clamp(60px, 10vw, 120px) 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '999px', padding: '5px 14px', marginBottom: '20px'
            }}>
              <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Pricing
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '800',
              color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em',
              fontFamily: "'DM Serif Display', serif",
            }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: '17px', color: '#475569', lineHeight: '1.7' }}>
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px', alignItems: 'start'
          }}>
            {pricing.map(plan => (
              <div key={plan.name} className="pricing-card" style={{
                backgroundColor: plan.popular ? 'rgba(99,102,241,0.08)' : '#0f172a',
                borderRadius: '20px',
                border: plan.popular ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                padding: '32px',
                position: 'relative',
                transition: 'transform 0.2s',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#6366f1', borderRadius: '999px',
                    padding: '4px 16px', fontSize: '12px', fontWeight: '700', color: '#fff',
                    whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(99,102,241,0.4)'
                  }}>
                    Most Popular
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', margin: '0 0 12px' }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '48px', fontWeight: '800', color: '#fff', lineHeight: 1, fontFamily: "'DM Serif Display', serif" }}>
                      ${plan.price}
                    </span>
                    <span style={{ fontSize: '14px', color: '#475569' }}>/{plan.period}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: plan.color + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link to="/register" style={{
                  display: 'block', textAlign: 'center',
                  fontSize: '15px', fontWeight: '700', color: plan.buttonColor,
                  textDecoration: 'none', padding: '13px',
                  background: plan.buttonBg,
                  borderRadius: '10px',
                  border: `1px solid ${plan.buttonBorder}`,
                  boxShadow: plan.popular ? '0 4px 20px rgba(99,102,241,0.35)' : 'none',
                  transition: 'opacity 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: 'clamp(60px, 10vw, 120px) 24px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '999px', padding: '5px 14px', marginBottom: '20px'
            }}>
              <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                FAQ
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: '800',
              color: '#fff', margin: 0, letterSpacing: '-0.02em',
              fontFamily: "'DM Serif Display', serif",
            }}>
              Got questions?
            </h2>
          </div>
          {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: 'clamp(60px, 10vw, 100px) 24px' }}>
        <div style={{
          maxWidth: '800px', margin: '0 auto', textAlign: 'center',
          backgroundColor: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '24px', padding: 'clamp(40px, 8vw, 72px) 40px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)'
          }} />
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '800',
            color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em',
            fontFamily: "'DM Serif Display', serif", position: 'relative'
          }}>
            Ready to get organized?
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', margin: '0 0 36px', lineHeight: '1.7', position: 'relative' }}>
            Join TrackFlow today and start working smarter. It's free, forever.
          </p>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '16px', fontWeight: '700', color: '#fff',
            textDecoration: 'none', padding: '14px 32px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
            position: 'relative'
          }}>
            Create free account <ArrowRight size={16} />
          </Link>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#334155', position: 'relative' }}>
            No credit card · Free forever plan
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '40px 24px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px', height: '30px', backgroundColor: '#6366f1',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Timer size={14} color="#fff" />
            </div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>TrackFlow</span>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {['Features', 'Pricing', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{
                fontSize: '13px', color: '#334155', textDecoration: 'none', transition: 'color 0.2s'
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color = '#334155'}
              >
                {item}
              </a>
            ))}
            <Link to="/login" style={{ fontSize: '13px', color: '#334155', textDecoration: 'none' }}>Sign in</Link>
            <Link to="/register" style={{ fontSize: '13px', color: '#334155', textDecoration: 'none' }}>Register</Link>
          </div>

          <p style={{ fontSize: '13px', color: '#1e293b', margin: 0 }}>
            © 2026 TrackFlow by <span style={{ color: '#334155' }}>@MrSparkiop</span>
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}