import { useRef, useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useSpring } from 'framer-motion'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { getCurrentISOWeek } from '../../utils/weekDates'
import { format } from 'date-fns'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

// ─── Design tokens (match Landing.jsx) ────────────────────────────────────────
const C = {
  void:    '#06060A',
  dark:    '#0C0C12',
  surface: '#111118',
  elevated:'#16161F',
  border:  'rgba(255,255,255,0.06)',
  gold:    '#E8B84B',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  green:   '#3DD68C',
  amber:   '#F59E0B',
  red:     '#EF4444',
  teal:    '#2DD4BF',
  purple:  '#A78BFA',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return '#1D9E75'
  if (score < 60) return '#EF9F27'
  if (score < 80) return '#E24B4A'
  return '#991F1F'
}

function getRiskLabel(score) {
  if (score == null) return 'No data yet'
  if (score < 30) return 'Low risk — on track'
  if (score < 60) return 'Moderate risk — monitor'
  if (score < 80) return 'High risk — needs attention'
  return 'Critical risk — urgent'
}

function getWellbeingLabel(score) {
  if (score == null) return 'No entries yet'
  if (score >= 70) return 'Doing well'
  if (score >= 40) return 'Monitor closely'
  return 'Needs attention'
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

function computeStreak(entries) {
  if (!entries.length) return 0
  const weeks = [...new Set(entries.map(e => e.week_number))].sort((a, b) => b - a)
  let streak = 0
  for (let i = 0; i < weeks.length; i++) {
    if (i === 0 || weeks[i - 1] - weeks[i] === 1) streak++
    else break
  }
  return streak
}

// ─── Glass card ───────────────────────────────────────────────────────────────
const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '20px',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonBox = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'rgba(255,255,255,0.04)',
    animation: 'sdPulse 1.5s ease-in-out infinite',
  }} />
)

// ─── Animated Number (Framer Motion spring) ───────────────────────────────────
function AnimatedNumber({ value, fontSize = '42px', color = C.text, suffix = '' }) {
  const spring = useSpring(0, { stiffness: 55, damping: 18 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplay(Math.round(v).toString())
    })
    return unsubscribe
  }, [spring])

  useEffect(() => {
    if (value != null) spring.set(value)
  }, [value, spring])

  return (
    <motion.span style={{ fontSize, fontWeight: 900, color, lineHeight: 1 }}>
      {display}{suffix}
    </motion.span>
  )
}

// ─── Wellbeing Ring ───────────────────────────────────────────────────────────
function WellbeingRing({ wellbeing, dots }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const dashOffset = wellbeing != null
    ? circumference - (circumference * wellbeing) / 100
    : circumference
  const color = wellbeing != null
    ? (wellbeing >= 70 ? C.green : wellbeing >= 40 ? C.amber : C.red)
    : C.subtle

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '22px', fontWeight: 900, color }}>
            {wellbeing != null ? wellbeing : '—'}
          </span>
          <span style={{ fontSize: '10px', color: C.muted }}>/ 100</span>
        </div>
      </div>
      <div style={{ fontSize: '12px', color: C.muted, textAlign: 'center' }}>
        {getWellbeingLabel(wellbeing)}
      </div>
      {dots.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {dots.map((s, i) => (
            <div key={i} title={s != null ? `Score: ${s}` : 'No entry'} style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: s == null ? 'rgba(255,255,255,0.07)' : `${getRiskColor(100 - s)}`,
              opacity: 0.5 + (i / Math.max(dots.length - 1, 1)) * 0.5,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Semester Heatmap ─────────────────────────────────────────────────────────
function SemesterHeatmap({ entries }) {
  const [hovered, setHovered] = useState(null)

  const byWeek = useMemo(() => {
    const map = {}
    for (const e of entries) map[e.week_number] = e
    return map
  }, [entries])

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
        Semester Overview
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '6px',
      }}>
        {Array.from({ length: 16 }, (_, i) => {
          const wk = i + 1
          const entry = byWeek[wk]
          const col = entry ? getRiskColor(entry.ai_risk_score) : 'rgba(255,255,255,0.05)'
          return (
            <div
              key={wk}
              onMouseEnter={() => setHovered(wk)}
              onMouseLeave={() => setHovered(null)}
              style={{
                aspectRatio: '1',
                borderRadius: '8px',
                background: entry ? `${col}22` : col,
                border: `1px solid ${entry ? col : 'rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 600,
                color: entry ? col : C.subtle,
                cursor: 'default', position: 'relative',
              }}
            >
              {wk}
              {hovered === wk && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1A1A26', border: `1px solid ${C.border}`,
                  borderRadius: '8px', padding: '5px 10px',
                  fontSize: '11px', color: C.text, whiteSpace: 'nowrap',
                  zIndex: 20, pointerEvents: 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}>
                  {entry
                    ? `Wk ${wk} · Risk ${entry.ai_risk_score ?? '—'} · ${entry.ai_risk_level ?? ''}`
                    : `Week ${wk} · Not submitted`}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
        {[
          { label: 'Low', color: C.green },
          { label: 'Moderate', color: C.amber },
          { label: 'High', color: C.red },
          { label: 'None', color: 'rgba(255,255,255,0.05)' },
        ].map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: C.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: '2px', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Subject Chart (Chart.js horizontal bar) ──────────────────────────────────
function SubjectChart({ subjects }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: C.muted, textAlign: 'center', padding: '20px 0' }}>
        No subject ratings yet — submit entries with ratings to see performance
      </div>
    )
  }

  const labels = subjects.map(s => s.subject_name)
  const values = subjects.map(s => Number(s.avg_rating || 0))
  const bgColors = values.map(v =>
    v >= 4 ? 'rgba(61,214,140,0.55)' : v >= 3 ? 'rgba(245,158,11,0.55)' : 'rgba(239,68,68,0.55)'
  )
  const borderColors = values.map(v =>
    v >= 4 ? C.green : v >= 3 ? C.amber : C.red
  )

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: bgColors,
      borderColor: borderColors,
      borderWidth: 1,
      borderRadius: 4,
    }],
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted,
        bodyColor: C.text,
        borderColor: C.border,
        borderWidth: 1,
        callbacks: { label: ctx => ` Rating: ${ctx.raw.toFixed(1)} / 5` },
      },
    },
    scales: {
      x: {
        min: 0, max: 5,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: C.muted, font: { size: 11 }, stepSize: 1 },
        border: { color: 'transparent' },
      },
      y: {
        grid: { display: false },
        ticks: { color: C.muted, font: { size: 11 } },
        border: { color: 'transparent' },
      },
    },
  }

  const lowRatedSubjects = subjects.filter(s => Number(s.avg_rating || 0) <= 2)

  return (
    <div>
      <Bar data={data} options={options} />
      {lowRatedSubjects.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {lowRatedSubjects.map(s => (
            <div key={s.subject_name} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 10px', borderRadius: '8px',
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <span style={{ fontSize: '12px' }}>⚠</span>
              <span style={{ fontSize: '12px', color: C.amber }}>
                {s.subject_name} — avg {Number(s.avg_rating || 0).toFixed(1)}/5 · needs attention
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrorCard({ message, onRetry }) {
  return (
    <div style={{
      ...glass,
      border: '1px solid rgba(239,68,68,0.2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '10px', textAlign: 'center', padding: '24px',
    }}>
      <span style={{ fontSize: '20px' }}>⚠</span>
      <span style={{ fontSize: '13px', color: C.muted }}>{message}</span>
      <button onClick={onRetry} style={{
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '8px', padding: '6px 16px', color: C.red,
        cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
      }}>Retry</button>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const semester = user?.current_semester ?? 1
  const academicYear = currentAcademicYear()
  // Use the ISO calendar week — the same basis SubmitEntry and the server use
  // to store week_number. A semester-relative scheme here never matched a
  // submitted entry, so the "not submitted yet" banner never cleared.
  const currentWeek = getCurrentISOWeek()
  const firstName = user?.name?.split(' ')[0] || 'there'

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: diaryData, isLoading: diaryLoading,
    error: diaryError, refetch: refetchDiary,
  } = useQuery({
    queryKey: ['diary', 'list', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/diary', { params: { semester, academic_year: academicYear, limit: 50 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const {
    data: attendanceData, isLoading: attendanceLoading,
    error: attendanceError, refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['attendance', 'history', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/attendance/me/history', { params: { semester, year: academicYear } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const {
    data: insightsData, isLoading: insightsLoading,
  } = useQuery({
    queryKey: ['insights', 'weekly', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/analytics/student-weekly-insight', {
      params: { semester, academic_year: academicYear, week_number: currentWeek },
    }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const {
    data: sessionsData, isLoading: sessionsLoading,
  } = useQuery({
    queryKey: ['sessions', 'upcoming'],
    queryFn: () => api.get('/sessions', { params: { limit: 20 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio', { academic_year: academicYear }],
    queryFn: () => api.get('/analytics/portfolio').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // ── Derived data ───────────────────────────────────────────────────────────

  const entries = useMemo(() => {
    const raw = diaryData?.data
    return Array.isArray(raw) ? raw : []
  }, [diaryData])

  const currentWeekEntry = useMemo(
    () => entries.find(e => e.week_number === currentWeek) ?? null,
    [entries, currentWeek]
  )
  const hasSubmittedCurrentWeek = !!currentWeekEntry

  const latestEntry = entries[0] ?? null
  const prevEntry = entries[1] ?? null
  const riskScore = latestEntry?.ai_risk_score ?? null
  const prevRiskScore = prevEntry?.ai_risk_score ?? null
  const riskDiff = riskScore != null && prevRiskScore != null ? riskScore - prevRiskScore : null

  const entriesCount = entries.length
  const reviewedCount = useMemo(
    () => entries.filter(e => e.mentor_response != null && e.mentor_response !== '').length,
    [entries]
  )

  const attendanceHistory = useMemo(() => {
    const raw = attendanceData?.data
    return Array.isArray(raw) ? raw : []
  }, [attendanceData])
  const latestAttendance = attendanceHistory.length > 0
    ? attendanceHistory[attendanceHistory.length - 1]
    : null
  const attendancePct = latestAttendance?.cumulative_pct ?? null

  const streak = useMemo(() => computeStreak(entries), [entries])

  // 7-week dot trail — null = no entry that week
  const dotTrail = useMemo(() => {
    const result = []
    for (let w = Math.max(currentWeek - 6, 1); w <= currentWeek; w++) {
      const e = entries.find(en => en.week_number === w)
      result.push(e ? (e.ai_risk_score ?? null) : null)
    }
    return result
  }, [entries, currentWeek])

  const subjectPerformance = useMemo(
    () => portfolioData?.data?.subjectPerformance ?? [],
    [portfolioData]
  )

  const allSessions = useMemo(() => {
    const raw = sessionsData?.data
    return Array.isArray(raw) ? raw : []
  }, [sessionsData])

  const nextSession = useMemo(() => {
    const now = Date.now()
    return allSessions
      .filter(s => s.scheduled_at && new Date(s.scheduled_at).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0] ?? null
  }, [allSessions])

  const mentorName = nextSession?.mentor?.name ?? null
  const mentorInitials = mentorName ? getInitials(mentorName) : '?'

  // Normalize insight fields (cached vs fresh response differ in key names)
  const insights = useMemo(() => {
    const raw = insightsData?.data
    if (!raw) return null
    return {
      positive: raw.positive ?? raw.insightParagraph ?? null,
      warning: raw.warning ?? raw.riskTrend ?? null,
      suggestion: raw.suggestion ?? raw.engagementLevel ?? null,
    }
  }, [insightsData])

  // Attention alerts — computed from fetched data, no extra API call
  const alerts = useMemo(() => {
    const list = []
    const dayOfWeek = new Date().getDay()
    const isPastWednesday = dayOfWeek >= 3 && dayOfWeek !== 0
    if (!hasSubmittedCurrentWeek && isPastWednesday) {
      list.push({ type: 'deadline', text: `Week ${currentWeek} diary not yet submitted` })
    }
    const flaggedNoResponse = entries.find(e => e.is_flagged === 1 && !e.mentor_response)
    if (flaggedNoResponse) {
      list.push({ type: 'flag', text: `Flagged entry from Week ${flaggedNoResponse.week_number} awaiting mentor review` })
    }
    if (attendancePct != null && attendancePct < 75) {
      list.push({ type: 'attendance', text: `Attendance at ${Math.round(attendancePct)}% — below the 75% threshold` })
    }
    return list
  }, [hasSubmittedCurrentWeek, currentWeek, entries, attendancePct])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes sdPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes flamePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
      `}</style>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1200px' }}
      >
        {/* ── 2a: Greeting bar ──────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h1 style={{
              fontFamily: '"Sora", system-ui, sans-serif',
              fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700,
              color: C.text, margin: 0,
            }}>
              {getGreeting()}, {firstName}
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '6px 0 0', lineHeight: 1.5 }}>
              Week {currentWeek} · Semester {semester} ·{' '}
              {[user?.department, user?.section].filter(Boolean).join('-')}
              {user?.roll_number ? ` · Roll ${user.roll_number}` : ''} · {academicYear}
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            {hasSubmittedCurrentWeek ? (
              <span style={{
                fontSize: '13px', fontWeight: 500, color: C.teal,
                background: 'rgba(45,212,191,0.1)',
                border: '1px solid rgba(45,212,191,0.25)',
                borderRadius: '999px', padding: '7px 16px',
                display: 'inline-block',
              }}>
                ✓ Week {currentWeek} submitted
              </span>
            ) : (
              <button onClick={() => navigate('/student/submit')} style={{
                background: 'rgba(232,184,75,0.12)',
                border: '1px solid rgba(232,184,75,0.3)',
                borderRadius: '10px', padding: '8px 20px',
                color: C.gold, cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
              }}>
                Submit Week {currentWeek} →
              </button>
            )}
          </div>
        </div>

        {/* ── 2b: Amber banner (only if no submission) ──────────────────────── */}
        {!hasSubmittedCurrentWeek && !diaryLoading && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginTop: '16px',
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.22)',
              borderRadius: '12px', padding: '12px 18px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '13px', color: C.amber }}>
              ⏰ Your Week {currentWeek} diary hasn't been submitted yet
            </span>
            <button onClick={() => navigate('/student/submit')} style={{
              background: 'rgba(245,158,11,0.14)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px', padding: '5px 14px',
              color: C.amber, cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
            }}>
              Submit now
            </button>
          </motion.div>
        )}

        {/* ── 2c: 4 Stat cards ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px', marginTop: '24px',
        }}>
          {/* Card 1 — Risk Score */}
          <motion.div
            style={glass}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
              Latest Risk Score
            </div>
            {diaryLoading ? (
              <><SkeletonBox h={44} r={6} /><div style={{ marginTop: '10px' }} /><SkeletonBox h={14} w="70%" /></>
            ) : diaryError ? (
              <div style={{ fontSize: '12px', color: C.red }}>Failed to load · <button onClick={refetchDiary} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Retry</button></div>
            ) : (
              <>
                {riskScore != null
                  ? <AnimatedNumber value={riskScore} color={getRiskColor(riskScore)} />
                  : <span style={{ fontSize: '42px', fontWeight: 900, color: C.subtle, lineHeight: 1 }}>—</span>
                }
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 9px', borderRadius: '999px',
                    background: `${getRiskColor(riskScore)}18`,
                    color: getRiskColor(riskScore),
                    border: `1px solid ${getRiskColor(riskScore)}30`,
                  }}>{getRiskLabel(riskScore)}</span>
                </div>
                {riskDiff != null && (
                  <div style={{ fontSize: '11px', color: riskDiff <= 0 ? C.green : C.red, marginTop: '6px' }}>
                    {riskDiff < 0 ? `↓ improved ${Math.abs(riskDiff)} pts` : riskDiff > 0 ? `↑ increased ${riskDiff} pts` : '→ unchanged'} from last entry
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Card 2 — Entries submitted */}
          <motion.div
            style={glass}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
              Entries Submitted
            </div>
            {diaryLoading ? (
              <><SkeletonBox h={44} r={6} /><div style={{ marginTop: '10px' }} /><SkeletonBox h={4} r={999} /></>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <AnimatedNumber value={entriesCount} color={C.text} />
                  <span style={{ fontSize: '15px', fontWeight: 500, color: C.muted }}> / 16</span>
                </div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>
                  {Math.max(0, 16 - entriesCount)} weeks remaining
                </div>
                <div style={{
                  marginTop: '12px', height: '4px',
                  background: 'rgba(255,255,255,0.06)', borderRadius: '999px',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((entriesCount / 16) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ height: '100%', background: C.gold, borderRadius: '999px' }}
                  />
                </div>
              </>
            )}
          </motion.div>

          {/* Card 3 — Attendance */}
          <motion.div
            style={glass}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
              Attendance
            </div>
            {attendanceLoading ? (
              <><SkeletonBox h={44} r={6} /><div style={{ marginTop: '10px' }} /><SkeletonBox h={14} w="60%" /></>
            ) : attendanceError ? (
              <>
                <span style={{ fontSize: '42px', fontWeight: 900, color: C.subtle, lineHeight: 1 }}>—</span>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>Not available</div>
              </>
            ) : (
              <>
                {attendancePct != null ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <AnimatedNumber
                      value={Math.round(attendancePct)}
                      color={attendancePct >= 75 ? C.green : C.red}
                    />
                    <span style={{ fontSize: '18px', fontWeight: 700, color: attendancePct >= 75 ? C.green : C.red }}>%</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '42px', fontWeight: 900, color: C.subtle, lineHeight: 1 }}>—</span>
                )}
                <div style={{
                  fontSize: '12px', marginTop: '8px',
                  color: attendancePct != null
                    ? (attendancePct < 75 ? C.red : C.green)
                    : C.muted,
                }}>
                  {attendancePct == null
                    ? 'No record found'
                    : attendancePct < 75
                      ? '⚠ Below 75% threshold'
                      : '✓ Above threshold'}
                </div>
              </>
            )}
          </motion.div>

          {/* Card 4 — Mentor Reviews */}
          <motion.div
            style={glass}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.12)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
              Mentor Reviews
            </div>
            {diaryLoading ? (
              <><SkeletonBox h={44} r={6} /><div style={{ marginTop: '10px' }} /><SkeletonBox h={4} r={999} /></>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <AnimatedNumber value={reviewedCount} color={C.purple} />
                  <span style={{ fontSize: '15px', fontWeight: 500, color: C.muted }}> / {entriesCount}</span>
                </div>
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>
                  {entriesCount - reviewedCount > 0
                    ? `${entriesCount - reviewedCount} pending review`
                    : entriesCount > 0 ? 'All entries reviewed' : 'No entries yet'}
                </div>
                <div style={{
                  marginTop: '12px', height: '4px',
                  background: 'rgba(255,255,255,0.06)', borderRadius: '999px',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: entriesCount > 0 ? `${(reviewedCount / entriesCount) * 100}%` : '0%' }}
                    transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ height: '100%', background: C.purple, borderRadius: '999px' }}
                  />
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* ── Main 2-column layout ──────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: '24px', marginTop: '24px',
        }}>

          {/* ── Left column ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* 2e: Semester heatmap */}
            <motion.div
              style={glass}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {diaryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <SkeletonBox h={14} w="40%" />
                  <SkeletonBox h={80} />
                </div>
              ) : (
                <SemesterHeatmap entries={entries} />
              )}
            </motion.div>

            {/* 2f: Subject performance */}
            <motion.div
              style={glass}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
                Subject Performance
              </div>
              {diaryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2, 3].map(i => <SkeletonBox key={i} h={28} r={6} />)}
                </div>
              ) : (
                <SubjectChart subjects={subjectPerformance} />
              )}
            </motion.div>

            {/* 2i: AI insights */}
            <motion.div
              style={glass}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>AI Insights</span>
                <span style={{ fontSize: '14px', color: C.gold }}>✦</span>
              </div>
              {insightsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[1, 2, 3].map(i => <SkeletonBox key={i} h={50} r={10} />)}
                </div>
              ) : insights && (insights.positive || insights.warning || insights.suggestion) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'positive', label: 'Positive', color: C.teal },
                    { key: 'warning', label: 'Warning', color: C.amber },
                    { key: 'suggestion', label: 'Suggestion', color: C.purple },
                  ].filter(({ key }) => insights[key]).map(({ key, label, color }) => (
                    <div key={key} style={{
                      borderLeft: `3px solid ${color}`,
                      paddingLeft: '12px', paddingTop: '8px', paddingBottom: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '0 10px 10px 0',
                    }}>
                      <div style={{
                        fontSize: '10px', color, fontWeight: 700, marginBottom: '5px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{label}</div>
                      <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.55 }}>
                        {insights[key]}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: C.subtle, textAlign: 'center', padding: '20px 0' }}>
                  Submit your diary entries to unlock AI insights
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right column ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* 2d: Wellbeing ring */}
            <motion.div
              style={{ ...glass, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '16px', alignSelf: 'flex-start' }}>
                Wellbeing Score
              </div>
              {diaryLoading ? (
                <SkeletonBox h={120} w={120} r="50%" />
              ) : (
                <WellbeingRing
                  wellbeing={riskScore != null ? 100 - riskScore : null}
                  dots={dotTrail}
                />
              )}
            </motion.div>

            {/* 2g: Streak */}
            <motion.div
              style={glass}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.17 }}
            >
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '10px' }}>
                Submission Streak
              </div>
              {diaryLoading ? (
                <SkeletonBox h={56} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {streak >= 4 && (
                    <span style={{
                      fontSize: '36px', lineHeight: 1,
                      display: 'inline-block',
                      animation: 'flamePulse 1.6s ease-in-out infinite',
                    }}>🔥</span>
                  )}
                  <div>
                    <AnimatedNumber value={streak} color={C.gold} />
                    <div style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
                      {streak === 1 ? 'week streak' : 'week streak'}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 2h: Mentor card */}
            <motion.div
              style={{
                ...glass,
                border: mentorName
                  ? '1px solid rgba(167,139,250,0.15)'
                  : '1px dashed rgba(255,255,255,0.08)',
              }}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.22 }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
                Your Mentor
              </div>
              {sessionsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <SkeletonBox h={44} />
                  <SkeletonBox h={14} w="60%" />
                </div>
              ) : mentorName ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(167,139,250,0.14)',
                      border: '1.5px solid rgba(167,139,250,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, color: C.purple,
                    }}>
                      {mentorInitials}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{mentorName}</div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>Assigned mentor</div>
                    </div>
                  </div>
                  {nextSession ? (
                    <div style={{
                      marginTop: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${C.border}`,
                      borderRadius: '10px', padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Next session</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                        {format(new Date(nextSession.scheduled_at), 'EEE, MMM d · h:mm a')}
                      </div>
                      {nextSession.location && (
                        <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>
                          📍 {nextSession.location}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: C.subtle, marginTop: '10px' }}>
                      No upcoming sessions scheduled
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => navigate('/student/sessions')} style={{
                      flex: 1, padding: '7px', borderRadius: '8px', fontSize: '11px',
                      background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.25)',
                      color: C.purple, cursor: 'pointer', fontFamily: 'inherit',
                    }}>View sessions</button>
                    <button onClick={() => navigate('/student/entries')} style={{
                      flex: 1, padding: '7px', borderRadius: '8px', fontSize: '11px',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                      color: C.muted, cursor: 'pointer', fontFamily: 'inherit',
                    }}>View feedback</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>👨‍🏫</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text, marginBottom: '6px' }}>
                    No mentor assigned yet
                  </div>
                  <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
                    Contact your department admin to get a mentor assigned
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── 2j: Attention alerts (only when non-empty) ────────────────────── */}
        {alerts.length > 0 && (
          <motion.div
            style={{
              ...glass, marginTop: '24px',
              border: '1px solid rgba(239,68,68,0.18)',
            }}
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.red, marginBottom: '12px' }}>
              ⚑ Attention Required
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.12)',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>
                    {a.type === 'attendance' ? '📉' : a.type === 'flag' ? '🚩' : '⏰'}
                  </span>
                  <span style={{ fontSize: '13px', color: C.text }}>{a.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 2k: Quick actions ─────────────────────────────────────────────── */}
        <motion.div
          style={{ ...glass, marginTop: '24px' }}
          initial={reduced ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              {
                label: "Submit this week's diary",
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ),
                action: () => navigate('/student/submit'),
                color: C.gold, bg: 'rgba(232,184,75,0.1)', border: 'rgba(232,184,75,0.25)',
              },
              {
                label: 'View my entries',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                ),
                action: () => navigate('/student/entries'),
                color: C.teal, bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.25)',
              },
              {
                label: 'My session history',
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
                action: () => navigate('/student/sessions'),
                color: C.purple, bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)',
              },
            ].map(({ label, icon, action, color, bg, border: b }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 18px', borderRadius: '12px',
                  background: bg, border: `1px solid ${b}`,
                  color, cursor: 'pointer', fontSize: '13px',
                  fontWeight: 500, fontFamily: 'inherit',
                  flex: '1 1 180px', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
