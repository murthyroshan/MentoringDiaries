import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Trash2, UserCheck, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'

export default function UserManagement() {
    const [search, setSearch] = useState('')
    const [role, setRole] = useState('')
    const [page, setPage] = useState(1)
    const [assignModal, setAssignModal] = useState(null) // studentId
    const [selectedMentor, setSelectedMentor] = useState('')
    const { addToast } = useUIStore()
    const qc = useQueryClient()

    const params = new URLSearchParams({ page, limit: 12, ...(search && { search }), ...(role && { role }) })
    const { data, isLoading } = useQuery({
        queryKey: ['users', page, search, role],
        queryFn: () => api.get(`/users?${params}`).then(r => r.data),
    })

    const { data: mentors } = useQuery({
        queryKey: ['mentors-list'],
        queryFn: () => api.get('/users?role=mentor&limit=100').then(r => r.data),
    })

    const deactivate = useMutation({
        mutationFn: (id) => api.delete(`/users/${id}`),
        onSuccess: () => { qc.invalidateQueries(['users']); addToast('User deactivated', 'info') },
        onError: () => addToast('Failed to deactivate user', 'error'),
    })

    const assignMentor = useMutation({
        mutationFn: ({ studentId, mentorId }) => api.patch(`/users/${studentId}/assign-mentor`, { mentorId }),
        onSuccess: () => {
            qc.invalidateQueries(['users'])
            addToast('Mentor assigned!', 'success')
            setAssignModal(null)
        },
        onError: () => addToast('Failed to assign mentor', 'error'),
    })

    const users = data?.data || []
    const pagination = data?.pagination || {}
    const roleBadge = {
        student: { bg: 'rgba(139,92,246,0.1)', color: 'rgb(139,92,246)', border: 'rgba(139,92,246,0.2)' },
        mentor: { bg: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)', border: 'rgba(99,102,241,0.2)' },
        admin: { bg: 'rgba(236,72,153,0.1)', color: 'rgb(236,72,153)', border: 'rgba(236,72,153,0.2)' },
    }

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>User Management</h2>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-40">
                    <Search size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                        className="form-input py-2 text-sm" placeholder="Search by name, email, department..." />
                </div>
                <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }} className="form-input py-2 text-sm w-auto">
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="mentor">Mentors</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center"><p style={{ color: 'rgb(var(--text-muted))' }}>No users found.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr><th>User</th><th>Role</th><th>Department</th><th>Batch</th><th>Mentor</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => {
                                const rc = roleBadge[u.role] || roleBadge.student
                                return (
                                    <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {u.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{u.name}</p>
                                                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ color: 'rgb(var(--text-secondary))' }}>{u.department || '—'}</td>
                                        <td style={{ color: 'rgb(var(--text-muted))' }}>{u.batch || '—'}</td>
                                        <td style={{ color: 'rgb(var(--text-muted))' }}>
                                            {u.assignedMentor?.name || (u.role === 'student' ? '—' : 'N/A')}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {u.role === 'student' && (
                                                    <button onClick={() => setAssignModal(u._id)} className="btn btn-secondary text-xs py-1 px-2">
                                                        <UserCheck size={12} /> Assign
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivate.mutate(u._id) }}
                                                    className="btn btn-danger text-xs py-1 px-2"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                            className={`btn text-sm px-4 py-2 ${page === p ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>
                    ))}
                </div>
            )}

            {/* Assign Mentor Modal */}
            {assignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-sm">
                        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>Assign Mentor</h3>
                        <select value={selectedMentor} onChange={e => setSelectedMentor(e.target.value)} className="form-input mb-4">
                            <option value="">Select a mentor...</option>
                            {(mentors?.data || []).map(m => (
                                <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                            ))}
                        </select>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setAssignModal(null)} className="btn btn-secondary">Cancel</button>
                            <button
                                onClick={() => assignMentor.mutate({ studentId: assignModal, mentorId: selectedMentor })}
                                disabled={!selectedMentor || assignMentor.isPending}
                                className="btn btn-primary"
                            >
                                {assignMentor.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Assign'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
