import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarCheck } from 'lucide-react'
import api from '../../services/api'

export default function StudentSessions() {
    const { data, isLoading } = useQuery({
        queryKey: ['student-sessions'],
        queryFn: () => api.get('/sessions').then((r) => r.data),
    })

    const sessions = data?.data || []

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>My Mentoring Sessions</h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    Review upcoming and past sessions with your mentor.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
            ) : sessions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <CalendarCheck size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No sessions scheduled yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => (
                        <div key={s._id} className="glass-card p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                                    {format(new Date(s.date), 'dd MMM yyyy, hh:mm a')}
                                </p>
                                {s.followUpDate && (
                                    <span className="badge text-xs">
                                        Follow-up {format(new Date(s.followUpDate), 'dd MMM yyyy')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                {s.agenda || 'No agenda specified'}
                            </p>
                            {s.discussionNotes && (
                                <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                    Notes: {s.discussionNotes}
                                </p>
                            )}
                            {Array.isArray(s.actionItems) && s.actionItems.length > 0 && (
                                <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                    Action items: {s.actionItems.join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

