import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, MessageSquareWarning, Smile, TrendingUp, PlusCircle, Sparkles, CalendarPlus, Brain } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Line, Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS, LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend,
} from 'chart.js'
import StatCard from '../../components/ui/StatCard'
import GrowthRadarChart from '../../components/ui/Charts/GrowthRadarChart'
import { SkeletonChart } from '../../components/ui/Skeletons/SkeletonChart'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend)

const sentimentTone = {
    positive: { text: 'Positive', color: '#22c55e' },
    neutral: { text: 'Neutral', color: '#64748b' },
    negative: { text: 'Negative', color: '#ef4444' },
}

function getConfidenceLabel(score) {
    const val = Number(score || 0);
    if (val >= 0.75) return 'High';
    if (val >= 0.6) return 'Medium';
    return 'Low';
}

export default function StudentDashboard() {
    const { user } = useAuthStore()

    const { data: overviewData, isLoading: loadingOverview } = useQuery({
        queryKey: ['student-overview'],
        queryFn: () => api.get('/analytics/student-overview').then((r) => r.data.data),
    })

    const { data: growthData, isLoading: loadingGrowth } = useQuery({
        queryKey: ['student-growth'],
        queryFn: () => api.get('/analytics/student-growth').then((r) => r.data.data),
    })

    const { data: sessionsData } = useQuery({
        queryKey: ['student-sessions-dashboard'],
        queryFn: () => api.get('/sessions?limit=3').then((r) => r.data),
    })

    const { data: weeklyInsightsData } = useQuery({
        queryKey: ['student-weekly-insights'],
        queryFn: () => api.get('/analytics/student-weekly-insights').then((r) => r.data.data),
    })

    const consistency = growthData?.diarySubmissionConsistency || []
    const skillProgression = growthData?.skillProgression || []
    const academicTrend = growthData?.academicPerformanceTrend || []
    const upcomingSessions = sessionsData?.data || []

    const consistencyChart = {
        labels: consistency.map((c) => c.label),
        datasets: [{
            label: 'Entries',
            data: consistency.map((c) => c.submissions),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
            fill: true,
            tension: 0.35,
        }],
    }

    const skillChart = {
        labels: skillProgression.map((s) => s.category),
        datasets: [{
            label: 'Improvement',
            data: skillProgression.map((s) => s.totalImprovement),
            backgroundColor: 'rgba(16,185,129,0.7)',
            borderRadius: 8,
        }],
    }

    const academicChart = {
        labels: academicTrend.map((a) => a.label),
        datasets: [{
            label: 'Overall %',
            data: academicTrend.map((a) => a.overallPercentage || (a.finalCgpa ? a.finalCgpa * 10 : 0)),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.15)',
            tension: 0.35,
        }],
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.15)' } },
            x: { grid: { display: false } },
        },
    }

    const sentiment = sentimentTone[overviewData?.latestSentimentResult] || { text: 'No entries', color: '#64748b' }

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                    Welcome back, {user?.name?.split(' ')[0]}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    {user?.department} • {user?.batch}
                </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Growth Score" value={overviewData?.growthScore || 0} icon={TrendingUp} color="green" loading={loadingOverview} />
                <StatCard title="Entries Submitted" value={overviewData?.entriesSubmitted || 0} icon={PlusCircle} color="violet" loading={loadingOverview} />
                <StatCard title="Skills Added" value={overviewData?.skillsAdded || 0} icon={Sparkles} color="indigo" loading={loadingOverview} />
                <StatCard title="Events Joined" value={overviewData?.eventsParticipated || 0} icon={CalendarPlus} color="blue" loading={loadingOverview} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-card p-4 lg:col-span-2">
                    <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>Today Panel</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                            <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                <MessageSquareWarning size={14} /> Pending mentor responses
                            </p>
                            <p className="text-xl font-bold mt-2" style={{ color: 'rgb(var(--text-primary))' }}>
                                {overviewData?.pendingMentorResponses ?? 0}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)' }}>
                            <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                <Smile size={14} /> Latest sentiment
                            </p>
                            <p className="text-base font-bold mt-2" style={{ color: sentiment.color }}>
                                {sentiment.text}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)' }}>
                            <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                                <CalendarClock size={14} /> Next diary deadline
                            </p>
                            <p className="text-sm font-semibold mt-2" style={{ color: 'rgb(var(--text-primary))' }}>
                                {overviewData?.nextDiarySubmissionDeadline
                                    ? format(new Date(overviewData.nextDiarySubmissionDeadline), 'dd MMM yyyy')
                                    : 'Not available'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4">
                    <p className="text-sm font-semibold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>Quick Actions</p>
                    <div className="space-y-2">
                        <Link to="/submit?type=weekly" className="btn btn-primary w-full justify-start text-sm">
                            <PlusCircle size={14} /> Submit diary entry
                        </Link>
                        <Link to="/submit?type=skill" className="btn btn-secondary w-full justify-start text-sm">
                            <Sparkles size={14} /> Add skill
                        </Link>
                        <Link to="/submit?type=event" className="btn btn-secondary w-full justify-start text-sm">
                            <CalendarPlus size={14} /> Add event
                        </Link>
                    </div>
                </div>
            </div>

            <div className="glass-card p-4 space-y-4">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Growth Panel</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Diary submission consistency</p>
                        <div style={{ height: 180 }}>
                            {loadingGrowth ? <SkeletonChart /> : <Line data={consistencyChart} options={chartOptions} />}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Skill progression</p>
                        <div style={{ height: 180 }}>
                            {loadingGrowth ? <SkeletonChart /> : <GrowthRadarChart labels={skillChart.labels} datasets={skillChart.datasets} />}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Academic performance trend</p>
                        <div style={{ height: 180 }}>
                            {loadingGrowth ? <SkeletonChart /> : <Line data={academicChart} options={chartOptions} />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Mentoring Sessions</p>
                    <Link to="/sessions" className="text-xs" style={{ color: 'rgb(99,102,241)' }}>View all</Link>
                </div>
                <div className="mt-3 space-y-2">
                    {upcomingSessions.length === 0 ? (
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>No sessions scheduled yet.</p>
                    ) : (
                        upcomingSessions.map((session) => (
                            <div key={session._id} className="p-3 rounded-lg" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                    {format(new Date(session.date), 'dd MMM yyyy, hh:mm a')}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                                    {session.agenda || 'No agenda provided'}
                                </p>
                                <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                                    {formatDistanceToNowStrict(new Date(session.date), { addSuffix: true })}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Brain size={15} />
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Weekly AI Insights</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div className="rounded-lg p-2 text-xs" style={{ background: 'rgba(239,68,68,0.08)' }}>
                        📉 Engagement {weeklyInsightsData?.engagementLevel === 'low' ? 'dropped' : weeklyInsightsData?.engagementLevel || 'steady'}
                    </div>
                    <div className="rounded-lg p-2 text-xs" style={{ background: 'rgba(99,102,241,0.08)' }}>
                        😐 Sentiment {weeklyInsightsData?.sentimentTrend || 'stable'}
                    </div>
                    <div className="rounded-lg p-2 text-xs" style={{ background: 'rgba(245,158,11,0.08)' }}>
                        ⚠️ Risk {weeklyInsightsData?.riskTrend || 'stable'}
                    </div>
                </div>
                <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {weeklyInsightsData?.insightParagraph || 'Submit more entries to unlock AI weekly insight summaries.'}
                </p>
                {weeklyInsightsData?.confidence !== undefined && (
                    <p className="text-[11px] mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
                        AI confidence: {getConfidenceLabel(weeklyInsightsData.confidence)} ({Number(weeklyInsightsData.confidence).toFixed(2)})
                    </p>
                )}
            </div>
        </div>
    )
}
