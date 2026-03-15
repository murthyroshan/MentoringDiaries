import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    GraduationCap, Trophy, Zap, TrendingUp,
    Star, Award, BookOpen, BarChart2
} from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'academic', label: 'Academic Performance', icon: GraduationCap, color: '#06b6d4' },
    { id: 'events', label: 'Events & Achievements', icon: Trophy, color: '#f59e0b' },
    { id: 'skills', label: 'Skills Growth', icon: Zap, color: '#10b981' },
]

const GRADE_POINTS = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, F: 0 }

const ACHIEVEMENT_ICONS = {
    winner: '🥇', 'runner-up': '🥈', participated: '🎫',
    'special-mention': '🏅', coordinator: '🧑‍💼', volunteer: '🤝', other: '📌',
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
    return (
        <div className="glass-card p-5 text-center">
            <p className="text-3xl font-bold mb-1" style={{ color }}>{value}</p>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{sub}</p>}
        </div>
    )
}

// ── Academic Tab ──────────────────────────────────────────────────────────────
function AcademicTab({ records }) {
    if (!records?.length) {
        return (
            <div className="glass-card p-16 text-center">
                <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                <p style={{ color: 'rgb(var(--text-muted))' }}>No academic records yet.</p>
            </div>
        )
    }

    const endsemRecords = records.filter(r => r.examType === 'endsem')
    const midRecords = records.filter(r => r.examType !== 'endsem')
    const latestCgpa = endsemRecords.sort((a, b) => b.semester - a.semester)[0]?.finalCgpa

    const avgMidPct = midRecords.length
        ? Math.round(midRecords.reduce((s, r) => s + (r.overallPercentage || 0), 0) / midRecords.length * 10) / 10
        : null

    return (
        <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Records" value={records.length} color="#8b5cf6" />
                <StatCard label="Latest CGPA" value={latestCgpa ?? '—'} color="#06b6d4" sub="End Semester" />
                <StatCard label="Avg Midterm %" value={avgMidPct != null ? `${avgMidPct}%` : '—'} color="#f59e0b" />
                <StatCard label="Semesters" value={[...new Set(records.map(r => r.semester))].length} color="#10b981" />
            </div>

            {/* Records per semester */}
            {[...new Set(records.map(r => r.semester))].sort().map(sem => {
                const semRecords = records.filter(r => r.semester === sem)
                return (
                    <div key={sem} className="glass-card p-5">
                        <h4 className="font-semibold mb-4 text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Semester {sem}</h4>
                        <div className="space-y-3">
                            {semRecords.map(r => (
                                <div key={r._id} className="p-3 rounded-xl" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium capitalize" style={{ color: 'rgb(var(--text-primary))' }}>
                                            {r.examType === 'mid1' ? 'Mid Semester I' : r.examType === 'mid2' ? 'Mid Semester II' : 'End Semester'}
                                        </span>
                                        {r.examType === 'endsem'
                                            ? <span className="badge text-xs font-bold" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>CGPA: {r.finalCgpa ?? '—'}</span>
                                            : <span className="badge text-xs font-bold" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{r.overallPercentage ?? 0}%</span>
                                        }
                                    </div>
                                    {r.examType !== 'endsem' && r.subjects?.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1">
                                            {r.subjects.map(s => (
                                                <div key={s.name} className="flex justify-between text-xs px-2 py-1 rounded" style={{ background: 'rgb(var(--bg-primary))' }}>
                                                    <span className="truncate mr-2" style={{ color: 'rgb(var(--text-secondary))' }}>{s.name}</span>
                                                    <span className="font-medium" style={{ color: s.marks >= 30 ? '#22c55e' : s.marks >= 20 ? '#f59e0b' : '#ef4444' }}>
                                                        {s.marks}/40
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {r.examType === 'endsem' && r.endsemSubjects?.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1">
                                            {r.endsemSubjects.map(s => {
                                                const pts = GRADE_POINTS[s.grade] ?? 0
                                                const gradeColor = pts >= 8 ? '#22c55e' : pts >= 6 ? '#f59e0b' : pts === 0 ? '#ef4444' : 'rgb(var(--text-secondary))'
                                                return (
                                                    <div key={s.name} className="flex justify-between text-xs px-2 py-1 rounded" style={{ background: 'rgb(var(--bg-primary))' }}>
                                                        <span className="truncate mr-2" style={{ color: 'rgb(var(--text-secondary))' }}>{s.name}</span>
                                                        <span className="font-bold" style={{ color: gradeColor }}>{s.grade}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Events Tab ────────────────────────────────────────────────────────────────
function EventsTab({ events }) {
    if (!events?.length) {
        return (
            <div className="glass-card p-16 text-center">
                <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                <p style={{ color: 'rgb(var(--text-muted))' }}>No events or achievements yet.</p>
            </div>
        )
    }

    const wins = events.filter(e => e.achievement === 'winner').length
    const podiums = events.filter(e => ['winner', 'runner-up', 'special-mention'].includes(e.achievement)).length

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Events" value={events.length} color="#f59e0b" />
                <StatCard label="Wins 🥇" value={wins} color="#fbbf24" />
                <StatCard label="Podium Finishes" value={podiums} color="#d97706" />
            </div>
            <div className="space-y-3">
                {events.map(e => (
                    <motion.div key={e._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-4 flex items-start gap-4">
                        <div className="text-2xl mt-0.5">{ACHIEVEMENT_ICONS[e.achievement] || '📌'}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{e.eventName}</p>
                                <span className="badge text-xs capitalize px-2 py-0.5" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                    {e.achievement}
                                </span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                                {e.organizedBy} · {e.date ? format(new Date(e.date), 'MMM d, yyyy') : '—'} · <span className="capitalize">{e.eventType}</span>
                            </p>
                            {e.description && (
                                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgb(var(--text-secondary))' }}>{e.description}</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

// ── Skills Tab ────────────────────────────────────────────────────────────────
function SkillsTab({ skills }) {
    if (!skills?.length) {
        return (
            <div className="glass-card p-16 text-center">
                <Zap size={40} className="mx-auto mb-3 opacity-20" />
                <p style={{ color: 'rgb(var(--text-muted))' }}>No skill updates yet.</p>
            </div>
        )
    }

    const totalImprovement = skills.reduce((s, sk) => s + Math.max(0, (sk.ratingAfter ?? 0) - (sk.ratingBefore ?? 0)), 0)
    const avgAfter = skills.length
        ? Math.round(skills.reduce((s, sk) => s + (sk.ratingAfter ?? 0), 0) / skills.length * 10) / 10
        : 0

    // Group by category
    const byCategory = skills.reduce((acc, sk) => {
        const cat = sk.skillCategory || 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(sk)
        return acc
    }, {})

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
                <StatCard label="Skills Tracked" value={skills.length} color="#10b981" />
                <StatCard label="Total Improvement" value={`+${totalImprovement}`} color="#34d399" sub="levels gained" />
                <StatCard label="Avg Proficiency" value={`${avgAfter}/5`} color="#6ee7b7" />
            </div>

            {Object.entries(byCategory).map(([cat, catSkills]) => (
                <div key={cat} className="glass-card p-5">
                    <h4 className="font-semibold mb-4 text-sm flex items-center gap-2" style={{ color: 'rgb(var(--text-primary))' }}>
                        <Zap size={14} style={{ color: '#10b981' }} />{cat}
                    </h4>
                    <div className="space-y-3">
                        {catSkills.map(sk => {
                            const delta = (sk.ratingAfter ?? 0) - (sk.ratingBefore ?? 0)
                            const pct = ((sk.ratingAfter ?? 0) / 5) * 100
                            return (
                                <div key={sk._id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{sk.skillName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                                {sk.ratingBefore} → {sk.ratingAfter}
                                            </span>
                                            {delta > 0 && (
                                                <span className="badge text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>▲ +{delta}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Main Portfolio Page ───────────────────────────────────────────────────────
export default function Portfolio() {
    const { user } = useAuthStore()
    const [activeTab, setActiveTab] = useState('academic')

    const { data: academicData, isLoading: loadingAcademic } = useQuery({
        queryKey: ['portfolio-academic'],
        queryFn: () => api.get('/academic').then(r => r.data),
        staleTime: 60000,
    })
    const { data: eventsData, isLoading: loadingEvents } = useQuery({
        queryKey: ['portfolio-events'],
        queryFn: () => api.get('/events').then(r => r.data),
        staleTime: 60000,
    })
    const { data: skillsData, isLoading: loadingSkills } = useQuery({
        queryKey: ['portfolio-skills'],
        queryFn: () => api.get('/skills').then(r => r.data),
        staleTime: 60000,
    })

    const records = academicData?.data || []
    const events = eventsData?.data || []
    const skills = skillsData?.data || []

    const isLoading = (activeTab === 'academic' && loadingAcademic)
        || (activeTab === 'events' && loadingEvents)
        || (activeTab === 'skills' && loadingSkills)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                    My Portfolio
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    {user?.name}'s academic journey, achievements, and growth
                </p>
            </motion.div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgb(var(--bg-secondary))' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const active = activeTab === tab.id
                    return (
                        <button key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                                background: active ? 'rgb(var(--bg-primary))' : 'transparent',
                                color: active ? tab.color : 'rgb(var(--text-muted))',
                                boxShadow: active ? '0 1px 6px rgba(0,0,0,0.15)' : 'none',
                            }}>
                            <Icon size={15} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                >
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
                        </div>
                    ) : (
                        <>
                            {activeTab === 'academic' && <AcademicTab records={records} />}
                            {activeTab === 'events' && <EventsTab events={events} />}
                            {activeTab === 'skills' && <SkillsTab skills={skills} />}
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
