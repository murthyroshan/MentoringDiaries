import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, BookOpen, PlusCircle, BookMarked,
    Users, Flag, BarChart3, ShieldAlert, CalendarDays, UserCheck,
} from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import NotificationCenter from './NotificationCenter'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getSocket } from '../../services/socket'

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit:    { opacity: 0, y: -8,  transition: { duration: 0.15 } },
}

// ─── Nav items by role ─────────────────────────────────────────────────────────
const NAV_BY_ROLE = {
    student: [
        { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard'   },
        { icon: PlusCircle,      label: 'Submit Entry', path: '/submit'      },
        { icon: BookOpen,        label: 'My Entries',   path: '/my-entries'  },
        { icon: UserCheck,       label: 'Timeline',     path: '/timeline'    },
        { icon: CalendarDays,    label: 'Sessions',     path: '/sessions'    },
        { icon: BookMarked,      label: 'Portfolio',    path: '/portfolio'   },
    ],
    mentor: [
        { icon: LayoutDashboard, label: 'Dashboard',        path: '/mentor'              },
        { icon: Users,           label: 'My Students',      path: '/mentor/students'     },
        { icon: CalendarDays,    label: 'Sessions',         path: '/mentor/sessions'     },
        { icon: Flag,            label: 'Flagged Entries',  path: '/mentor/flagged'      },
    ],
    admin: [
        { icon: BarChart3,   label: 'Analytics',       path: '/admin'              },
        { icon: Users,       label: 'User Management', path: '/admin/users'        },
        { icon: BookMarked,  label: 'All Entries',     path: '/admin/entries'      },
        { icon: ShieldAlert, label: 'Risk Monitor',    path: '/admin/risk-monitor' },
    ],
}

export default function DashboardLayout() {
    const { user } = useAuthStore()
    const location = useLocation()
    const { addNotification, hydrateNotifications, initialized } = useNotificationStore()

    const navItems = NAV_BY_ROLE[user?.role] || []

    useEffect(() => {
        if (!initialized) hydrateNotifications()
    }, [initialized, hydrateNotifications])

    useEffect(() => {
        const socket = getSocket()
        if (!socket) return
        const handler = (data) => addNotification(data)
        const events = ['entry:submitted', 'entry:responded', 'entry:critical', 'system:announcement', 'session:update']
        events.forEach(ev => socket.on(ev, handler))
        return () => events.forEach(ev => socket.off(ev, handler))
    }, [addNotification])

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(var(--bg-primary))' }}>
            <Sidebar navItems={navItems} />
            <div
                className="flex flex-col flex-1 overflow-hidden"
                style={{ minWidth: 0 }}
            >
                <Navbar />
                <div className="flex-1 min-h-0 flex">
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        <motion.div
                            key={location.pathname}
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                        >
                            <Outlet />
                        </motion.div>
                    </main>
                    <aside className="hidden xl:block w-80 border-l p-4" style={{ borderColor: 'rgb(var(--border-color))' }}>
                        <NotificationCenter />
                    </aside>
                </div>
            </div>
        </div>
    )
}
