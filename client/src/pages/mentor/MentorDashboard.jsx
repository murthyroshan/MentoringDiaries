import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useSpring, AnimatePresence } from 'framer-motion'
import {
  Chart as ChartJS, registerables,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

ChartJS.register(...registerables)

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
  dark:    '#0C0C12',
  surface: '#111118',
  border:  'rgba(255,255,255,0.06)',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  purple:  '#7F77DD',
  teal:    '#1D9E75',
  amber:   '#EF9F27',
  red:     '#E24B4A',
  darkRed: '#991F1F',
}

const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '20px',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return C.teal
  if (score < 60) return C.amber
  if (score < 80) return C.red
  return C.darkRed
}

function getMoodEmoji(mood) {
  const map = { 5: '😄', 4: '🙂', 3: '😐', 2: '😟', 1: '😞' }
  return map[mood] || '😐'
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'rgba(255,255,255,0.05)',
    animation: 'mdPulse 1.6s ease-in-out infinite',
  }} />
)

// ─── Animated count ───────────────────────────────────────────────────────────
function AnimCount({ value, color = C.text, size = '38px' }) {
  const [count, setCount] = useState(0)
  const spring = useSpring(0, { stiffness: 60, damping: 18 })
  useEffect(() => spring.on('change', v => setCount(Math.round(v))), [spring])
  useEffect(() => { if (value != null) spring.set(value) }, [value]) // eslint-disable-line
  return <span style={{ fontSize: size, fontWeight: 900, color, lineHeight: 1 }}>{count}</span>
}

// ─── Mini progress ring ───────────────────────────────────────────────────────
function MiniRing({ pct, color, size = 44 }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * (pct || 0)) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      />
    </svg>
  )
}

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrCard({ msg, onRetry }) {
  return (
    <div style={{ ...glass, border: `1px solid rgba(226,75,74,0.25)`, textAlign: 'center', padding: '32px' }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚠</div>
      <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>{msg}</div>
      <button onClick={onRetry} style={{
        background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`,
        borderRadius: '8px', padding: '6px 16px', color: C.red,
        cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
      }}>Retry</button>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, loading, delay = 0, extras }) {
  const col = accent || C.text
  return (
    <motion.div
      style={{ ...glass, position: 'relative', overflow: 'hidden' }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
    >
      <div style={{ fontSize: '11px', color: C.muted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {loading
        ? <><Sk h={36} r={6} /><div style={{ marginTop: 8 }} /><Sk h={12} w="60%" /></>
        : <>
          <AnimCount value={value ?? 0} color={col} />
          {sub && <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px' }}>{sub}</div>}
          {extras}
        </>
      }
    </motion.div>
  )
}

// ─── Priority queue entry row ─────────────────────────────────────────────────
function QueueEntryRow({ entry, navigate, delay }) {
  const urgencyColor = entry.urgency_score > 80 ? C.red : entry.urgency_score > 40 ? C.amber : C.purple
  const riskCol = getRiskColor(entry.ai_risk_score)
  const lowSubjects = (entry.subject_ratings || []).filter(s => s.rating <= 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        display: 'flex', gap: '14px', alignItems: 'flex-start',
        padding: '14px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${C.border}`,
        marginBottom: '10px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Urgency bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: urgencyColor, borderRadius: '12px 0 0 12px' }} />

      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: `${riskCol}20`, border: `1px solid ${riskCol}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 700, color: riskCol,
      }}>
        {getInitials(entry.student_name || '?')}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{entry.student_name}</span>
          <span style={{ fontSize: '11px', color: C.muted }}>{entry.student_dept}-{entry.student_section} · Roll {entry.student_roll}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: C.muted }}>Week {entry.week_number}</span>
          <span style={{ fontSize: '16px' }}>{getMoodEmoji(entry.mood)}</span>
          <span style={{
            fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
            background: `${riskCol}18`, color: riskCol, border: `1px solid ${riskCol}30`,
          }}>Risk {entry.ai_risk_score}</span>
          {entry.attendance_pct != null && (
            <span style={{ fontSize: '11px', color: entry.attendance_pct < 75 ? C.amber : C.muted }}>
              {Math.round(entry.attendance_pct)}% att.
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: C.muted, fontStyle: 'italic', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          "{(entry.reflection || '').slice(0, 100)}{(entry.reflection || '').length > 100 ? '...' : ''}"
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {entry.is_flagged === 1 && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.12)', color: C.red, border: `1px solid rgba(226,75,74,0.25)` }}>Flagged</span>}
          {entry.attendance_pct != null && entry.attendance_pct < 75 && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(239,159,39,0.12)', color: C.amber, border: `1px solid rgba(239,159,39,0.25)` }}>Low attendance</span>}
          {lowSubjects.map(s => <span key={s.subject_name} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.08)', color: C.red, border: `1px solid rgba(226,75,74,0.2)` }}>{s.subject_name}</span>)}
        </div>
      </div>

      {/* Right area */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: C.subtle }}>{daysAgo(entry.created_at)}d ago</span>
        <button
          onClick={() => navigate(`/mentor/review/${entry.id}`)}
          style={{
            background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
            border: 'none', borderRadius: '8px', padding: '6px 14px',
            color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Review →</button>
      </div>
    </motion.div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function MentorDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const academicYear = currentAcademicYear()

  // ── Queries ──────────────────────────────────────────────────────────────────
  const {
    data: summaryData, isLoading: summaryLoading,
    error: summaryError, refetch: refetchSummary,
  } = useQuery({
    queryKey: ['mentor', 'dashboard_summary'],
    queryFn: () => api.get('/mentor/dashboard-summary').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const {
    data: queueData, isLoading: queueLoading,
  } = useQuery({
    queryKey: ['mentor', 'priority_queue'],
    queryFn: () => api.get('/mentor/priority-queue').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const {
    data: flaggedData, isLoading: flaggedLoading,
  } = useQuery({
    queryKey: ['mentor', 'flagged_students'],
    queryFn: () => api.get('/mentor/flagged-students').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const {
    data: comparisonData, isLoading: compLoading,
  } = useQuery({
    queryKey: ['mentor', 'student_comparison'],
    queryFn: () => api.get('/mentor/student-comparison').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const {
    data: subjectData, isLoading: subjectLoading,
  } = useQuery({
    queryKey: ['mentor', 'subject_concerns'],
    queryFn: () => api.get('/mentor/subject-concerns').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const {
    data: sessionsData,
  } = useQuery({
    queryKey: ['mentor', 'sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  // ── Derived ──────────────────────────────────────────────────────────────────
  const summary = summaryData?.data
  const stats = summary?.stats || {}
  const digest = summary?.weekly_digest || {}
  const mentor = summary?.mentor || user

  const queueEntries = useMemo(() => {
    const raw = queueData?.data
    return Array.isArray(raw) ? raw.slice(0, 5) : []
  }, [queueData])

  const flaggedStudents = useMemo(() => {
    const raw = flaggedData?.data
    return Array.isArray(raw) ? raw.slice(0, 4) : []
  }, [flaggedData])

  const compStudents = useMemo(() => {
    return comparisonData?.data?.students || []
  }, [comparisonData])

  const subjectConcerns = useMemo(() => {
    const raw = subjectData?.data
    return Array.isArray(raw) ? raw : []
  }, [subjectData])

  const upcomingSessions = useMemo(() => {
    const raw = sessionsData?.data
    if (!Array.isArray(raw)) return []
    return raw
      .filter(s => s.scheduled_at && new Date(s.scheduled_at) > new Date() && s.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, 3)
  }, [sessionsData])

  // ── Comparison chart ──────────────────────────────────────────────────────────
  const PALETTE = [C.purple, C.teal, C.amber, '#60A5FA', '#F472B6', '#34D399', '#FB923C', '#A78BFA']

  const compChartData = useMemo(() => {
    if (compStudents.length < 2) return null
    // Collect all week numbers
    const allWeeks = [...new Set(compStudents.flatMap(s => s.risk_history.map(r => r.week_number)))].sort((a, b) => a - b)

    return {
      labels: allWeeks.map(w => `Wk ${w}`),
      datasets: compStudents.map((s, i) => {
        const byWeek = Object.fromEntries(s.risk_history.map(r => [r.week_number, r.ai_risk_score]))
        return {
          label: s.name,
          data: allWeeks.map(w => byWeek[w] ?? null),
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 1.5,
          spanGaps: true,
        }
      }),
    }
  }, [compStudents])

  const compOpts = {
    responsive: true,
    plugins: {
      legend: { labels: { color: C.muted, font: { size: 10 }, boxWidth: 12  } },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
    },
  }

  // ── Subject concerns chart ─────────────────────────────────────────────────
  const subjectChartData = useMemo(() => {
    if (!subjectConcerns.length) return null
    return {
      labels: subjectConcerns.map(s => s.subject_name),
      datasets: [{
        label: 'Avg Rating',
        data: subjectConcerns.map(s => s.avg_rating),
        backgroundColor: subjectConcerns.map(s =>
          s.avg_rating >= 4 ? `${C.teal}99` : s.avg_rating >= 3 ? `${C.amber}99` : `${C.red}99`
        ),
        borderColor: subjectConcerns.map(s =>
          s.avg_rating >= 4 ? C.teal : s.avg_rating >= 3 ? C.amber : C.red
        ),
        borderWidth: 1, borderRadius: 4,
      }],
    }
  }, [subjectConcerns])

  const subjectOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
        callbacks: { label: ctx => ` Avg: ${ctx.raw.toFixed(1)} / 5` },
      },
    },
    scales: {
      x: { min: 0, max: 5, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { grid: { display: false }, ticks: { color: C.muted, font: { size: 11 } }, border: { color: 'transparent' } },
    },
  }

  function doRefresh() {
    queryClient.invalidateQueries({ queryKey: ['mentor'] })
    setLastUpdated(new Date())
  }

  const showFlagged = !flaggedLoading && (stats.flagged_unreviewed > 0 || stats.critical_risk_count > 0)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes mdPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
      `}</style>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1280px' }}
      >
        {/* ── Error state ──────────────────────────────────────────────────── */}
        {summaryError && !summaryLoading && (
          <ErrCard msg="Failed to load dashboard summary" onRetry={refetchSummary} />
        )}

        {/* ── Greeting bar ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora", system-ui, sans-serif', fontSize: 'clamp(18px,3vw,26px)', fontWeight: 700, color: C.text, margin: 0 }}>
              {getGreeting()}, {(mentor?.name || user?.name || '').split(' ')[0] || 'Mentor'}
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
              {summaryLoading ? 'Loading...' : `${mentor?.department || user?.department || ''} · ${stats.total_students || 0} students assigned · Semester 4 · ${academicYear}`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: C.muted }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={doRefresh} style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              color: C.muted, fontSize: '12px', fontFamily: 'inherit',
            }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Weekly digest banner ─────────────────────────────────────────── */}
        {!summaryLoading && summary && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              ...glass, borderLeft: `2px solid ${C.purple}`,
              marginBottom: '20px', padding: '16px 20px',
              display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginRight: '8px' }}>
              Week {digest.week_number} at a glance
            </div>
            <span style={{ fontSize: '12px', color: C.purple }}>{digest.new_entries || 0} new entries</span>
            <span style={{ fontSize: '12px', color: digest.flagged_entries > 0 ? C.red : C.muted }}>
              {digest.flagged_entries || 0} flagged
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: C.muted }}>Avg risk: <strong style={{ color: C.text }}>{digest.avg_risk_this_week}</strong></span>
              <span style={{ fontSize: '12px', color: C.muted }}>vs <strong style={{ color: C.text }}>{digest.avg_risk_last_week}</strong> last week</span>
              {digest.risk_delta !== 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  color: digest.risk_delta > 0 ? C.red : C.teal,
                }}>
                  {digest.risk_delta > 0 ? `↑ +${digest.risk_delta}` : `↓ ${digest.risk_delta}`}
                </span>
              )}
            </div>
            {(digest.students_missed_2_plus_weeks || []).length > 0 && (
              <button
                onClick={() => navigate('/mentor/students')}
                style={{
                  padding: '4px 12px', borderRadius: '999px',
                  background: 'rgba(239,159,39,0.12)', color: C.amber,
                  border: `1px solid rgba(239,159,39,0.25)`,
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ⚠ {digest.students_missed_2_plus_weeks.length} students missed 2+ weeks
              </button>
            )}
          </motion.div>
        )}

        {/* ── Stat cards row 1 ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px', marginBottom: '14px' }}>
          <StatCard label="Total Students" value={stats.total_students} sub={`${mentor?.department || user?.department || ''}`} loading={summaryLoading} delay={0} />
          <StatCard
            label="Pending Reviews"
            value={stats.pending_reviews}
            sub="entries awaiting response"
            accent={stats.pending_reviews > 10 ? C.red : stats.pending_reviews > 5 ? C.amber : C.text}
            loading={summaryLoading} delay={0.08}
          />
          <StatCard
            label="Reviewed This Week"
            value={stats.reviewed_this_week}
            accent={C.teal}
            loading={summaryLoading} delay={0.16}
            extras={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <MiniRing pct={stats.total_students > 0 ? Math.round((stats.reviewed_this_week / (digest.new_entries || 1)) * 100) : 0} color={C.teal} size={32} />
                <span style={{ fontSize: '11px', color: C.muted }}>of {digest.new_entries || 0} submitted</span>
              </div>
            }
          />
          <StatCard
            label="Avg Response Time"
            value={null}
            loading={summaryLoading} delay={0.24}
            extras={
              <div>
                <span style={{
                  fontSize: '34px', fontWeight: 900, lineHeight: 1,
                  color: !stats.avg_response_time_days ? C.subtle
                    : stats.avg_response_time_days < 2 ? C.teal
                    : stats.avg_response_time_days <= 5 ? C.amber : C.red,
                }}>
                  {stats.avg_response_time_days != null ? stats.avg_response_time_days.toFixed(1) : '—'}
                </span>
                <span style={{ fontSize: '16px', color: C.muted }}> days</span>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px' }}>
                  {/* Guard the no-data case (null/undefined/0) so we don't label an empty
                      metric "Excellent" (null < 2 is truthy in JS). */}
                  {!stats.avg_response_time_days ? 'No data'
                    : stats.avg_response_time_days < 2 ? 'Excellent'
                    : stats.avg_response_time_days <= 5 ? 'Good' : 'Needs improvement'}
                </div>
                <div style={{ fontSize: '10px', color: C.subtle, marginTop: '4px' }}>
                  Platform avg: {(stats.platform_avg_response_time_days || 0).toFixed(1)} days
                </div>
              </div>
            }
          />
        </div>

        {/* ── Stat cards row 2 ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px', marginBottom: '28px' }}>
          <StatCard
            label="Review Rate This Sem"
            value={null}
            loading={summaryLoading} delay={0}
            extras={
              <div>
                <AnimCount value={stats.review_rate_pct || 0} color={stats.review_rate_pct > 80 ? C.teal : stats.review_rate_pct >= 60 ? C.amber : C.red} />
                <span style={{ fontSize: '18px', color: C.muted }}>%</span>
                <div style={{
                  marginTop: '10px', height: '4px',
                  background: 'rgba(255,255,255,0.06)', borderRadius: '999px',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stats.review_rate_pct || 0, 100)}%` }}
                    transition={{ duration: 1 }}
                    style={{
                      height: '100%', borderRadius: '999px',
                      background: stats.review_rate_pct > 80 ? C.teal : stats.review_rate_pct >= 60 ? C.amber : C.red,
                    }}
                  />
                </div>
              </div>
            }
          />
          <StatCard
            label="Critical Risk Students"
            value={stats.critical_risk_count}
            sub="requiring immediate attention"
            accent={stats.critical_risk_count > 0 ? C.darkRed : C.text}
            loading={summaryLoading} delay={0.08}
          />
          <StatCard
            label="Below 75% Attendance"
            value={stats.below_75_attendance_count}
            sub="students below threshold"
            accent={stats.below_75_attendance_count > 0 ? C.amber : C.text}
            loading={summaryLoading} delay={0.16}
          />
          <StatCard
            label="Not Submitted This Week"
            value={stats.students_not_submitted_this_week}
            sub="students haven't submitted"
            accent={stats.students_not_submitted_this_week > 0 ? C.amber : C.text}
            loading={summaryLoading} delay={0.24}
          />
        </div>

        {/* ── Priority queue preview ────────────────────────────────────────── */}
        <div style={{ ...glass, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Priority queue</span>
                {stats.pending_reviews > 0 && (
                  <span style={{
                    fontSize: '11px', padding: '2px 10px', borderRadius: '999px',
                    background: 'rgba(127,119,221,0.15)', color: C.purple, border: `1px solid rgba(127,119,221,0.25)`,
                  }}>{stats.pending_reviews} pending</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>Sorted by urgency — flagged and high-risk entries first</div>
            </div>
            <button onClick={() => navigate('/mentor/queue')} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontSize: '13px', fontFamily: 'inherit',
            }}>View full queue →</button>
          </div>

          {queueLoading && [1,2,3].map(i => <div key={i} style={{ marginBottom: '10px' }}><Sk h={88} /></div>)}

          {!queueLoading && queueEntries.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px',
              background: 'rgba(29,158,117,0.06)', border: `1px solid rgba(29,158,117,0.15)`,
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '14px', color: C.teal, fontWeight: 600 }}>All caught up!</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>No pending entries</div>
            </div>
          )}

          {queueEntries.map((entry, i) => (
            <QueueEntryRow key={entry.id} entry={entry} navigate={navigate} delay={i * 0.08} />
          ))}
        </div>

        {/* ── Flagged & critical panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {showFlagged && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ ...glass, borderLeft: `2px solid ${C.red}`, marginBottom: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Needs immediate attention</span>
                <button onClick={() => navigate('/mentor/flagged')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontSize: '12px', fontFamily: 'inherit' }}>
                  View all flagged →
                </button>
              </div>

              {flaggedLoading && [1,2].map(i => <Sk key={i} h={60} style={{ marginBottom: 10 }} />)}

              {flaggedStudents.map((s, i) => {
                const riskCol = s.latest_risk_score >= 80 ? C.darkRed : s.latest_risk_score >= 60 ? C.red : C.amber
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 0', borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: `${riskCol}18`, border: `1px solid ${riskCol}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: riskCol,
                    }}>{getInitials(s.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{s.name}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {s.reasons.includes('high_risk') && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.red}15`, color: C.red, border: `1px solid ${C.red}30` }}>High risk ({s.latest_risk_score})</span>}
                        {s.reasons.includes('flagged_entry') && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'rgba(153,31,31,0.15)', color: C.darkRed, border: `1px solid rgba(153,31,31,0.3)` }}>Flagged entry</span>}
                        {s.reasons.includes('low_attendance') && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.amber}15`, color: C.amber, border: `1px solid ${C.amber}30` }}>Attendance {Math.round(s.current_attendance_pct || 0)}%</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => navigate(`/mentor/students/${s.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontSize: '11px', fontFamily: 'inherit' }}>View →</button>
                      {s.latest_entry_id && (
                        <button onClick={() => navigate(`/mentor/review/${s.latest_entry_id}`)} style={{
                          background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`,
                          borderRadius: '6px', padding: '3px 10px', color: C.red, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                        }}>Review</button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Student comparison chart ──────────────────────────────────────── */}
        <div style={{ ...glass, marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Student risk trends — last 8 weeks</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>All assigned students on the same scale</div>
          </div>
          {compLoading && <Sk h={220} />}
          {!compLoading && !compChartData && (
            <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>
              Add more students to see comparison
            </div>
          )}
          {compChartData && <Line data={compChartData} options={compOpts} />}
        </div>

        {/* ── Subject concerns ─────────────────────────────────────────────── */}
        <div style={{ ...glass, marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Subject concerns across your students</div>
          </div>
          {subjectLoading && <Sk h={200} />}
          {!subjectLoading && subjectConcerns.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: C.muted, fontSize: '13px' }}>No subject ratings yet</div>
          )}
          {subjectChartData && <Bar data={subjectChartData} options={subjectOpts} />}
          {subjectConcerns.some(s => s.pct_of_students_struggling > 50) && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(239,159,39,0.07)', border: `1px solid rgba(239,159,39,0.2)`,
              fontSize: '12px', color: C.amber,
            }}>
              ⚠ More than half your students are struggling with {subjectConcerns.find(s => s.pct_of_students_struggling > 50)?.subject_name}. Consider raising this with the department.
            </div>
          )}
        </div>

        {/* ── Upcoming sessions ─────────────────────────────────────────────── */}
        <div style={{ ...glass }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Upcoming sessions</span>
            <button onClick={() => navigate('/mentor/sessions')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontSize: '12px', fontFamily: 'inherit' }}>
              Schedule new →
            </button>
          </div>
          {upcomingSessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: C.muted, fontSize: '13px' }}>
              No upcoming sessions scheduled
            </div>
          )}
          {upcomingSessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(29,158,117,0.15)', border: `1px solid rgba(29,158,117,0.25)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: C.teal,
              }}>{getInitials(s.student?.name || s.student_name || '?')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{s.student?.name || s.student_name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  {s.location ? ` · ${s.location}` : ''}
                </div>
              </div>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                background: 'rgba(29,158,117,0.1)', color: C.teal,
              }}>{s.duration_mins ? `${s.duration_mins}m` : '—'}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
