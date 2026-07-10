import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'

export default function StudentsList() {
    const [search, setSearch] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['mentor-students', search],
        queryFn: () => api.get(`/users?role=student&search=${search}`).then(r => r.data),
    })

    const students = data?.data || []

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>My Students</h2>
            </div>

            <div className="glass-card p-4 flex items-center gap-2">
                <Search size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    className="form-input py-2 text-sm" placeholder="Search students..." />
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
            ) : students.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p style={{ color: 'rgb(var(--text-muted))' }}>No students assigned yet.</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr><th>Name</th><th>Dept / Batch</th><th>Roll No.</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {students.map((s, i) => (
                                // API uses SQL-style ids/fields (id, roll_number), not Mongo (_id, rollNumber)
                                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {s.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{s.name}</p>
                                                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'rgb(var(--text-secondary))' }}>{s.department} · {s.batch}</td>
                                    <td style={{ color: 'rgb(var(--text-muted))' }}>{s.roll_number ?? '—'}</td>
                                    <td>
                                        <Link to={`/mentor/entries?studentId=${s.id}`} className="btn btn-secondary text-xs py-1 px-3">View Entries</Link>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
