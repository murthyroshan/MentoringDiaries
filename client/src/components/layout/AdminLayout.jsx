import { useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, Building2, AlertTriangle, List,
  Users, UserCheck, LogOut, ChevronRight, Menu, ShieldAlert,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import api from '../../services/api'

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

// ─── Top bar ───────────────────────────────────────────────────────────────────
function AdminTopBar({ pageTitle, onHamburger }) {
  return (
    <header style={{
      height: '60px', flexShrink: 0,
      background: 'rgba(6,6,10,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: '12px',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <button
        onClick={onHamburger}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px', color: C.muted, display: 'flex',
          alignItems: 'center',
        }}
      >
        <Menu size={18} />
      </button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>
        {pageTitle}
      </span>
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
        <AdminTopBar
          pageTitle={pageTitle}
          onHamburger={() => setSidebarOpen(true)}
        />
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
