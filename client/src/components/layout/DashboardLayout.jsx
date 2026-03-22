import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import NotificationCenter from './NotificationCenter'
import { useUIStore } from '../../store/uiStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getSocket } from '../../services/socket'

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export default function DashboardLayout() {
    const { sidebarOpen } = useUIStore()
    const location = useLocation()
    const { addNotification, hydrateNotifications, initialized } = useNotificationStore()

    useEffect(() => {
        if (!initialized) hydrateNotifications()
    }, [initialized, hydrateNotifications])

    useEffect(() => {
        const socket = getSocket()
        const handler = (data) => addNotification(data)
        socket.on('entry:submitted', handler)
        socket.on('entry:responded', handler)
        socket.on('entry:critical', handler)
        socket.on('system:announcement', handler)
        socket.on('session:update', handler)

        return () => {
            socket.off('entry:submitted', handler)
            socket.off('entry:responded', handler)
            socket.off('entry:critical', handler)
            socket.off('system:announcement', handler)
            socket.off('session:update', handler)
        }
    }, [addNotification])

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(var(--bg-primary))' }}>
            <Sidebar />
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
