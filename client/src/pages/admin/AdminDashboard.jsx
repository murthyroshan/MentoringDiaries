import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, Users, BookOpen, Flag, Download, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
    BarElement, PointElement, LineElement, Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import api from '../../services/api'
import StatCard from '../../components/ui/StatCard'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler)

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
        tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, padding: 10, cornerRadius: 10 },
    },
    scales: {
        x: { ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(148,163,184,0.08)' } },
        y: { ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(148,163,184,0.08)' } },
    },
}

export default function AdminDashboard() {
    const [trendPeriod, setTrendPeriod] = useState('weekly')

    const { data: overview, isLoading: loadingOverview } = useQuery({
        queryKey: ['analytics-overview'],
        queryFn: () => api.get('/analytics/overview').then(r => r.data.data),
    })
    const { data: sentiment } = useQuery({
        queryKey: ['analytics-sentiment'],
        queryFn: () => api.get('/analytics/sentiment-distribution').then(r => r.data.data),
    })
    const { data: riskDist } = useQuery({
        queryKey: ['analytics-risk'],
        queryFn: () => api.get('/analytics/risk-distribution').then(r => r.data.data),
    })
    const { data: trends } = useQuery({
        queryKey: ['analytics-trends', trendPeriod],
        queryFn: () => api.get(`/analytics/entry-trends?period=${trendPeriod}`).then(r => r.data.data),
    })
    const { data: responseTime } = useQuery({
        queryKey: ['analytics-response-time'],
        queryFn: () => api.get('/analytics/intervention-response-time').then(r => r.data),
    })

    // Sentiment Chart
    const SENTIMENT_COLORS = {
        positive: 'rgba(34,197,94,0.85)',
        neutral: 'rgba(99,102,241,0.85)',
        negative: 'rgba(239,68,68,0.85)',
    }
    const SENTIMENT_BORDER_COLORS = {
        positive: 'rgb(34,197,94)',
        neutral: 'rgb(99,102,241)',
        negative: 'rgb(239,68,68)',
    }
    const sentimentChart = {
        labels: sentiment?.map(s => s._id?.charAt(0).toUpperCase() + s._id?.slice(1)) || [],
        datasets: [{
            data: sentiment?.map(s => s.count) || [],
            backgroundColor: sentiment?.map(s => SENTIMENT_COLORS[s._id] || 'rgba(148,163,184,0.5)') || [],
            borderColor: sentiment?.map(s => SENTIMENT_BORDER_COLORS[s._id] || 'rgb(148,163,184)') || [],
            borderWidth: 2,
            hoverOffset: 8,
        }],
    }

    // Risk Distribution Chart
    const riskOrder = ['low', 'medium', 'high', 'critical']
    const riskSorted = riskOrder.map(r => riskDist?.find(d => d._id === r) || { _id: r, count: 0 })
    const riskChart = {
        labels: riskSorted.map(r => r._id?.charAt(0).toUpperCase() + r._id?.slice(1)),
        datasets: [{
            label: 'Entries',
            data: riskSorted.map(r => r.count),
            backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(234,179,8,0.8)', 'rgba(249,115,22,0.8)', 'rgba(239,68,68,0.8)'],
            borderColor: ['rgb(34,197,94)', 'rgb(234,179,8)', 'rgb(249,115,22)', 'rgb(239,68,68)'],
            borderWidth: 2, borderRadius: 8,
        }],
    }

    // Entry Trends Chart
    const trendsChart = {
        labels: trends?.map((t, i) => t._id?.month ? `${t._id.year}-${String(t._id.month).padStart(2, '0')}` : `W${t._id?.week}`) || [],
        datasets: [
            {
                label: 'Entries',
                data: trends?.map(t => t.count) || [],
                borderColor: 'rgb(139,92,246)', backgroundColor: 'rgba(139,92,246,0.1)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: 'rgb(139,92,246)',
            },
            {
                label: 'Flagged',
                data: trends?.map(t => t.flaggedCount) || [],
                borderColor: 'rgb(239,68,68)', backgroundColor: 'rgba(239,68,68,0.07)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: 'rgb(239,68,68)',
            },
        ],
    }

    // Response Time Chart
    const rtData = responseTime?.data || []
    const responseTimeChart = {
        labels: rtData.map(m => m.mentorName?.split(' ')[0] || 'Unknown'),
        datasets: [{
            label: 'Avg Response (hours)',
            data: rtData.map(m => m.avgResponseHours),
            backgroundColor: rtData.map(m => m.avgResponseHours > 48 ? 'rgba(239,68,68,0.8)' : m.avgResponseHours > 24 ? 'rgba(249,115,22,0.8)' : 'rgba(34,197,94,0.8)'),
            borderColor: rtData.map(m => m.avgResponseHours > 48 ? 'rgb(239,68,68)' : m.avgResponseHours > 24 ? 'rgb(249,115,22)' : 'rgb(34,197,94)'),
            borderWidth: 2, borderRadius: 8,
        }],
    }

    const handleExport = async () => {
        const res = await api.get('/analytics/export/csv', { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url; a.download = 'mentoring_analytics.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Platform Analytics</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Real-time mentoring efficiency overview</p>
                </div>
                <button onClick={handleExport} className="btn btn-secondary text-sm">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Students" value={overview?.totalStudents || 0} icon={Users} color="violet" loading={loadingOverview} />
                <StatCard title="Total Entries" value={overview?.totalEntries || 0} icon={BookOpen} color="indigo" loading={loadingOverview} />
                <StatCard title="Flagged Entries" value={overview?.flaggedEntries || 0} icon={Flag} color="red" loading={loadingOverview} />
                <StatCard title="Review Rate" value={overview?.reviewRate || 0} subtitle="% entries reviewed" icon={TrendingUp} color="green" loading={loadingOverview} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sentiment Distribution */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>Sentiment Distribution</h3>
                    <div className="flex justify-center">
                        <div style={{ maxWidth: 260 }}>
                            {sentiment?.length ? (
                                <Doughnut data={sentimentChart} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins }, scales: undefined }} />
                            ) : (
                                <div className="skeleton h-48 rounded-xl" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div className="glass-card p-6">
                    <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>Risk Level Distribution</h3>
                    {riskDist ? (
                        <Bar data={riskChart} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { display: false } } }} />
                    ) : (
                        <div className="skeleton h-48 rounded-xl" />
                    )}
                </div>

                {/* Entry Trends */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Entry Trends</h3>
                        <div className="flex gap-1">
                            {['weekly', 'monthly'].map(p => (
                                <button key={p} onClick={() => setTrendPeriod(p)}
                                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-all ${trendPeriod === p ? 'gradient-brand text-white' : 'btn-secondary'}`}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {trends ? (
                        <Line data={trendsChart} options={chartDefaults} />
                    ) : (
                        <div className="skeleton h-48 rounded-xl" />
                    )}
                </div>

                {/* Intervention Response Time */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Intervention Response Time</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                                Avg hours per mentor · Platform avg: {responseTime?.overallAvgHours ?? '—'}h
                            </p>
                        </div>
                        <Clock size={18} style={{ color: 'rgb(var(--text-muted))' }} />
                    </div>
                    {rtData.length > 0 ? (
                        <Bar data={responseTimeChart} options={{
                            ...chartDefaults,
                            plugins: { ...chartDefaults.plugins, legend: { display: false } },
                        }} />
                    ) : (
                        <div className="flex items-center justify-center h-40">
                            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No mentor responses yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
