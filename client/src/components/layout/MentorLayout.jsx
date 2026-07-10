import { useCallback, useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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
  teal:    '#1D9E75',
  amber:   '#EF9F27',
  red:     '#E24B4A',
}

const SIDEBAR_W = 220

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

// ─── SVG Icons (inline, no lucide dependency needed) ──────────────────────────
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconInbox = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ─── Nav config ────────────────────────────────────────────────────────────────
const NAV = [
  { icon: IconGrid,     label: 'Dashboard',      path: '/mentor/dashboard',  badge: null },
  { icon: IconInbox,    label: 'Priority Queue',  path: '/mentor/queue',      badge: 'pending' },
  { icon: IconUsers,    label: 'My Students',     path: '/mentor/students',   badge: null },
  { icon: IconAlert,    label: 'Flagged',         path: '/mentor/flagged',    badge: 'flagged' },
  { icon: IconCalendar, label: 'Sessions',        path: '/mentor/sessions',   badge: null },
  { icon: IconChart,    label: 'Analytics',       path: '/mentor/analytics',  badge: null },
  { icon: IconList,     label: 'All Entries',     path: '/mentor/entries',    badge: null },
]

const PAGE_TITLES = {
  '/mentor/dashboard':  'Dashboard',
  '/mentor/queue':      'Priority Queue',
  '/mentor/students':   'My Students',
  '/mentor/flagged':    'Flagged Students',
  '/mentor/sessions':   'Sessions',
  '/mentor/analytics':  'Analytics',
  '/mentor/entries':    'All Entries',
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function MentorSidebar({ user, pendingCount, flaggedCount, onLogout, mobileOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.6)' }} />
      )}

      <nav style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: C.dark, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.25s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Mentoring Diaries</div>
              <div style={{ fontSize: '10px', color: C.muted, letterSpacing: '0.06em' }}>MENTOR PANEL</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {NAV.map((item, i) => {
            const active = isActive(item.path)
            const badgeCount = item.badge === 'pending' ? pendingCount : item.badge === 'flagged' ? flaggedCount : 0
            return (
              <motion.button
                key={item.path}
                initial={reduced ? {} : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
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
                  fontFamily: 'inherit', transition: 'all 0.15s ease', position: 'relative',
                }}
              >
                <item.icon />
                <span style={{ flex: 1 }}>{item.label}</span>
                {badgeCount > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: '999px',
                    background: item.badge === 'pending' ? C.red : C.amber,
                    color: '#fff', fontSize: '10px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', flexShrink: 0,
                  }}>{badgeCount > 99 ? '99+' : badgeCount}</span>
                )}
                {active && <IconChevron />}
              </motion.button>
            )
          })}
        </div>

        {/* User footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{getInitials(user?.name || 'Mentor')}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 500, color: C.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{user?.name || 'Mentor'}</div>
              <div style={{ fontSize: '10px', color: C.purple, letterSpacing: '0.04em' }}>
                MENTOR · {user?.department || ''}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '7px 10px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              background: 'rgba(226,75,74,0.08)', color: C.red,
              fontSize: '12px', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            <IconLogout /> Sign out
          </button>
        </div>
      </nav>
    </>
  )
}

// ─── Notification dropdown ─────────────────────────────────────────────────────
// Inline SVG icons for search & bell (no extra lucide import needed in this file)
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconCheckCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
    <polyline points="20 6 9 17 4 12" transform="translate(4,0)"/>
  </svg>
)
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const NOTIF_TYPE_COLORS = {
  'entry:submitted':    '#6366f1',
  'entry:responded':    '#22c55e',
  'entry:critical':     '#ef4444',
  'system:announcement':'#64748b',
  'session:update':     '#f59e0b',
}

function MentorNotifDropdown({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead, hydrateNotifications, initialized } = useNotificationStore()
  useEffect(() => { if (!initialized) hydrateNotifications() }, [initialized, hydrateNotifications])
  const recent = notifications.slice(0, 15)
  return (
    <div style={{
      position: 'absolute', top: '48px', right: 0,
      width: '340px', maxHeight: '420px',
      background: C.dark,
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', zIndex: 100,
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconBell />
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#fff',
              background: C.red, borderRadius: '999px', padding: '1px 6px',
            }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <IconCheckCheck /> All read
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, display: 'flex', alignItems: 'center', padding: '2px',
          }}><IconClose /></button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {recent.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ color: C.subtle, marginBottom: '8px', fontSize: '20px' }}>🔔</div>
            <p style={{ fontSize: '12px', color: C.subtle }}>No notifications yet</p>
          </div>
        ) : recent.map(n => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            style={{
              width: '100%', textAlign: 'left',
              background: n.read ? 'transparent' : 'rgba(127,119,221,0.04)',
              border: 'none', borderBottom: `1px solid ${C.border}`,
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
function MentorTopBar({ pageTitle }) {
  const { unreadCount } = useNotificationStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const notifRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const NAV_SEARCH = [
    { label: 'Dashboard',      path: '/mentor/dashboard' },
    { label: 'Priority Queue', path: '/mentor/queue' },
    { label: 'My Students',    path: '/mentor/students' },
    { label: 'Flagged',        path: '/mentor/flagged' },
    { label: 'Sessions',       path: '/mentor/sessions' },
    { label: 'Analytics',      path: '/mentor/analytics' },
    { label: 'All Entries',    path: '/mentor/entries' },
  ]
  const results = searchVal.trim()
    ? NAV_SEARCH.filter(x => x.label.toLowerCase().includes(searchVal.toLowerCase()))
    : NAV_SEARCH

  return (
    <header style={{
      height: '60px', flexShrink: 0,
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>{pageTitle}</span>

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
          <IconSearch />
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
            <IconBell />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '5px', right: '5px',
                width: '8px', height: '8px',
                background: C.red, borderRadius: '50%',
                border: '1.5px solid rgba(6,6,10,0.85)',
              }} />
            )}
          </button>
          {notifOpen && <MentorNotifDropdown onClose={() => setNotifOpen(false)} />}
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
              width: '480px', background: C.dark,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.purple }}><IconSearch /></span>
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
                    border: 'none', borderBottom: `1px solid ${C.border}`,
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

// ─── MentorLayout ─────────────────────────────────────────────────────────────
export default function MentorLayout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const reduced = useReducedMotion()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  // Fetch dashboard summary for badge counts
  const { data: summaryData } = useQuery({
    queryKey: ['mentor', 'dashboard_summary'],
    queryFn: () => api.get('/mentor/dashboard-summary').then(r => r.data),
    staleTime: 2 * 60 * 1000,
    retry: false,
  })

  const pendingCount = summaryData?.data?.stats?.pending_reviews ?? 0
  const flaggedCount = summaryData?.data?.stats?.flagged_unreviewed ?? 0

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) =>
    location.pathname === k || location.pathname.startsWith(k + '/')
  )?.[1] ?? 'Mentor'

  const handleLogout = useCallback(() => logout(), [logout])

  // Real-time updates: mentors must receive live notifications and have their
  // dashboards/queues invalidated when a student submits or an entry is flagged.
  const { addNotification } = useNotificationStore()
  const queryClient = useQueryClient()
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['mentor'] })
      queryClient.invalidateQueries({ queryKey: ['mentor-priority-queue'] })
      queryClient.invalidateQueries({ queryKey: ['mentor-entries'] })
      queryClient.invalidateQueries({ queryKey: ['flagged-entries'] })
    }
    const notifHandler = (data) => { addNotification(data); refresh() }
    const events = ['entry:submitted', 'entry:critical', 'entry:flagged', 'system:announcement']
    events.forEach(ev => socket.on(ev, notifHandler))
    const sessionHandler = () => queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] })
    socket.on('session:update', sessionHandler)
    return () => {
      events.forEach(ev => socket.off(ev, notifHandler))
      socket.off('session:update', sessionHandler)
    }
  }, [addNotification, queryClient])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.void }}>
      <MentorSidebar
        user={user}
        pendingCount={pendingCount}
        flaggedCount={flaggedCount}
        onLogout={handleLogout}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <MentorTopBar pageTitle={pageTitle} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', boxSizing: 'border-box' }}>
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
