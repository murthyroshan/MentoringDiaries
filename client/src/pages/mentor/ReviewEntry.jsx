import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import AIAnalysisPanel from '../../components/ai/AIAnalysisPanel'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'
import { useUIStore } from '../../store/uiStore'

const moodEmoji = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '😄' }

export default function ReviewEntry() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { addToast } = useUIStore()
    const queryClient = useQueryClient()
    const [response, setResponse] = useState('')
    const [aiSuggestion, setAiSuggestion] = useState(null)

    const { data: entry, isLoading } = useQuery({
        queryKey: ['entry', id],
        queryFn: () => api.get(`/diary/${id}`).then(r => r.data.data),
    })

    const { data: insightHistory } = useQuery({
        queryKey: ['student-weekly-insight-history', entry?.student?._id],
        queryFn: () => api.get(`/analytics/student-weekly-insights/history?studentId=${entry.student._id}`).then((r) => r.data.data),
        enabled: !!entry?.student?._id,
    })

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.patch(`/diary/${id}/response`, { response }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entry', id] })
            queryClient.invalidateQueries({ queryKey: ['mentor-entries'] })
            addToast('Response sent successfully!', 'success')
            navigate('/mentor/dashboard')
        },
        onError: (err) => addToast(err.response?.data?.message || 'Failed to send response', 'error'),
    })

    const { mutate: fetchSuggestion, isPending: loadingSuggestion } = useMutation({
        mutationFn: () => api.get(`/diary/${id}/mentor-suggestion`).then((r) => r.data.data),
        onSuccess: (data) => setAiSuggestion(data),
        onError: (err) => addToast(err.response?.data?.message || 'Could not generate suggestion', 'error'),
    })

    if (isLoading) return (
        <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-96 rounded-2xl" /></div>
    )

    return (
        <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="btn btn-secondary p-2"><ArrowLeft size={16} /></button>
                <div className="flex-1">
                    <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                        Review: Week {entry?.week}
                    </h2>
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                        {entry?.student?.name} · {entry?.student?.department} · {entry?.student?.batch}
                    </p>
                </div>
                <div className="flex gap-2">
                    <SentimentChip sentiment={entry?.aiAnalysis?.sentiment} />
                    <RiskBadge level={entry?.aiAnalysis?.riskLevel} showScore score={entry?.aiAnalysis?.riskScore} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Entry Content */}
                <div className="lg:col-span-2 space-y-4">
                    {entry?.mood && (
                        <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                            Mood: {moodEmoji[entry.mood]} · Attendance: {entry.attendancePercentage ?? 'N/A'}%
                        </p>
                    )}

                    {[
                        { label: 'Main Entry', text: entry?.content },
                        { label: 'Academic Performance', text: entry?.academicPerformance },
                        { label: 'Challenges', text: entry?.challenges },
                        { label: 'Goals', text: entry?.goals },
                    ].filter(s => s.text).map((section, i) => (
                        <div key={i} className="glass-card p-5">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>{section.label}</p>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgb(var(--text-primary))' }}>{section.text}</p>
                        </div>
                    ))}

                    {/* Response Form */}
                    <div className="glass-card p-5">
                        <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>
                            Your Response
                        </p>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary text-xs py-1.5 px-3"
                                onClick={() => fetchSuggestion()}
                                disabled={loadingSuggestion}
                            >
                                {loadingSuggestion ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                Generate AI Suggestion
                            </button>
                            {aiSuggestion?.supportiveResponse && (
                                <button
                                    type="button"
                                    className="btn btn-ghost text-xs py-1.5 px-3"
                                    onClick={() => setResponse((prev) => prev.trim() ? prev : aiSuggestion.supportiveResponse)}
                                >
                                    Use suggestion as draft
                                </button>
                            )}
                        </div>

                        {aiSuggestion && (
                            <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--text-primary))' }}>AI Supportive Response</p>
                                <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>{aiSuggestion.supportiveResponse}</p>
                                {Array.isArray(aiSuggestion.suggestedGuidance) && aiSuggestion.suggestedGuidance.length > 0 && (
                                    <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                        Guidance: {aiSuggestion.suggestedGuidance.join(' • ')}
                                    </p>
                                )}
                                <p className="text-[11px] mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
                                    AI confidence: {aiSuggestion?.confidence >= 0.75 ? 'High' : aiSuggestion?.confidence >= 0.6 ? 'Medium' : 'Low'} ({Number(aiSuggestion?.confidence || 0).toFixed(2)})
                                    {aiSuggestion?.cached ? ' • Cached' : ''}
                                </p>
                            </div>
                        )}

                        <textarea
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            rows={5}
                            className="form-input"
                            placeholder="Provide constructive feedback, encouragement, or action items for this student..."
                        />
                        <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                            Minimum 10 characters · {response.length} typed
                        </p>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
                            <button
                                onClick={() => mutate()}
                                disabled={isPending || response.trim().length < 10}
                                className="btn btn-primary"
                            >
                                {isPending ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <><Send size={15} /> Send Response</>}
                            </button>
                        </div>
                    </div>

                    {Array.isArray(insightHistory) && insightHistory.length > 0 && (
                        <div className="glass-card p-5">
                            <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>
                                Weekly Insight History
                            </p>
                            <div className="space-y-2">
                                {insightHistory.slice(0, 6).map((item, idx) => (
                                    <div key={idx} className="rounded-lg p-2 text-xs" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                        <p style={{ color: 'rgb(var(--text-primary))' }}>
                                            Week {idx + 1}: Sentiment {item.sentimentTrend}, Risk {item.riskTrend}, Engagement {item.engagementLevel}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Panel */}
                <AIAnalysisPanel analysis={entry?.aiAnalysis} />
            </div>
        </div>
    )
}
