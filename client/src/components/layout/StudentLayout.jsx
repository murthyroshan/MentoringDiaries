import { useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, PenLine, BookOpen, TrendingUp,
  CalendarDays, Award, Bell, Search, Menu,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useUIStore } from '../../store/uiStore'
import { getSocket } from '../../services/socket'
import Sidebar from './Sidebar'

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
  gold:    '#E8B84B',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  border:  'rgba(255,255,255,0.05)',
}

// ─── Nav items passed to shared Sidebar ───────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/student/dashboard'  },
  { icon: PenLine,         label: 'Write Entry', path: '/student/submit'     },
  { icon: BookOpen,        label: 'My Entries',  path: '/student/entries'    },
  { icon: TrendingUp,      label: 'Timeline',    path: '/student/timeline'   },
  { icon: CalendarDays,    label: 'Sessions',    path: '/student/sessions'   },
  { icon: Award,           label: 'Portfolio',   path: '/student/portfolio'  },
]

const PAGE_TITLES = {
  '/student/dashboard': 'Dashboard',
  '/student/submit':    'Write Entry',
  '/student/entries':   'My Entries',
  '/student/timeline':  'Timeline',
  '/student/sessions':  'Sessions',
  '/student/portfolio': 'Portfolio',
}

const SOCKET_EVENTS = [
  'entry:submitted', 'entry:responded', 'entry:critical',
  'system:announcement', 'session:update',
]

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ pageTitle, unreadCount, onHamburger, onWriteEntry }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      height: '60px',
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 40,
      flexShrink: 0,
      boxSizing: 'border-box',
      gap: '12px',
    }}>
      {/* Left: hamburger (mobile) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <button
          onClick={onHamburger}
          aria-label="Open menu"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '6px', borderRadius: '10px', color: C.muted,
            flexShrink: 0,
          }}
          className="lg:hidden"
        >
          <Menu size={20} />
        </button>
        <span style={{
          fontSize: '17px', fontWeight: 600, color: '#fff',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {pageTitle}
        </span>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Search */}
        <button style={{
          background: 'rgba(255,255,255,0.04)', border: 'none',
          borderRadius: '10px', padding: '7px', color: C.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <Search size={16} />
        </button>

        {/* Bell */}
        <button style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.04)', border: 'none',
          borderRadius: '10px', padding: '7px', color: C.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
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

        {/* Write Entry */}
        <button
          onClick={onWriteEntry}
          style={{
            background: 'rgba(232,184,75,0.1)',
            border: '1px solid rgba(232,184,75,0.2)',
            borderRadius: '10px', padding: '6px 12px',
            color: C.gold, cursor: 'pointer',
            fontSize: '12px', fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          Write Entry +
        </button>
      </div>
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
      // Invalidate relevant queries when mentor responds to an entry
      queryClient.invalidateQueries({ queryKey: ['my-entries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-entries'] })
      queryClient.invalidateQueries({ queryKey: ['student-overview'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    socket.on('entry:responded', handler)
    // Invalidate sessions on session update
    const sessionHandler = () => {
      queryClient.invalidateQueries({ queryKey: ['student-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['student-sessions-dashboard'] })
    }
    socket.on('session:update', sessionHandler)
    // Notification-only events
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
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden', background: C.void,
    }}>
      {/* Shared collapsible sidebar */}
      <Sidebar navItems={NAV_ITEMS} />

      {/* Main area — flex-1 fills all remaining width */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
      }}>
        <TopBar
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          onHamburger={() => setSidebarOpen(true)}
          onWriteEntry={() => navigate('/student/submit')}
        />

        <main style={{
          flex: 1, overflowY: 'auto', padding: '32px',
          boxSizing: 'border-box',
        }}>
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
