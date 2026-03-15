import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarCheck, Save } from 'lucide-react'
import api from '../../services/api'

function SessionForm({ students, onSubmit, saving }) {
    const [form, setForm] = useState({
        student: '',
        date: '',
        agenda: '',
        discussionNotes: '',
        actionItems: '',
        followUpDate: '',
    })

    return (
        <div className="glass-card p-4 space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Create Mentoring Session</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                    className="form-input"
                    value={form.student}
                    onChange={(e) => setForm((s) => ({ ...s, student: e.target.value }))}
                >
                    <option value="">Select student</option>
                    {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <input
                    type="datetime-local"
                    className="form-input"
                    value={form.date}
                    onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                />
                <input
                    className="form-input"
                    placeholder="Agenda"
                    value={form.agenda}
                    onChange={(e) => setForm((s) => ({ ...s, agenda: e.target.value }))}
                />
                <input
                    type="date"
                    className="form-input"
                    value={form.followUpDate}
                    onChange={(e) => setForm((s) => ({ ...s, followUpDate: e.target.value }))}
                />
            </div>
            <textarea
                className="form-input"
                rows={3}
                placeholder="Discussion notes"
                value={form.discussionNotes}
                onChange={(e) => setForm((s) => ({ ...s, discussionNotes: e.target.value }))}
            />
            <textarea
                className="form-input"
                rows={2}
                placeholder="Action items (one per line)"
                value={form.actionItems}
                onChange={(e) => setForm((s) => ({ ...s, actionItems: e.target.value }))}
            />
            <button
                className="btn btn-primary text-sm"
                disabled={saving || !form.student || !form.date}
                onClick={() => onSubmit({
                    ...form,
                    actionItems: form.actionItems.split('\n').map((v) => v.trim()).filter(Boolean),
                })}
            >
                <Save size={14} /> {saving ? 'Saving...' : 'Save Session'}
            </button>
        </div>
    )
}

export default function MentorSessions() {
    const queryClient = useQueryClient()
    const [editingId, setEditingId] = useState(null)
    const [editingNotes, setEditingNotes] = useState('')

    const { data: sessionsData, isLoading } = useQuery({
        queryKey: ['mentor-sessions'],
        queryFn: () => api.get('/sessions').then((r) => r.data),
    })

    const { data: studentsData } = useQuery({
        queryKey: ['mentor-students'],
        queryFn: () => api.get('/users?role=student').then((r) => r.data),
    })

    const createMutation = useMutation({
        mutationFn: (payload) => api.post('/sessions', payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] }),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => api.patch(`/sessions/${id}`, payload),
        onSuccess: () => {
            setEditingId(null)
            setEditingNotes('')
            queryClient.invalidateQueries({ queryKey: ['mentor-sessions'] })
        },
    })

    const sessions = useMemo(() => sessionsData?.data || [], [sessionsData])
    const students = studentsData?.data || []

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Mentoring Sessions</h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    Create and manage student mentoring sessions.
                </p>
            </div>

            <SessionForm students={students} onSubmit={(payload) => createMutation.mutate(payload)} saving={createMutation.isPending} />

            <div className="glass-card overflow-hidden">
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgb(var(--border-color))' }}>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Session Queue</p>
                </div>
                {isLoading ? (
                    <div className="p-5 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div>
                ) : sessions.length === 0 ? (
                    <div className="p-10 text-center">
                        <CalendarCheck size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No sessions yet.</p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'rgb(var(--border-color))' }}>
                        {sessions.map((s) => (
                            <div key={s._id} className="p-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                                        {s.student?.name} • {format(new Date(s.date), 'dd MMM yyyy, hh:mm a')}
                                    </p>
                                    {s.followUpDate && (
                                        <span className="badge text-xs">Follow-up: {format(new Date(s.followUpDate), 'dd MMM')}</span>
                                    )}
                                </div>
                                <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{s.agenda || 'No agenda provided'}</p>
                                {editingId === s._id ? (
                                    <div className="space-y-2">
                                        <textarea
                                            className="form-input"
                                            rows={3}
                                            value={editingNotes}
                                            onChange={(e) => setEditingNotes(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-primary text-xs"
                                                onClick={() => updateMutation.mutate({ id: s._id, payload: { discussionNotes: editingNotes } })}
                                                disabled={updateMutation.isPending}
                                            >
                                                Save
                                            </button>
                                            <button className="btn btn-ghost text-xs" onClick={() => setEditingId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{s.discussionNotes || 'No discussion notes yet.'}</p>
                                        <button
                                            className="btn btn-ghost text-xs py-1 px-2"
                                            onClick={() => { setEditingId(s._id); setEditingNotes(s.discussionNotes || '') }}
                                        >
                                            Update
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
