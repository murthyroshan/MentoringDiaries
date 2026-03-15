import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    BookOpen, GraduationCap, Trophy, Zap,
    Search, Calendar, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import RiskBadge from '../../components/ui/RiskBadge'
import SentimentChip from '../../components/ui/SentimentChip'

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    weekly: { label: 'Weekly', icon: BookOpen, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    academic: { label: 'Academic', icon: GraduationCap, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    event: { label: 'Event', icon: Trophy, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    skill: { label: 'Skill', icon: Zap, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
}

const FILTER_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'weekly', label: 'Weekly Reports' },
    { value: 'academic', label: 'Academic Records' },
    { value: 'event', label: 'Events' },
    { value: 'skill', label: 'Skill Updates' },
]

// ── Card Components per type ──────────────────────────────────────────────────
function WeeklyCard({ entry }) {
    const cfg = TYPE_CONFIG.weekly
    return (
        <Link to={`/entries/${entry._id}`} className="block">
            <div className="glass-card p-5 hover:border-violet-300 transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                            {entry.periodLabel || (entry.startDate
                                ? `${format(new Date(entry.startDate), 'MMM d')} – ${format(new Date(entry.endDate), 'MMM d, yyyy')}`
                                : `Week ${entry.week}`)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                            <Calendar size={11} className="inline mr-1" />
                            {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <SentimentChip sentiment={entry.aiAnalysis?.sentiment} />
                        <RiskBadge level={entry.aiAnalysis?.riskLevel} />
                    </div>
                </div>
                <p className="text-sm line-clamp-2" style={{ color: 'rgb(var(--text-secondary))' }}>{entry.content}</p>
                <div className="flex items-center justify-between mt-3">
                    <span className="badge text-xs" style={{
                        background: entry.status === 'reviewed' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                        color: entry.status === 'reviewed' ? 'rgb(34,197,94)' : 'rgb(99,102,241)',
                        border: `1px solid ${entry.status === 'reviewed' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    }}>{entry.status}</span>
                    {entry.aiAnalysis?.riskScore !== undefined && (
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Risk: {entry.aiAnalysis.riskScore}/100</span>
                    )}
                </div>
            </div>
        </Link>
    )
}

function AcademicCard({ entry }) {
    const examLabels = { mid1: 'Mid Semester I', mid2: 'Mid Semester II', endsem: 'End Semester' }
    return (
        <div className="glass-card p-5 h-full" style={{ borderLeft: `3px solid ${TYPE_CONFIG.academic.color}` }}>
            <p className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--text-primary))' }}>
                {examLabels[entry.examType] || entry.examType} — Sem {entry.semester}
            </p>
            <p className="text-xs mb-3" style={{ color: 'rgb(var(--text-muted))' }}>
                <Calendar size={11} className="inline mr-1" />{format(new Date(entry.createdAt), 'MMM d, yyyy')}
            </p>
            {entry.examType === 'endsem' ? (
                <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {entry.endsemSubjects?.length || 0} subjects graded
                    </span>
                    {entry.finalCgpa != null && (
                        <span className="badge text-xs font-bold" style={{ background: TYPE_CONFIG.academic.bg, color: TYPE_CONFIG.academic.color }}>
                            CGPA: {entry.finalCgpa}
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {entry.subjects?.length || 0} subjects
                    </span>
                    <span className="badge text-xs font-bold" style={{ background: TYPE_CONFIG.academic.bg, color: TYPE_CONFIG.academic.color }}>
                        {entry.overallPercentage ?? 0}%
                    </span>
                </div>
            )}
        </div>
    )
}

function EventCard({ entry }) {
    const achievementColors = {
        winner: '#f59e0b', 'runner-up': '#94a3b8', participated: '#64748b',
        'special-mention': '#8b5cf6', coordinator: '#06b6d4', volunteer: '#10b981', other: '#64748b',
    }
    const color = achievementColors[entry.achievement] || '#64748b'
    return (
        <div className="glass-card p-5 h-full" style={{ borderLeft: `3px solid ${TYPE_CONFIG.event.color}` }}>
            <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{entry.eventName}</p>
                <span className="badge text-xs font-semibold capitalize px-2 py-0.5" style={{ background: `${color}20`, color }}>
                    {entry.achievement}
                </span>
            </div>
            <p className="text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
                {entry.organizedBy} · {entry.date ? format(new Date(entry.date), 'MMM d, yyyy') : '—'}
            </p>
            <p className="text-xs capitalize" style={{ color: 'rgb(var(--text-secondary))' }}>{entry.eventType}</p>
        </div>
    )
}

function SkillCard({ entry }) {
    const delta = (entry.ratingAfter ?? 0) - (entry.ratingBefore ?? 0)
    return (
        <div className="glass-card p-5 h-full" style={{ borderLeft: `3px solid ${TYPE_CONFIG.skill.color}` }}>
            <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{entry.skillName}</p>
                {delta > 0 && (
                    <span className="badge text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>▲ +{delta}</span>
                )}
            </div>
            <p className="text-xs mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
                {entry.skillCategory} · {entry.source}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                <span>{'★'.repeat(entry.ratingBefore ?? 0)}{'☆'.repeat(5 - (entry.ratingBefore ?? 0))}</span>
                <span>→</span>
                <span style={{ color: TYPE_CONFIG.skill.color }}>{'★'.repeat(entry.ratingAfter ?? 0)}{'☆'.repeat(5 - (entry.ratingAfter ?? 0))}</span>
            </div>
        </div>
    )
}

// ── Main MyEntries Page ───────────────────────────────────────────────────────
export default function MyEntries() {
    const [typeFilter, setTypeFilter] = useState('all')
    const [search, setSearch] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['my-all-entries'],
        queryFn: () => api.get('/student/all-entries').then(r => r.data),
        staleTime: 30000,
    })

    const allEntries = data?.data || []
    const counts = data?.counts || {}

    // Client-side filter
    const filtered = allEntries.filter(e => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (search) {
            const q = search.toLowerCase()
            const searchable = [
                e.content, e.eventName, e.skillName,
                e.examType, e.organizedBy, e.description,
            ].filter(Boolean).join(' ').toLowerCase()
            return searchable.includes(q)
        }
        return true
    })

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>My Entries</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                        All your records — weekly, academic, events &amp; skills
                    </p>
                </div>
                <Link to="/submit" className="btn btn-primary text-sm">+ New Entry</Link>
            </div>

            {/* Count pills */}
            {!isLoading && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                        const Icon = cfg.icon
                        return (
                            <button key={type}
                                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                style={{
                                    background: typeFilter === type ? cfg.bg : 'rgb(var(--bg-secondary))',
                                    color: typeFilter === type ? cfg.color : 'rgb(var(--text-muted))',
                                    border: `1px solid ${typeFilter === type ? cfg.color + '60' : 'rgb(var(--border-color))'}`,
                                }}>
                                <Icon size={12} />
                                {cfg.label} ({counts[type] ?? 0})
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Search + filter row */}
            <div className="glass-card p-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-40">
                    <Search size={15} style={{ color: 'rgb(var(--text-muted))' }} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="form-input py-2 text-sm" placeholder="Search entries..."
                    />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-input py-2 text-sm w-auto">
                    {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>

            {/* Entries Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <Filter size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                        {allEntries.length === 0 ? 'No entries yet. Submit your first entry!' : 'No entries match your filter.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((e, i) => {
                        const cfg = TYPE_CONFIG[e.type]
                        const Icon = cfg?.icon || BookOpen
                        return (
                            <motion.div
                                key={`${e.type}-${e._id}`}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                            >
                                {/* Type chip */}
                                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                    <Icon size={12} style={{ color: cfg?.color }} />
                                    <span className="text-xs font-medium" style={{ color: cfg?.color }}>{cfg?.label}</span>
                                </div>
                                {e.type === 'weekly' && <WeeklyCard entry={e} />}
                                {e.type === 'academic' && <AcademicCard entry={e} />}
                                {e.type === 'event' && <EventCard entry={e} />}
                                {e.type === 'skill' && <SkillCard entry={e} />}
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
