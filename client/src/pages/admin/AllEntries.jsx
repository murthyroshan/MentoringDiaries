import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Download, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'

export default function AllEntries() {
    const [search, setSearch] = useState('')
    const [sentiment, setSentiment] = useState('')
    const [riskLevel, setRiskLevel] = useState('')
    const [sortBy, setSortBy] = useState('createdAt')
    const [sortOrder, setSortOrder] = useState('desc')
    const [page, setPage] = useState(1)

    const params = new URLSearchParams({
        page, limit: 15,
        ...(search && { search }),
        ...(sentiment && { sentiment }),
        ...(riskLevel && { riskLevel }),
        sortBy, sortOrder,
    })

    const { data, isLoading } = useQuery({
        queryKey: ['admin-entries', page, search, sentiment, riskLevel, sortBy, sortOrder],
        queryFn: () => api.get(`/diary?${params}`).then(r => r.data),
        keepPreviousData: true,
    })

    const entries = data?.data || []
    const pagination = data?.pagination || {}

    const handleExport = async () => {
        const res = await api.get('/analytics/export/csv', { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url; a.download = 'mentoring_analytics.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                    All Entries
                    {pagination.total != null && (
                        <span className="ml-2 text-sm font-normal" style={{ color: 'rgb(var(--text-muted))' }}>
                            ({pagination.total} total)
                        </span>
                    )}
                </h2>
                <button onClick={handleExport} className="btn btn-secondary text-sm">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-40">
                    <Search size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="form-input py-2 text-sm" placeholder="Search students, content..." />
                </div>
                <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(1) }} className="form-input py-2 text-sm w-auto">
                    <option value="">All Sentiments</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                </select>
                <select value={riskLevel} onChange={e => { setRiskLevel(e.target.value); setPage(1) }} className="form-input py-2 text-sm w-auto">
                    <option value="">All Risk Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
                <select value={`${sortBy}-${sortOrder}`}
                    onChange={e => { const [s, o] = e.target.value.split('-'); setSortBy(s); setSortOrder(o); setPage(1) }}
                    className="form-input py-2 text-sm w-auto"
                >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="aiAnalysis.riskScore-desc">Highest Risk</option>
                </select>
            </div>

            <div className="glass-card overflow-x-auto">
                {isLoading ? (
                    <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                ) : entries.length === 0 ? (
                    <div className="p-12 text-center"><p style={{ color: 'rgb(var(--text-muted))' }}>No entries found.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr><th>Student</th><th>Week</th><th>Date</th><th>Sentiment</th><th>Risk</th><th>Mentor</th><th>Status</th><th></th></tr>
                        </thead>
                        <tbody>
                            {entries.map((e, i) => (
                                <motion.tr key={e._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                                    <td>
                                        <p className="font-medium text-sm">{e.student?.name}</p>
                                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{e.student?.department} · {e.student?.batch}</p>
                                    </td>
                                    <td>W{e.week}</td>
                                    <td style={{ color: 'rgb(var(--text-muted))' }}>
                                        {format(new Date(e.createdAt), 'MMM d, yy')}
                                    </td>
                                    <td><SentimentChip sentiment={e.aiAnalysis?.sentiment} /></td>
                                    <td><RiskBadge level={e.aiAnalysis?.riskLevel} showScore score={e.aiAnalysis?.riskScore} /></td>
                                    <td style={{ color: 'rgb(var(--text-secondary))' }}>{e.mentor?.name || '—'}</td>
                                    <td>
                                        <span className="badge" style={{
                                            background: e.status === 'reviewed' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                                            color: e.status === 'reviewed' ? 'rgb(34,197,94)' : 'rgb(99,102,241)',
                                            border: `1px solid ${e.status === 'reviewed' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                                        }}>{e.status}</span>
                                    </td>
                                    <td>
                                        <Link to={`/admin/entries/${e._id}`} className="btn btn-ghost text-xs py-1 px-2">View</Link>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                            className={`btn text-sm px-4 py-2 ${page === p ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
                    ))}
                </div>
            )}
        </div>
    )
}
