import { useEffect, useCallback, useState, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, Building2, AlertTriangle, List,
  Users, UserCheck, LogOut, ChevronRight, ShieldAlert,
  Bell, CheckCheck, Search, X,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getSocket } from '../../services/socket'
import { formatDistanceToNow } from 'date-fns'
import api from '../../services/api'

// Guard against missing/invalid notification timestamps — an Invalid Date would
// make formatDistanceToNow throw and take down the whole notification dropdown.
function safeTimeAgo(value) {
  const d = new Date(value)
  return isNaN(d.getTime()) ? 'just now' : formatDistanceToNow(d, { addSuffix: true })
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
  dark:    '#0C0C12',
  surface: '#111118',
  border:  'rgba(255,255,255,0.06)',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  purple:  '#7F77DD',
  red:     '#E24B4A',
}

const SIDEBAR_W = 220

// ─── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/admin/dashboard'  },
  { icon: Building2,       label: 'Sections',      path: '/admin/sections'   },
  { icon: AlertTriangle,   label: 'Risk Monitor',  path: '/admin/risk-monitor', badge: 'risk' },
  { icon: List,            label: 'All Entries',   path: '/admin/entries'    },
  { icon: Users,           label: 'Users',         path: '/admin/users'      },
  { icon: UserCheck,       label: 'Mentors',       path: '/admin/mentors'    },
]

const PAGE_TITLES = {
  '/admin/dashboard':    'Admin Dashboard',
  '/admin/sections':     'Sections',
  '/admin/risk-monitor': 'Risk Monitor',
  '/admin/entries':      'All Entries',
  '/admin/users':        'User Management',
  '/admin/mentors':      'Mentor Management',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function AdminSidebar({ user, criticalCount, onLogout, mobileOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)',
          }}
        />
      )}

      <nav style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: SIDEBAR_W,
        background: C.dark,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.25s ease',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldAlert size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                Mentoring Diaries
              </div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.06em' }}>
                ADMIN PANEL
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {NAV.map(item => {
            const active = isActive(item.path)
            const showBadge = item.badge === 'risk' && criticalCount > 0
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onClose?.() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '9px 12px',
                  borderRadius: '10px', marginBottom: '2px',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? 'rgba(127,119,221,0.12)' : 'transparent',
                  borderLeft: active ? `3px solid ${C.purple}` : '3px solid transparent',
                  color: active ? C.text : C.muted,
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <item.icon size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {showBadge && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: C.red, flexShrink: 0,
                    boxShadow: `0 0 6px ${C.red}`,
                  }} />
                )}
                {active && <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.5 }} />}
              </button>
            )
          })}
        </div>

        {/* User info + logout */}
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '14px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {getInitials(user?.name || 'Admin')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 500, color: C.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '10px', color: C.purple, letterSpacing: '0.04em' }}>
                ADMINISTRATOR
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '7px 10px',
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'rgba(226,75,74,0.08)',
              color: C.red, fontSize: '12px', fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </nav>
    </>
  )
}

// ─── Notification dropdown ─────────────────────────────────────────────────────
const NOTIF_TYPE_COLORS = {
  'entry:submitted':    '#6366f1',
  'entry:responded':    '#22c55e',
  'entry:critical':     '#ef4444',
  'system:announcement':'#64748b',
  'session:update':     '#f59e0b',
}

function NotifDropdown({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead, hydrateNotifications, initialized } = useNotificationStore()
  useEffect(() => { if (!initialized) hydrateNotifications() }, [initialized, hydrateNotifications])
  const recent = notifications.slice(0, 15)
  return (
    <div style={{
      position: 'absolute', top: '48px', right: 0,
      width: '340px', maxHeight: '420px',
      background: '#0C0C12',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', zIndex: 100,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={14} color={C.purple} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#fff',
              background: C.red, borderRadius: '999px',
              padding: '1px 6px',
            }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <CheckCheck size={12} /> All read
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            display: 'flex', alignItems: 'center', padding: '2px',
          }}><X size={14} /></button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {recent.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <Bell size={20} style={{ color: C.subtle, margin: '0 auto 8px' }} />
            <p style={{ fontSize: '12px', color: C.subtle }}>No notifications yet</p>
          </div>
        ) : recent.map(n => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            style={{
              width: '100%', textAlign: 'left', background: n.read ? 'transparent' : 'rgba(127,119,221,0.04)',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              padding: '10px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: '4px',
              background: NOTIF_TYPE_COLORS[n.type] || '#6366f1',
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title || 'Notification'}
              </p>
              <p style={{ fontSize: '11px', color: C.muted, margin: '2px 0 0', lineHeight: 1.4 }}>{n.message}</p>
              <p style={{ fontSize: '10px', color: C.subtle, margin: '3px 0 0' }}>
                {safeTimeAgo(n.at)}
              </p>
            </div>
            {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple, flexShrink: 0, marginTop: '5px' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Top bar ───────────────────────────────────────────────────────────────────
function AdminTopBar({ pageTitle }) {
  const { unreadCount } = useNotificationStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const notifRef = useRef(null)
  const navigate = useNavigate()

  // Close notif on outside click
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const NAV_SEARCH = [
    { label: 'Dashboard',    path: '/admin/dashboard' },
    { label: 'Sections',     path: '/admin/sections' },
    { label: 'Risk Monitor', path: '/admin/risk-monitor' },
    { label: 'All Entries',  path: '/admin/entries' },
    { label: 'Users',        path: '/admin/users' },
    { label: 'Mentors',      path: '/admin/mentors' },
  ]
  const results = searchVal.trim()
    ? NAV_SEARCH.filter(x => x.label.toLowerCase().includes(searchVal.toLowerCase()))
    : NAV_SEARCH

  return (
    <header style={{
      height: '60px', flexShrink: 0,
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>
        {pageTitle}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.04)', border: 'none',
            borderRadius: '10px', padding: '7px', color: C.muted, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Search size={16} />
        </button>

        {/* Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            style={{
              position: 'relative',
              background: notifOpen ? 'rgba(127,119,221,0.1)' : 'rgba(255,255,255,0.04)',
              border: 'none', borderRadius: '10px', padding: '7px',
              color: notifOpen ? C.purple : C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '5px', right: '5px',
                width: '8px', height: '8px',
                background: C.red, borderRadius: '50%',
                border: '1.5px solid rgba(6,6,10,0.85)',
              }} />
            )}
          </button>
          {notifOpen && <NotifDropdown onClose={() => setNotifOpen(false)} />}
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div
          onClick={() => { setSearchOpen(false); setSearchVal('') }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '480px', background: '#0C0C12',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Search size={16} color={C.purple} />
              <input
                autoFocus
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search pages…"
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: '14px', color: C.text, fontFamily: 'inherit',
                }}
              />
              <kbd style={{ fontSize: '10px', color: C.subtle, background: 'rgba(255,255,255,0.06)', borderRadius: '4px', padding: '2px 6px' }}>ESC</kbd>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {results.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSearchOpen(false); setSearchVal('') }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    padding: '12px 16px', cursor: 'pointer', color: C.text,
                    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(127,119,221,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: C.subtle }}>{item.path}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const reduced = useReducedMotion()

  const { data: overviewData } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api.get('/admin/overview').then(r => r.data),
    staleTime: 60 * 1000,
    retry: false,
  })

  const criticalCount = overviewData?.data?.critical_risk_count ?? 0
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  )?.[1] ?? 'Admin'

  // Mobile sidebar state
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  const handleLogout = useCallback(() => logout(), [logout])

  // Real-time updates: admins must receive live notifications and have the
  // overview/analytics/risk dashboards invalidated as new entries arrive.
  const { addNotification } = useNotificationStore()
  const queryClient = useQueryClient()
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const notifHandler = (data) => {
      addNotification(data)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['admin-risk-monitor'] })
      queryClient.invalidateQueries({ queryKey: ['admin-entries'] })
    }
    const events = ['entry:submitted', 'entry:critical', 'entry:flagged', 'system:announcement', 'session:update', 'admin:flag']
    events.forEach(ev => socket.on(ev, notifHandler))
    return () => events.forEach(ev => socket.off(ev, notifHandler))
  }, [addNotification, queryClient])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.void }}>
      <AdminSidebar
        user={user}
        criticalCount={criticalCount}
        onLogout={handleLogout}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content, offset by sidebar width */}
      <div style={{
        marginLeft: SIDEBAR_W,
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
      }}>
        <AdminTopBar pageTitle={pageTitle} />
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '32px',
          boxSizing: 'border-box',
        }}>
          {reduced ? (
            <Outlet />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
