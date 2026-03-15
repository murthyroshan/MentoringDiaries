import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Flag, ArrowRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'

export default function FlaggedEntries() {
    const { data, isLoading } = useQuery({
        queryKey: ['flagged-entries'],
        queryFn: () => api.get('/diary/flagged').then(r => r.data),
    })

    const entries = data?.data || []

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <Flag size={18} style={{ color: 'rgb(239,68,68)' }} />
                </div>
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Flagged Entries</h2>
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{entries.length} entries requiring attention</p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
            ) : entries.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <Flag size={32} className="mx-auto mb-3 opacity-20" />
                    <p style={{ color: 'rgb(var(--text-muted))' }}>No flagged entries. All clear! ✅</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map((e, i) => (
                        <motion.div key={e._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="glass-card p-5" style={{
                                borderLeft: `3px solid ${e.aiAnalysis?.riskLevel === 'critical' ? 'rgb(239,68,68)' : 'rgb(249,115,22)'}`
                            }}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                                                {e.student?.name}
                                            </p>
                                            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                                {e.student?.department} · {e.student?.batch}
                                            </span>
                                        </div>
                                        <p className="text-xs mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
                                            <Clock size={10} className="inline mr-1" />
                                            Week {e.week} · {format(new Date(e.createdAt), 'MMM d, yyyy')}
                                        </p>
                                        <p className="text-sm line-clamp-2" style={{ color: 'rgb(var(--text-secondary))' }}>{e.content}</p>
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
                                        <Link to={`/mentor/entries/${e._id}/review`} className="btn btn-primary text-xs py-1.5 px-3">
                                            Review <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
