import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, User, BookOpen, Target, AlertCircle, Clock, CheckCircle, Paperclip } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'
import AIAnalysisPanel from '../components/ai/AIAnalysisPanel'
import RiskBadge from '../components/ui/RiskBadge'
import SentimentChip from '../components/ui/SentimentChip'
import { useAuthStore } from '../store/authStore'

const moodEmoji = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '😄' }

export default function EntryDetail() {
    const { id } = useParams()
    const { user } = useAuthStore()

    const { data, isLoading } = useQuery({
        queryKey: ['entry', id],
        queryFn: () => api.get(`/diary/${id}`).then(r => r.data.data),
    })

    const entry = data

    // Determine back link by role
    const backLink = user?.role === 'admin' ? '/admin/entries'
        : user?.role === 'mentor' ? '/mentor/students'
            : '/my-entries'

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="skeleton h-8 w-48" />
                <div className="skeleton h-64 rounded-2xl" />
                <div className="skeleton h-48 rounded-2xl" />
            </div>
        )
    }

    if (!entry) return <div className="text-center py-20"><p style={{ color: 'rgb(var(--text-muted))' }}>Entry not found.</p></div>

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={backLink} className="btn btn-secondary p-2">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1">
                    <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                        Week {entry.week} — {entry.academicYear}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                            <Calendar size={11} className="inline mr-1" />
                            {format(new Date(entry.createdAt), 'MMMM d, yyyy')}
                        </span>
                        {user?.role !== 'student' && entry.student && (
                            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                · <User size={11} className="inline" /> {entry.student.name} ({entry.student.department} · {entry.student.batch})
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <SentimentChip sentiment={entry.aiAnalysis?.sentiment} />
                    <RiskBadge level={entry.aiAnalysis?.riskLevel} showScore score={entry.aiAnalysis?.riskScore} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Meta cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card p-4 text-center">
                            <p className="text-2xl">{moodEmoji[entry.mood] || '😐'}</p>
                            <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Mood</p>
                        </div>
                        {entry.attendancePercentage != null && (
                            <div className="glass-card p-4 text-center">
                                <p className="text-xl font-bold" style={{ color: entry.attendancePercentage < 75 ? 'rgb(239,68,68)' : 'rgb(34,197,94)' }}>
                                    {entry.attendancePercentage}%
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Attendance</p>
                            </div>
                        )}
                        <div className="glass-card p-4 text-center">
                            <span className="badge text-xs" style={{
                                background: entry.status === 'reviewed' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                                color: entry.status === 'reviewed' ? 'rgb(34,197,94)' : 'rgb(99,102,241)',
                                border: `1px solid ${entry.status === 'reviewed' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                            }}>
                                {entry.status === 'reviewed' ? <CheckCircle size={11} className="inline mr-1" /> : <Clock size={11} className="inline mr-1" />}
                                {entry.status}
                            </span>
                            <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Status</p>
                        </div>
                    </div>

                    {/* Content Sections */}
                    {[
                        { label: 'Main Entry', content: entry.content, icon: BookOpen },
                        { label: 'Academic Performance', content: entry.academicPerformance, icon: Target },
                        { label: 'Challenges Faced', content: entry.challenges, icon: AlertCircle },
                        { label: 'Goals for Next Week', content: entry.goals, icon: Target },
                    ].filter(s => s.content).map((section, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <section.icon size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                                <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>{section.label}</h4>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgb(var(--text-primary))' }}>
                                {section.content}
                            </p>
                        </motion.div>
                    ))}

                    {/* Mentor Response */}
                    {entry.mentorResponse ? (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="glass-card p-5"
                            style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <User size={15} style={{ color: 'rgb(34,197,94)' }} />
                                <h4 className="text-sm font-semibold" style={{ color: 'rgb(34,197,94)' }}>
                                    Mentor Response
                                    {entry.mentorRespondedAt && (
                                        <span className="ml-2 text-xs font-normal" style={{ color: 'rgb(var(--text-muted))' }}>
                                            · {format(new Date(entry.mentorRespondedAt), 'MMM d, HH:mm')}
                                        </span>
                                    )}
                                </h4>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-primary))' }}>{entry.mentorResponse}</p>
                        </motion.div>
                    ) : (
                        user?.role !== 'student' && (
                            <div className="glass-card p-5 text-center" style={{ border: '1px dashed rgb(var(--border-color))' }}>
                                <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No mentor response yet.</p>
                                {user?.role === 'mentor' && (
                                    <Link to={`/mentor/entries/${entry._id}/review`} className="btn btn-primary mt-3 text-sm">
                                        Add Response
                                    </Link>
                                )}
                            </div>
                        )
                    )}

                    {/* File Attachment */}
                    {entry.attachmentUrl && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="glass-card p-5"
                        >
                            <div className="flex items-center gap-3">
                                <Paperclip size={16} style={{ color: 'rgb(99,102,241)' }} />
                                <div className="flex-1">
                                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>Attachment</p>
                                    <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{entry.attachmentName || 'File'}</p>
                                </div>
                                <a
                                    href={entry.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary text-xs py-1 px-3"
                                >
                                    Download
                                </a>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* AI Analysis Sidebar */}
                <div className="space-y-4">
                    <AIAnalysisPanel analysis={entry.aiAnalysis} />
                </div>
            </div>
        </div>
    )
}
