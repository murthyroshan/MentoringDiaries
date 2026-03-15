import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'

export default function MentorEntries() {
    const [searchParams] = useSearchParams()
    const studentId = searchParams.get('studentId') || ''
    const [status, setStatus] = useState('')
    const [search, setSearch] = useState('')

    const queryParams = useMemo(() => {
        const p = new URLSearchParams()
        p.set('limit', '50')
        if (studentId) p.set('studentId', studentId)
        if (status) p.set('status', status)
        if (search) p.set('search', search)
        return p.toString()
    }, [studentId, status, search])

    const { data, isLoading } = useQuery({
        queryKey: ['mentor-student-entries', studentId, status, search],
        queryFn: () => api.get(`/diary?${queryParams}`).then((r) => r.data),
    })

    const entries = data?.data || []

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Student Entries</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                    {studentId ? 'Showing entries for selected student.' : 'Showing entries from your assigned students.'}
                </p>
            </div>

            <div className="glass-card p-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-40">
                    <Search size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input py-2 text-sm"
                        placeholder="Search content..."
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="form-input py-2 text-sm w-auto"
                >
                    <option value="">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                ) : entries.length === 0 ? (
                    <div className="p-12 text-center">
                        <p style={{ color: 'rgb(var(--text-muted))' }}>No entries found.</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Period</th>
                                <th>Date</th>
                                <th>Sentiment</th>
                                <th>Risk</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e._id}>
                                    <td>
                                        <p className="font-medium text-sm">{e.student?.name}</p>
                                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                            {e.student?.department} · {e.student?.batch}
                                        </p>
                                    </td>
                                    <td>{e.periodLabel || (e.week ? `Week ${e.week}` : '—')}</td>
                                    <td style={{ color: 'rgb(var(--text-muted))' }}>{format(new Date(e.createdAt), 'MMM d, yyyy')}</td>
                                    <td><SentimentChip sentiment={e.aiAnalysis?.sentiment} /></td>
                                    <td><RiskBadge level={e.aiAnalysis?.riskLevel} showScore score={e.aiAnalysis?.riskScore} /></td>
                                    <td>
                                        <span className="badge" style={{
                                            background: e.status === 'reviewed' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                                            color: e.status === 'reviewed' ? 'rgb(34,197,94)' : 'rgb(99,102,241)',
                                            border: `1px solid ${e.status === 'reviewed' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                                        }}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/mentor/entries/${e._id}/review`} className="btn btn-primary text-xs py-1 px-3">
                                            Review
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
