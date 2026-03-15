import { useMemo } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationStore } from '../../store/notificationStore'

const TYPE_STYLES = {
    'entry:submitted': 'bg-indigo-500',
    'entry:responded': 'bg-green-500',
    'entry:critical': 'bg-red-500',
    'system:announcement': 'bg-slate-500',
    'session:update': 'bg-amber-500',
}

export default function NotificationCenter() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()

    const recent = useMemo(() => notifications.slice(0, 20), [notifications])

    return (
        <div className="glass-card h-full flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                <div className="flex items-center gap-2">
                    <Bell size={16} />
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Notifications</p>
                    {unreadCount > 0 && (
                        <span className="badge text-xs px-2 py-0.5 bg-red-500 text-white border-0">{unreadCount}</span>
                    )}
                </div>
                <button className="btn btn-ghost text-xs py-1 px-2" onClick={markAllRead}>
                    <CheckCheck size={14} /> Mark all read
                </button>
            </div>

            <div className="overflow-y-auto flex-1">
                {recent.length === 0 ? (
                    <div className="p-6 text-center">
                        <Bell size={20} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>No notifications yet</p>
                    </div>
                ) : (
                    recent.map((n) => (
                        <button
                            key={n.id}
                            className="w-full px-4 py-3 text-left flex items-start gap-3"
                            style={{ borderBottom: '1px solid rgb(var(--border-color) / 0.4)' }}
                            onClick={() => !n.read && markRead(n.id)}
                        >
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_STYLES[n.type] || 'bg-indigo-500'}`} />
                            <div className="min-w-0">
                                <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                    {n.title || 'Notification'}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>{n.message}</p>
                                <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                                    {formatDistanceToNow(new Date(n.at), { addSuffix: true })}
                                </p>
                            </div>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />}
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}

