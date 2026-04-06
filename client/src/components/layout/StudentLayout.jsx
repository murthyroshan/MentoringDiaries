import { useEffect, useCallback, useState, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, PenLine, BookOpen, TrendingUp,
  CalendarDays, Award, Bell, Search, Menu,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useUIStore } from '../../store/uiStore'
import { getSocket } from '../../services/socket'
import Sidebar from './Sidebar'

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  void:   '#06060A',
  gold:   '#E8B84B',
  text:   '#F2F0E8',
  muted:  'rgba(242,240,232,0.45)',
  border: 'rgba(255,255,255,0.05)',
}

// ─── Nav items passed to shared Sidebar ───────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/student/dashboard' },
  { icon: PenLine,         label: 'Write Entry', path: '/student/submit'    },
  { icon: BookOpen,        label: 'My Entries',  path: '/student/entries'   },
  { icon: TrendingUp,      label: 'Timeline',    path: '/student/timeline'  },
  { icon: CalendarDays,    label: 'Sessions',    path: '/student/sessions'  },
  { icon: Award,           label: 'Portfolio',   path: '/student/portfolio' },
]

const PAGE_TITLES = {
  '/student/dashboard': 'Dashboard',
  '/student/submit':    'Write Entry',
  '/student/entries':   'My Entries',
  '/student/timeline':  'Timeline',
  '/student/sessions':  'Sessions',
  '/student/portfolio': 'Portfolio',
}

// ─── Notification type colors ─────────────────────────────────────────────────
const NOTIF_COLORS = {
  'entry:submitted':     '#6366f1',
  'entry:responded':     '#22c55e',
  'entry:critical':      '#ef4444',
  'system:announcement': '#64748b',
  'session:update':      '#f59e0b',
}

// ─── Notification dropdown ────────────────────────────────────────────────────
function StudentNotifDropdown({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()
  const recent = notifications.slice(0, 15)
  return (
    <div style={{
      position: 'absolute', top: '48px', right: 0,
      width: '320px', maxHeight: '400px',
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
        <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: '#ef4444', borderRadius: '999px', padding: '1px 6px' }}>
              {unreadCount}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '11px' }}>
              ✓ All read
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {recent.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'rgba(242,240,232,0.2)' }}>No notifications yet</p>
          </div>
        ) : recent.map(n => (
          <button
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            style={{
              width: '100%', textAlign: 'left',
              background: n.read ? 'transparent' : 'rgba(232,184,75,0.04)',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
              padding: '10px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: '4px',
              background: NOTIF_COLORS[n.type] || '#6366f1',
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title || 'Notification'}
              </p>
              <p style={{ fontSize: '11px', color: C.muted, margin: '2px 0 0', lineHeight: 1.4 }}>{n.message}</p>
              <p style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)', margin: '3px 0 0' }}>
                {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
              </p>
            </div>
            {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, flexShrink: 0, marginTop: '5px' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ pageTitle, unreadCount, onWriteEntry }) {
  const { setSidebarOpen } = useUIStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const notifRef = useRef(null)
  const navigate = useNavigate()

  // Close notification panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const NAV_SEARCH = [
    { label: 'Dashboard',   path: '/student/dashboard' },
    { label: 'Write Entry', path: '/student/submit' },
    { label: 'My Entries',  path: '/student/entries' },
    { label: 'Timeline',    path: '/student/timeline' },
    { label: 'Sessions',    path: '/student/sessions' },
    { label: 'Portfolio',   path: '/student/portfolio' },
  ]
  const results = searchVal.trim()
    ? NAV_SEARCH.filter(x => x.label.toLowerCase().includes(searchVal.toLowerCase()))
    : NAV_SEARCH

  // Determine if mobile — evaluated once on render, sidebar toggle only needed on mobile
  const isMobile = window.innerWidth < 1024

  return (
    <header style={{
      position: 'sticky', top: 0, height: '60px',
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 40, flexShrink: 0, boxSizing: 'border-box', gap: '12px',
    }}>
      {/* Left: hamburger (mobile only) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '10px', color: C.muted, flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <span style={{
          fontSize: '17px', fontWeight: 600, color: '#fff',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pageTitle}
        </span>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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

        {/* Bell with dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            style={{
              position: 'relative',
              background: notifOpen ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)',
              border: 'none', borderRadius: '10px', padding: '7px',
              color: notifOpen ? C.gold : C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '5px', right: '5px',
                width: '8px', height: '8px',
                background: '#ef4444', borderRadius: '50%',
                border: '1.5px solid rgba(6,6,10,0.85)',
              }} />
            )}
          </button>
          {notifOpen && <StudentNotifDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Write Entry */}
        <button
          onClick={onWriteEntry}
          style={{
            background: 'rgba(232,184,75,0.1)',
            border: '1px solid rgba(232,184,75,0.2)',
            borderRadius: '10px', padding: '6px 12px',
            color: C.gold, cursor: 'pointer',
            fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          Write Entry +
        </button>
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
              <Search size={16} color={C.gold} />
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
              <kbd style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', padding: '2px 6px' }}>ESC</kbd>
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
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,184,75,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.2)' }}>{item.path}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── StudentLayout ─────────────────────────────────────────────────────────────
export default function StudentLayout() {
  const { addNotification, hydrateNotifications, initialized, unreadCount } = useNotificationStore()
  const { setSidebarOpen } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const queryClient = useQueryClient()

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Dashboard'

  // Hydrate notifications once on mount
  useEffect(() => {
    if (!initialized) hydrateNotifications()
  }, [initialized, hydrateNotifications])

  // Socket listeners
  const stableAdd = useCallback((data) => addNotification(data), [addNotification])
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = (data) => {
      stableAdd(data)
      queryClient.invalidateQueries({ queryKey: ['my-entries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-entries'] })
      queryClient.invalidateQueries({ queryKey: ['student-overview'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    socket.on('entry:responded', handler)
    const sessionHandler = () => {
      queryClient.invalidateQueries({ queryKey: ['student-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['student-sessions-dashboard'] })
    }
    socket.on('session:update', sessionHandler)
    const notifHandler = (data) => stableAdd(data)
    const notifEvents = ['entry:critical', 'system:announcement', 'entry:submitted']
    notifEvents.forEach(ev => socket.on(ev, notifHandler))
    return () => {
      socket.off('entry:responded', handler)
      socket.off('session:update', sessionHandler)
      notifEvents.forEach(ev => socket.off(ev, notifHandler))
    }
  }, [stableAdd, queryClient])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.void }}>
      {/* Shared collapsible sidebar */}
      <Sidebar navItems={NAV_ITEMS} />

      {/* Main area — flex-1 fills all remaining width */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <TopBar
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          onWriteEntry={() => navigate('/student/submit')}
        />

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', boxSizing: 'border-box' }}>
          {reducedMotion ? (
            <Outlet />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
