import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
    LayoutDashboard, BookOpen, PlusCircle, BookMarked,
    Users, Flag, BarChart3, ShieldAlert, Settings,
    ChevronLeft, ChevronRight, LogOut, Moon, Sun,
    GraduationCap, UserCheck, CalendarDays
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'

const studentNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/submit', icon: PlusCircle, label: 'Submit Entry' },
    { to: '/my-entries', icon: BookOpen, label: 'My Entries' },
    { to: '/timeline', icon: UserCheck, label: 'Timeline' },
    { to: '/sessions', icon: CalendarDays, label: 'Sessions' },
    { to: '/portfolio', icon: BookMarked, label: 'Portfolio' },
]

const mentorNav = [
    { to: '/mentor', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/mentor/students', icon: Users, label: 'My Students' },
    { to: '/mentor/sessions', icon: CalendarDays, label: 'Sessions' },
    { to: '/mentor/flagged', icon: Flag, label: 'Flagged Entries' },
]

const adminNav = [
    { to: '/admin', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/users', icon: Users, label: 'User Management' },
    { to: '/admin/entries', icon: BookMarked, label: 'All Entries' },
    { to: '/admin/risk-monitor', icon: ShieldAlert, label: 'Risk Monitor' },
]

const navByRole = { student: studentNav, mentor: mentorNav, admin: adminNav }

export default function Sidebar() {
    const { user, logout } = useAuthStore()
    const { sidebarOpen, toggleSidebar, setSidebarOpen, darkMode, toggleDarkMode } = useUIStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)

    // Track viewport width
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024)
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Close sidebar on route change (mobile only)
    useEffect(() => {
        if (isMobile) setSidebarOpen(false)
    }, [location.pathname, isMobile, setSidebarOpen])

    const navItems = navByRole[user?.role] || []

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const handleNavClick = () => {
        if (isMobile) setSidebarOpen(false)
    }

    const roleLabel = { student: 'Student', mentor: 'Mentor', admin: 'Administrator' }
    const roleColor = { student: 'text-violet-400', mentor: 'text-indigo-400', admin: 'text-pink-400' }

    return (
        <>
            {/* Mobile overlay backdrop */}
            <AnimatePresence>
                {isMobile && sidebarOpen && (
                    <motion.div
                        key="sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

        <motion.aside
            initial={false}
            animate={isMobile
                ? { x: sidebarOpen ? 0 : -280, width: 256 }
                : { x: 0, width: sidebarOpen ? 256 : 72 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed lg:relative inset-y-0 left-0 h-screen lg:h-full flex-shrink-0 z-50 lg:z-20 flex flex-col overflow-hidden"
            style={{
                background: 'rgb(var(--bg-card))',
                borderRight: '1px solid rgb(var(--border-color))',
            }}
        >
            {/* Header */}
            <div className="flex items-center h-16 px-4 shrink-0" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                <AnimatePresence mode="wait">
                    {sidebarOpen ? (
                        <motion.div
                            key="full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 flex-1 min-w-0"
                        >
                            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
                                <GraduationCap size={16} color="white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate" style={{ color: 'rgb(var(--text-primary))' }}>MentorDiaries</p>
                                <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>AI Powered</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                                <GraduationCap size={16} color="white" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={toggleSidebar}
                    className="btn btn-ghost ml-auto p-1.5 shrink-0"
                    style={{ borderRadius: '0.5rem' }}
                >
                    {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* User Profile */}
            <div className="px-3 py-4 shrink-0" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                <div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'justify-center'}`}>
                    <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user?.initials || user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="min-w-0"
                            >
                                <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                                    {user?.name}
                                </p>
                                <p className={`text-xs font-medium ${roleColor[user?.role]}`}>
                                    {roleLabel[user?.role]}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard' || item.to === '/mentor' || item.to === '/admin'}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        <item.icon size={18} className="shrink-0" />
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="truncate"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="px-2 pb-4 pt-2 space-y-1 shrink-0" style={{ borderTop: '1px solid rgb(var(--border-color))' }}>
                <button
                    onClick={toggleDarkMode}
                    className="nav-link w-full"
                    title={darkMode ? 'Light Mode' : 'Dark Mode'}
                >
                    {darkMode ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {darkMode ? 'Light Mode' : 'Dark Mode'}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
                <button onClick={handleLogout} className="nav-link w-full text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut size={18} className="shrink-0" />
                    <AnimatePresence>
                        {sidebarOpen && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                Sign Out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
        </>
    )
}
