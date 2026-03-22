import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

const breadcrumbMap = {
    '/dashboard': 'Dashboard',
    '/submit': 'Submit Entry',
    '/my-entries': 'My Entries',
    '/timeline': 'Timeline',
    '/sessions': 'My Sessions',
    '/portfolio': 'Portfolio',
    '/mentor': 'Mentor Dashboard',
    '/mentor/students': 'My Students',
    '/mentor/entries': 'Student Entries',
    '/mentor/sessions': 'Mentoring Sessions',
    '/mentor/flagged': 'Flagged Entries',
    '/admin': 'Analytics Overview',
    '/admin/users': 'User Management',
    '/admin/entries': 'All Entries',
    '/admin/risk-monitor': 'Risk Monitor',
}

const notifColors = {
    'entry:submitted': 'bg-indigo-500',
    'entry:responded': 'bg-green-500',
    'entry:critical': 'bg-red-500',
    'system:announcement': 'bg-slate-500',
    'session:update': 'bg-amber-500',
}

export default function Navbar() {
    const location = useLocation()
    const { user } = useAuthStore()
    const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore()
    const { toggleSidebar } = useUIStore()
    const [showNotifs, setShowNotifs] = useState(false)
    const notifRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const title = breadcrumbMap[location.pathname] || 'Mentoring Diaries'

    return (
        <header
            className="h-16 flex items-center justify-between px-6 shrink-0"
            style={{
                background: 'rgb(var(--bg-card))',
                borderBottom: '1px solid rgb(var(--border-color))',
            }}
        >
            {/* Left: hamburger (mobile) + breadcrumb */}
            <div className="flex items-center gap-3">
                <button
                    className="lg:hidden p-2 rounded-xl btn-ghost"
                    onClick={toggleSidebar}
                    aria-label="Toggle menu"
                >
                    <Menu size={18} />
                </button>
                <div>
                    <h1 className="text-base font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                        {title}
                    </h1>
                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* Right: Notifications */}
            <div className="flex items-center gap-3">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead() }}
                        className="relative p-2 rounded-xl btn-ghost"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </motion.span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifs && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-12 w-80 glass-card overflow-hidden z-50"
                            >
                                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                                        Notifications
                                    </p>
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No notifications yet</p>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((n) => (
                                            <button
                                                key={n.id}
                                                className="w-full text-left flex items-start gap-3 px-4 py-3"
                                                style={{ borderBottom: '1px solid rgb(var(--border-color) / 0.5)' }}
                                                onClick={() => !n.read && markRead(n.id)}
                                            >
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notifColors[n.type] || 'bg-indigo-500'}`} />
                                                <div className="min-w-0">
                                                    <p className="text-xs" style={{ color: 'rgb(var(--text-primary))' }}>{n.message}</p>
                                                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                                                        {new Date(n.at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                    {user?.initials || user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
            </div>
        </header>
    )
}
