/**
 * Shared collapsible sidebar used by StudentLayout, DashboardLayout (mentor/admin).
 *
 * Props:
 *   navItems: Array<{ icon: LucideIcon, label: string, path: string }>
 *
 * Desktop (≥1024px):
 *   - Always visible, in document flow (position: relative)
 *   - Expands (240px) ↔ collapses (64px) via toggle button on right edge
 *   - Collapsed state persisted in localStorage key 'sidebar-collapsed'
 *   - Icon-only nav with hover tooltips when collapsed
 *
 * Mobile (<1024px):
 *   - Hidden off-screen left by default (position: fixed, x: -280)
 *   - Opens as overlay when sidebarOpen (UIStore) is set to true
 *   - Dark backdrop — click closes; nav click closes; route change closes
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:     '#0C0C12',
  elevated: '#16161F',
  gold:     '#E8B84B',
  text:     '#F2F0E8',
  muted:    'rgba(242,240,232,0.45)',
  border:   'rgba(255,255,255,0.07)',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const fontSize = size <= 28 ? 10 : size <= 32 ? 11 : 13
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(232,184,75,0.15)',
      border: '1.5px solid rgba(232,184,75,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: C.gold, fontSize, fontWeight: 600,
      letterSpacing: '0.03em',
    }}>
      {getInitials(name)}
    </div>
  )
}

// ─── Collapsed tooltip (fixed-positioned to escape overflow:hidden) ────────────
function SidebarTooltip({ label, targetRef }) {
  const [y, setY] = useState(0)
  useEffect(() => {
    if (targetRef.current) {
      const r = targetRef.current.getBoundingClientRect()
      setY(r.top + r.height / 2)
    }
  }, [targetRef])
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        left: '76px',
        top: y,
        transform: 'translateY(-50%)',
        background: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: '8px',
        padding: '6px 12px',
        fontSize: '13px',
        color: C.text,
        pointerEvents: 'none',
        zIndex: 200,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {label}
    </motion.div>
  )
}

// ─── Single nav item ───────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, path, isCollapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const itemRef = useRef(null)
  const location = useLocation()

  const isExact = ['/student/dashboard', '/mentor/dashboard', '/admin/dashboard'].includes(path)
  const isActive = isExact
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(path + '/')

  const bg    = isActive ? 'rgba(255,255,255,0.07)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent'
  const color = isActive ? C.text : hovered ? 'rgba(242,240,232,0.7)' : C.muted

  return (
    <div
      ref={itemRef}
      onMouseEnter={() => { setHovered(true);  if (isCollapsed) setShowTip(true)  }}
      onMouseLeave={() => { setHovered(false); setShowTip(false) }}
    >
      <NavLink
        to={path}
        end={isExact}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: isCollapsed
            ? '10px 0'
            : isActive ? '10px 12px 10px 9px' : '10px 12px',
          borderRadius: '10px',
          borderLeft: isCollapsed ? 'none' : `2px solid ${isActive ? C.gold : 'transparent'}`,
          background: bg,
          color,
          fontSize: '14px',
          fontWeight: isActive ? 500 : 400,
          textDecoration: 'none',
          transition: 'background 0.15s, color 0.15s',
          cursor: 'pointer',
          boxSizing: 'border-box',
          width: '100%',
          overflow: 'hidden',
          outline: isCollapsed && isActive ? `2px solid rgba(232,184,75,0.4)` : 'none',
          outlineOffset: '2px',
        }}
      >
        <Icon
          size={20}
          style={{ color: isActive ? C.gold : 'inherit', flexShrink: 0, transition: 'color 0.15s' }}
        />
        {!isCollapsed && (
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>
        )}
      </NavLink>

      <AnimatePresence>
        {showTip && isCollapsed && (
          <SidebarTooltip label={label} targetRef={itemRef} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Collapse toggle button (sits on sidebar right edge, desktop only) ─────────
function CollapseToggle({ isCollapsed, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      style={{
        position: 'absolute',
        right: '-12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '24px',
        height: '32px',
        background: hovered ? 'rgba(232,184,75,0.1)' : C.elevated,
        border: `1px solid ${hovered ? 'rgba(232,184,75,0.25)' : C.border}`,
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 10,
        color: hovered ? C.gold : 'rgba(242,240,232,0.4)',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
    </button>
  )
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ navItems = [] }) {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  // One-time reset: clear any stale collapsed state from old sidebar version
  useEffect(() => {
    try {
      if (!localStorage.getItem('sidebar-v2')) {
        localStorage.removeItem('sidebar-collapsed')
        localStorage.setItem('sidebar-v2', 'true')
        setIsCollapsed(false)
      }
    } catch {}
  }, [])

  // Track viewport breakpoint
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Resize to desktop → close mobile overlay
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false)
  }, [isMobile, setSidebarOpen])

  // Route change → close mobile overlay
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile, setSidebarOpen])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }, [])

  const handleNavClick = useCallback(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile, setSidebarOpen])

  const handleLogout = async () => {
    try { await logout() } catch {}
    navigate('/login')
  }

  const mobileOpen   = isMobile && sidebarOpen
  const showCollapsed = isCollapsed && !isMobile
  const desktopWidth  = showCollapsed ? 64 : 240

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel ── */}
      <motion.aside
        initial={false}
        animate={{
          x:     isMobile ? (mobileOpen ? 0 : -280) : 0,
          width: isMobile ? 240 : desktopWidth,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          ...(isMobile
            ? { position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50 }
            : { position: 'relative', height: '100%' }
          ),
          flexShrink: 0,
          background: C.dark,
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          // Desktop: 'visible' so the collapse toggle (right:-12px) isn't clipped.
          // Each inner section has its own overflow:hidden for content clipping.
          overflow: isMobile ? 'hidden' : 'visible',
        }}
      >
        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <CollapseToggle isCollapsed={showCollapsed} onToggle={toggleCollapsed} />
        )}

        {/* ── Logo ── */}
        <div style={{
          padding: showCollapsed ? '20px 0' : '20px 20px',
          display: 'flex', alignItems: 'center',
          justifyContent: showCollapsed ? 'center' : 'flex-start',
          gap: '12px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, overflow: 'hidden',
          transition: 'padding 0.3s',
        }}>
          <div style={{
            width: '28px', height: '28px',
            border: `1.5px solid ${C.gold}`, borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: C.gold, fontSize: '9px', fontWeight: 700, lineHeight: 1 }}>MD</span>
          </div>
          <AnimatePresence>
            {!showCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden' }}
              >
                <span style={{ color: C.muted }}>Mentoring</span>
                <span style={{ color: C.gold }}>Diaries</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── User area ── */}
        <div style={{
          padding: showCollapsed ? '12px 0' : '12px 16px',
          display: 'flex', alignItems: 'center',
          justifyContent: showCollapsed ? 'center' : 'flex-start',
          gap: '10px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0, overflow: 'hidden',
          transition: 'padding 0.3s',
        }}>
          <Avatar name={user?.name ?? ''} size={32} />
          <AnimatePresence>
            {!showCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ minWidth: 0, overflow: 'hidden' }}
              >
                <p style={{
                  margin: 0, color: C.text, fontSize: '13px', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.name ?? ''}
                </p>
                <span style={{
                  display: 'inline-block', marginTop: '2px',
                  fontSize: '10px',
                  background: 'rgba(232,184,75,0.1)', color: C.gold,
                  borderRadius: '9999px', padding: '1px 7px',
                  textTransform: 'capitalize', whiteSpace: 'nowrap',
                }}>
                  {user?.role ?? 'User'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1, padding: '8px',
          overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {navItems.map(item => (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isCollapsed={showCollapsed}
              onClick={handleNavClick}
            />
          ))}
        </nav>

        {/* ── Logout ── */}
        <div style={{ padding: '8px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <LogoutButton isCollapsed={showCollapsed} onLogout={handleLogout} />
        </div>
      </motion.aside>
    </>
  )
}

// ─── Logout button ─────────────────────────────────────────────────────────────
function LogoutButton({ isCollapsed, onLogout }) {
  const [hovered, setHovered] = useState(false)
  const btnRef = useRef(null)
  const [showTip, setShowTip] = useState(false)
  return (
    <div
      ref={btnRef}
      onMouseEnter={() => { setHovered(true);  if (isCollapsed) setShowTip(true)  }}
      onMouseLeave={() => { setHovered(false); setShowTip(false) }}
    >
      <button
        onClick={onLogout}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '10px', width: '100%',
          padding: isCollapsed ? '10px 0' : '10px 12px',
          borderRadius: '10px', border: 'none',
          background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
          color: hovered ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.6)',
          cursor: 'pointer', fontSize: '14px',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'inherit', boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <LogOut size={18} style={{ flexShrink: 0 }} />
        {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Sign Out</span>}
      </button>
      <AnimatePresence>
        {showTip && isCollapsed && (
          <SidebarTooltip label="Sign Out" targetRef={btnRef} />
        )}
      </AnimatePresence>
    </div>
  )
}
