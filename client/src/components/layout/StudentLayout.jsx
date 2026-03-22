import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, PenLine, BookOpen, TrendingUp,
  CalendarDays, Award, Bell, Settings, Search, LogOut,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getSocket } from '../../services/socket'

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  void:     '#06060A',
  dark:     '#0C0C12',
  surface:  '#111118',
  elevated: '#16161F',
  gold:     '#E8B84B',
  text:     '#F2F0E8',
  muted:    'rgba(242,240,232,0.45)',
  border:   'rgba(255,255,255,0.07)',
}

// ─── Navigation config ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard'  },
  { icon: PenLine,         label: 'Write Entry', path: '/submit'     },
  { icon: BookOpen,        label: 'My Entries',  path: '/my-entries' },
  { icon: TrendingUp,      label: 'Timeline',    path: '/timeline'   },
  { icon: CalendarDays,    label: 'Sessions',    path: '/sessions'   },
  { icon: Award,           label: 'Portfolio',   path: '/portfolio'  },
]

const MOBILE_TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard'  },
  { icon: PenLine,         label: 'Write',     path: '/submit'     },
  { icon: BookOpen,        label: 'Entries',   path: '/my-entries' },
  { icon: CalendarDays,    label: 'Sessions',  path: '/sessions'   },
  { icon: Award,           label: 'Portfolio', path: '/portfolio'  },
]

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/submit':     'Write Entry',
  '/my-entries': 'My Entries',
  '/timeline':   'Timeline',
  '/sessions':   'Sessions',
  '/portfolio':  'Portfolio',
}

const SOCKET_EVENTS = [
  'entry:submitted',
  'entry:responded',
  'entry:critical',
  'system:announcement',
  'session:update',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function isPathActive(itemPath, currentPath) {
  if (itemPath === '/dashboard') return currentPath === itemPath
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/')
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const fontSize = size <= 28 ? 10 : size <= 32 ? 11 : 13
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(232,184,75,0.15)',
      border: '1.5px solid rgba(232,184,75,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: C.gold,
      fontSize,
      fontWeight: 600,
      letterSpacing: '0.03em',
    }}>
      {getInitials(name)}
    </div>
  )
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function SidebarNavItem({ icon: Icon, label, path, currentPath }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const active = isPathActive(path, currentPath)

  let bg = 'transparent'
  let color = 'rgba(242,240,232,0.4)'
  let fontWeight = 400
  if (active) {
    bg = 'rgba(255,255,255,0.07)'
    color = C.text
    fontWeight = 500
  } else if (hovered) {
    bg = 'rgba(255,255,255,0.04)'
    color = 'rgba(242,240,232,0.7)'
  }

  return (
    <button
      onClick={() => navigate(path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: active ? '10px 12px 10px 9px' : '10px 12px',
        borderRadius: '12px',
        border: 'none',
        borderLeft: `3px solid ${active ? C.gold : 'transparent'}`,
        background: bg,
        color,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight,
        transition: 'background 0.15s, color 0.15s',
        boxSizing: 'border-box',
      }}
    >
      <Icon
        size={20}
        style={{ color: active ? C.gold : 'inherit', flexShrink: 0, transition: 'color 0.15s' }}
      />
      <span>{label}</span>
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, unreadCount, currentPath, onLogout }) {
  const [bellHovered, setBellHovered] = useState(false)
  const [settingsHovered, setSettingsHovered] = useState(false)
  const [logoutHovered, setLogoutHovered] = useState(false)
  const initials = getInitials(user?.name ?? '')

  return (
    <aside
      className="hidden lg:flex"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: '240px',
        background: C.dark,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        flexDirection: 'column',
        zIndex: 50,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: `1.5px solid ${C.gold}`,
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: C.gold, fontSize: '9px', fontWeight: 700, lineHeight: 1 }}>MD</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'rgba(242,240,232,0.4)' }}>Mentoring</span>
          <span style={{ color: C.gold }}>Diaries</span>
        </span>
      </div>

      {/* User info */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <Avatar name={user?.name ?? ''} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            margin: 0,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user?.name ?? 'Student'}
          </p>
          <span style={{
            display: 'inline-block',
            marginTop: '3px',
            fontSize: '11px',
            background: 'rgba(232,184,75,0.1)',
            color: C.gold,
            borderRadius: '9999px',
            padding: '1px 8px',
          }}>
            Student
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginTop: '16px',
        padding: '0 12px',
      }}>
        {NAV_ITEMS.map(item => (
          <SidebarNavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            currentPath={currentPath}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '0 12px 20px' }}>
        {/* Separator */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '12px' }} />

        {/* Icon actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
          {/* Bell */}
          <button
            onMouseEnter={() => setBellHovered(true)}
            onMouseLeave={() => setBellHovered(false)}
            style={{
              position: 'relative',
              background: bellHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: 'none',
              color: bellHovered ? 'rgba(242,240,232,0.7)' : 'rgba(242,240,232,0.3)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            <Bell size={18} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    minWidth: '16px',
                    height: '16px',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '9999px',
                    fontSize: '9px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    border: `1.5px solid ${C.dark}`,
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Settings */}
          <button
            onMouseEnter={() => setSettingsHovered(true)}
            onMouseLeave={() => setSettingsHovered(false)}
            style={{
              background: settingsHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: 'none',
              color: settingsHovered ? 'rgba(242,240,232,0.7)' : 'rgba(242,240,232,0.3)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* User + sign out row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar name={user?.name ?? ''} size={28} />
          <span style={{
            flex: 1,
            color: C.text,
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}>
            {user?.name ?? 'Student'}
          </span>
          <button
            onClick={onLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: logoutHovered ? 'rgba(239,68,68,0.7)' : 'rgba(242,240,232,0.3)',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ pageTitle, unreadCount, onWriteEntry }) {
  const [searchHovered, setSearchHovered] = useState(false)
  const [bellHovered, setBellHovered] = useState(false)
  const [writeHovered, setWriteHovered] = useState(false)

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      height: '60px',
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 40,
      flexShrink: 0,
      boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
        {pageTitle}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Search */}
        <button
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
          style={{
            background: searchHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: 'none',
            borderRadius: '12px',
            padding: '8px',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s',
          }}
        >
          <Search size={16} />
        </button>

        {/* Bell */}
        <button
          onMouseEnter={() => setBellHovered(true)}
          onMouseLeave={() => setBellHovered(false)}
          style={{
            position: 'relative',
            background: bellHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: 'none',
            borderRadius: '12px',
            padding: '8px',
            color: C.muted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s',
          }}
        >
          <Bell size={16} />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="topbar-badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  minWidth: '8px',
                  height: '8px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(6,6,10,0.85)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>
        </button>

        {/* Write Entry CTA */}
        <button
          onClick={onWriteEntry}
          onMouseEnter={() => setWriteHovered(true)}
          onMouseLeave={() => setWriteHovered(false)}
          style={{
            background: writeHovered ? 'rgba(232,184,75,0.18)' : 'rgba(232,184,75,0.1)',
            border: '1px solid rgba(232,184,75,0.2)',
            borderRadius: '12px',
            padding: '6px 12px',
            color: C.gold,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          Write Entry +
        </button>
      </div>
    </header>
  )
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
function MobileTabBar({ currentPath }) {
  const navigate = useNavigate()

  return (
    <nav
      className="flex lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(12,12,18,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}
    >
      {MOBILE_TABS.map(({ icon: Icon, label, path }) => {
        const active = isPathActive(path, currentPath)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px',
              color: active ? C.gold : 'rgba(242,240,232,0.35)',
              height: '100%',
              position: 'relative',
              transition: 'color 0.15s',
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: '10px', lineHeight: 1, fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute',
                bottom: '5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '4px',
                background: C.gold,
                borderRadius: '50%',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ─── StudentLayout ─────────────────────────────────────────────────────────────
export default function StudentLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount, addNotification, hydrateNotifications, initialized } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  const currentPath = location.pathname
  const pageTitle = PAGE_TITLES[currentPath] ?? 'Dashboard'

  // Hydrate notifications once on mount if not yet initialized
  useEffect(() => {
    if (!initialized) hydrateNotifications()
  }, [initialized, hydrateNotifications])

  // Socket listeners — same pattern as DashboardLayout
  const stableAdd = useCallback((data) => addNotification(data), [addNotification])
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = (data) => stableAdd(data)
    SOCKET_EVENTS.forEach(ev => socket.on(ev, handler))
    return () => {
      SOCKET_EVENTS.forEach(ev => socket.off(ev, handler))
    }
  }, [stableAdd])

  return (
    <div style={{ background: C.void, minHeight: '100vh', fontFamily: 'inherit' }}>
      {/* Fixed left sidebar — desktop only */}
      <Sidebar
        user={user}
        unreadCount={unreadCount}
        currentPath={currentPath}
        onLogout={logout}
      />

      {/* Main content area — offset by sidebar width on lg+ */}
      <div
        className="lg:ml-[240px]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: C.void,
        }}
      >
        <TopBar
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          onWriteEntry={() => navigate('/submit')}
        />

        <main
          className="lg:pb-8"
          style={{
            flex: 1,
            padding: '32px',
            paddingBottom: '80px',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          {reducedMotion ? (
            <Outlet />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>

      {/* Fixed mobile bottom tab bar — hidden on lg+ */}
      <MobileTabBar currentPath={currentPath} />
    </div>
  )
}
