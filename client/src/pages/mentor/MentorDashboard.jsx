import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import StatCard from '../../components/ui/StatCard'
import RiskBadge from '../../components/ui/RiskBadge'
import api from '../../services/api'

const priorityStyle = {
    1: { label: 'Critical risk', bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    2: { label: 'High risk', bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
    3: { label: 'Pending responses', bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
    4: { label: 'Reviewed entries', bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
}

export default function MentorDashboard() {
    const { user } = useAuthStore()

    const { data: queueData, isLoading } = useQuery({
        queryKey: ['mentor-priority-queue'],
        queryFn: () => api.get('/diary/priority-queue?limit=20').then((r) => r.data),
    })

    const { data: effData } = useQuery({
        queryKey: ['mentor-efficiency'],
        queryFn: () => api.get('/analytics/mentor-efficiency').then((r) => r.data),
    })

    const entries = queueData?.data || []
    const myEfficiency = effData?.data?.find((e) => e._id === user?._id)
    const criticalCount = entries.filter((e) => e.priorityRank === 1).length
    const pendingCount = entries.filter((e) => e.priorityRank === 3).length

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                    Mentor Dashboard
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Welcome back, {user?.name}</p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Priority Queue" value={entries.length} icon={AlertTriangle} color="red" loading={isLoading} />
                <StatCard title="Critical Risk" value={criticalCount} icon={AlertTriangle} color="red" loading={isLoading} />
                <StatCard title="Pending Responses" value={pendingCount} icon={Clock} color="violet" loading={isLoading} />
                <StatCard title="Review Rate" value={myEfficiency?.reviewRate || 0} subtitle="% entries reviewed" icon={Users} color="green" loading={isLoading} />
            </div>

            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                    <h3 className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Mentor Priority Queue</h3>
                    <Link to="/mentor/entries" className="text-sm flex items-center gap-1" style={{ color: 'rgb(139,92,246)' }}>
                        Full list <ArrowRight size={14} />
                    </Link>
                </div>
                {isLoading ? (
                    <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                ) : entries.length === 0 ? (
                    <div className="p-12 text-center"><p style={{ color: 'rgb(var(--text-muted))' }}>No entries in queue.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Risk Level</th>
                                <th>Submitted</th>
                                <th>Priority</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => {
                                const style = priorityStyle[e.priorityRank] || priorityStyle[4]
                                return (
                                    <tr key={e._id}>
                                        <td>
                                            <p className="font-medium text-sm">{e.student?.name}</p>
                                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{e.student?.department} • {e.student?.batch}</p>
                                        </td>
                                        <td><RiskBadge level={e.aiAnalysis?.riskLevel} /></td>
                                        <td style={{ color: 'rgb(var(--text-muted))' }}>{format(new Date(e.createdAt), 'dd MMM yyyy')}</td>
                                        <td>
                                            <span className="badge text-xs" style={{ background: style.bg, color: style.color, border: 'none' }}>
                                                {style.label}
                                            </span>
                                        </td>
                                        <td>
                                            <Link to={`/mentor/entries/${e._id}/review`} className="btn btn-primary text-xs py-1 px-3">Review</Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

