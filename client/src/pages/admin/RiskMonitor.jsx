import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShieldAlert, Download, Clock, ArrowRight } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'

export default function RiskMonitor() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['flagged-all'],
        queryFn: () => api.get('/diary/flagged').then(r => r.data),
        refetchInterval: 30000, // auto-refresh every 30s
    })

    const entries = data?.data || []
    const critical = entries.filter(e => e.aiAnalysis?.riskLevel === 'critical')
    const high = entries.filter(e => e.aiAnalysis?.riskLevel === 'high')

    const handleExportFlagged = async () => {
        const res = await api.get('/analytics/export/flagged', { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url; a.download = 'flagged_entries_report.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <ShieldAlert size={20} style={{ color: 'rgb(239,68,68)' }} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Risk Monitor</h2>
                        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                            {critical.length} critical · {high.length} high risk · Auto-refreshes every 30s
                        </p>
                    </div>
                </div>
                <button onClick={handleExportFlagged} className="btn btn-secondary text-sm">
                    <Download size={15} /> Export Report
                </button>
            </div>

            {/* Critical Alert Banner */}
            {critical.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={20} style={{ color: 'rgb(239,68,68)' }} />
                        <div>
                            <p className="font-semibold text-sm" style={{ color: 'rgb(239,68,68)' }}>
                                ⚠️ {critical.length} CRITICAL risk {critical.length === 1 ? 'entry' : 'entries'} require immediate attention
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                                {critical.map(e => e.student?.name).join(', ')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Entries List */}
            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
            ) : entries.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <ShieldAlert size={36} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>No flagged entries</p>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>All students appear to be doing well.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map((e, i) => {
                        const isCritical = e.aiAnalysis?.riskLevel === 'critical'
                        return (
                            <motion.div
                                key={e._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="glass-card p-5"
                                style={{
                                    borderLeft: `3px solid ${isCritical ? 'rgb(239,68,68)' : 'rgb(249,115,22)'}`,
                                    background: isCritical ? 'rgba(239,68,68,0.025)' : undefined,
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {e.student?.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{e.student?.name}</p>
                                                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                                    {e.student?.department} · {e.student?.batch} · {e.student?.rollNumber}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-sm line-clamp-2 mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>{e.content}</p>

                                        {e.aiAnalysis?.summary && (
                                            <div className="p-3 rounded-lg mb-3" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--text-muted))' }}>AI Summary</p>
                                                <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{e.aiAnalysis.summary}</p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 text-xs flex-wrap">
                                            <span style={{ color: 'rgb(var(--text-muted))' }}>
                                                <Clock size={11} className="inline mr-1" />
                                                {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                                            </span>
                                            <span style={{ color: 'rgb(var(--text-muted))' }}>
                                                Mentor: {e.mentor?.name || 'Unassigned'}
                                            </span>
                                            {e.mentorRespondedAt ? (
                                                <span style={{ color: 'rgb(34,197,94)' }}>✓ Mentor responded</span>
                                            ) : (
                                                <span style={{ color: 'rgb(249,115,22)' }}>⚡ Awaiting mentor response</span>
                                            )}
                                        </div>

                                        {e.aiAnalysis?.keywords?.filter(k => k.severity !== 'neutral').length > 0 && (
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {e.aiAnalysis.keywords.filter(k => k.severity !== 'neutral').map((k, ki) => (
                                                    <span key={ki} className="badge text-xs" style={{
                                                        background: k.severity === 'danger' ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                                                        color: k.severity === 'danger' ? 'rgb(239,68,68)' : 'rgb(249,115,22)',
                                                        border: `1px solid ${k.severity === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
                                                    }}>
                                                        {k.word}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="flex gap-2 flex-wrap justify-end">
                                            <SentimentChip sentiment={e.aiAnalysis?.sentiment} />
                                            <RiskBadge level={e.aiAnalysis?.riskLevel} showScore score={e.aiAnalysis?.riskScore} />
                                        </div>
                                        <Link to={`/admin/entries/${e._id}`} className="btn btn-secondary text-xs py-1.5 px-3">
                                            View <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
