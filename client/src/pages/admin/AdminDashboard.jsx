import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useSpring } from 'framer-motion'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  BarElement, BarController, CategoryScale, LinearScale,
  LineElement, LineController, PointElement, Filler,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import {
  RefreshCw, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus,
  Users, BookOpen, Clock, ShieldAlert, ChevronRight,
} from 'lucide-react'

ChartJS.register(
  ArcElement, Tooltip, Legend,
  BarElement, BarController, CategoryScale, LinearScale,
  LineElement, LineController, PointElement, Filler,
)

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
function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

function riskColor(level) {
  if (level === 'critical') return C.darkRed
  if (level === 'high') return C.red
  if (level === 'medium') return C.amber
  return C.teal
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'rgba(255,255,255,0.05)',
    animation: 'adPulse 1.6s ease-in-out infinite',
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

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrCard({ msg, onRetry }) {
  return (
    <div style={{ ...glass, border: `1px solid rgba(226,75,74,0.2)`, textAlign: 'center', padding: '28px' }}>
      <AlertTriangle size={20} color={C.red} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>{msg}</div>
      <button onClick={onRetry} style={{
        background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`,
        borderRadius: '8px', padding: '6px 16px', color: C.red,
        cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
      }}>Retry</button>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, loading, icon: Icon }) {
  const col = accent || C.text
  return (
    <motion.div
      style={{ ...glass }}
      whileHover={{ borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '11px', color: C.muted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        {Icon && <Icon size={14} color={C.subtle} />}
      </div>
      {loading
        ? <><Sk h={36} r={6} /><div style={{ marginTop: 8 }} /><Sk h={12} w="60%" /></>
        : <>
            <AnimCount value={value ?? 0} color={col} />
            {sub && <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px' }}>{sub}</div>}
          </>
      }
    </motion.div>
  )
}

// ─── DEPT SECTIONS CONFIG ─────────────────────────────────────────────────────
const DEPT_SECTIONS = {
  CSE:  ['A', 'B', 'C', 'D'],
  AIML: ['A', 'B'],
  CS:   ['A', 'B'],
  DS:   ['A', 'B'],
}

// ─── Department card ──────────────────────────────────────────────────────────
function DeptCard({ dept, sections, overview, navigate }) {
  const pct = overview?.avg_attendance
  const risk = overview?.avg_risk_score
  const riskCol = risk == null ? C.muted : risk < 30 ? C.teal : risk < 60 ? C.amber : C.red

  return (
    <motion.div
      style={{ ...glass, cursor: 'pointer' }}
      whileHover={{ borderColor: 'rgba(127,119,221,0.3)', y: -2 }}
      transition={{ duration: 0.18 }}
      onClick={() => navigate(`/admin/sections?dept=${dept}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>{dept}</div>
          <div style={{ fontSize: '12px', color: C.muted }}>{sections.length} sections · {overview?.total_students ?? '—'} students</div>
        </div>
        <span style={{
          fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
          background: 'rgba(127,119,221,0.12)', color: C.purple, border: `1px solid rgba(127,119,221,0.2)`,
        }}>
          {dept}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div style={{ ...glass, padding: '10px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: '10px', color: C.muted }}>Avg Attendance</div>
          <div style={{
            fontSize: '18px', fontWeight: 700, marginTop: '2px',
            color: pct == null ? C.subtle : pct >= 75 ? C.teal : C.red,
          }}>
            {pct != null ? `${pct}%` : '—'}
          </div>
        </div>
        <div style={{ ...glass, padding: '10px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: '10px', color: C.muted }}>Avg Risk</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: riskCol }}>
            {risk != null ? risk : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {sections.map(s => (
          <span key={s} style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)', color: C.muted,
            border: `1px solid ${C.border}`,
          }}>
            {s}
          </span>
        ))}
      </div>

      <button
        onClick={e => { e.stopPropagation(); navigate(`/admin/sections?dept=${dept}`) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
          borderRadius: '8px', padding: '7px 12px',
          color: C.purple, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
          width: '100%', justifyContent: 'center',
        }}
      >
        View sections <ArrowRight size={12} />
      </button>
    </motion.div>
  )
}

// ─── Risk alerts panel ────────────────────────────────────────────────────────
function RiskAlertsPanel({ alerts, loading, error, onRetry, navigate }) {
  const top6 = useMemo(() => (Array.isArray(alerts) ? alerts.slice(0, 6) : []), [alerts])

  return (
    <div style={{ ...glass, borderLeft: `2px solid ${C.red}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontWeight: 600, color: C.text, fontSize: '14px' }}>Students needing attention</div>
        <button
          onClick={() => navigate('/admin/risk-monitor')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.purple, fontSize: '12px', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          View all <ChevronRight size={12} />
        </button>
      </div>

      {loading && [1,2,3].map(i => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          <Sk h={36} w={36} r={99} />
          <div style={{ flex: 1 }}>
            <Sk h={12} w="60%" /><div style={{ marginTop: 4 }} /><Sk h={10} w="40%" />
          </div>
        </div>
      ))}

      {error && <ErrCard msg="Failed to load risk alerts" onRetry={onRetry} />}

      {!loading && !error && top6.length === 0 && (
        <div style={{ ...glass, background: 'rgba(29,158,117,0.06)', border: `1px solid rgba(29,158,117,0.15)`, textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: C.teal }}>✓ No students at high or critical risk</div>
        </div>
      )}

      {!loading && !error && top6.map((a) => {
        const level = a.ai_risk_level || 'low'
        const col = riskColor(level)
        const ago = daysAgo(a.last_entry_date)
        return (
          <div key={a.entry_id || a.student_id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 0',
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: `${col}18`, border: `1px solid ${col}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: col,
            }}>
              {getInitials(a.student_name || '?')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.student_name}
              </div>
              <div style={{ fontSize: '11px', color: C.muted }}>
                {a.department}-{a.section} · Roll {a.roll_number}
                {ago != null ? ` · ${ago}d ago` : ''}
              </div>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                background: `${col}18`, color: col, border: `1px solid ${col}30`,
                textTransform: 'capitalize',
              }}>
                {level}
              </span>
              <button
                onClick={() => navigate(`/admin/students/${a.student_id}`)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.purple, fontSize: '11px', fontFamily: 'inherit',
                }}
              >
                View →
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mentor table ─────────────────────────────────────────────────────────────
function MentorTable({ mentors, loading, error, onRetry, navigate }) {
  const [sortKey, setSortKey] = useState('student_count')
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = useMemo(() => {
    if (!Array.isArray(mentors)) return []
    return [...mentors].sort((a, b) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
  }, [mentors, sortKey, sortAsc])

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const thStyle = (key) => ({
    padding: '8px 12px', textAlign: 'left',
    fontSize: '10px', cursor: 'pointer',
    fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
    background: 'none', border: 'none', fontFamily: 'inherit',
    borderBottom: `1px solid ${C.border}`,
    color: sortKey === key ? C.purple : C.muted,
  })

  return (
    <div style={{ ...glass }}>
      <div style={{ fontWeight: 600, color: C.text, fontSize: '14px', marginBottom: '16px' }}>
        Mentor performance
      </div>
      {loading && <Sk h={120} />}
      {error && <ErrCard msg="Failed to load mentors" onRetry={onRetry} />}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {[
                  { label: 'Mentor', key: 'name' },
                  { label: 'Department', key: 'department' },
                  { label: 'Students', key: 'student_count' },
                ].map(h => (
                  <th key={h.key} style={thStyle(h.key)} onClick={() => toggleSort(h.key)}>
                    {h.label} {sortKey === h.key ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => (
                <tr
                  key={m.id}
                  onClick={() => navigate('/admin/mentors')}
                  style={{ cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(127,119,221,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, color: C.purple, flexShrink: 0,
                      }}>
                        {getInitials(m.name)}
                      </div>
                      <span style={{ color: C.text }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted }}>{m.department}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '999px',
                      background: m.student_count === 0 ? 'rgba(239,159,39,0.1)' : 'rgba(29,158,117,0.1)',
                      color: m.student_count === 0 ? C.amber : C.teal,
                      border: `1px solid ${m.student_count === 0 ? 'rgba(239,159,39,0.2)' : 'rgba(29,158,117,0.2)'}`,
                    }}>
                      {m.student_count}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>
                  No mentors found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [selectedBatch, setSelectedBatch] = useState('')
  const academicYear = currentAcademicYear()

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: batchesRes } = useQuery({
    queryKey: ['admin', 'batches'],
    queryFn: () => api.get('/admin/batches').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const batches = batchesRes?.data || []

  const { data: overviewData, isLoading: ovLoading, error: ovError, refetch: refetchOv } = useQuery({
    queryKey: ['admin', 'overview', selectedBatch],
    queryFn: () => api.get('/admin/overview', { params: selectedBatch ? { batch: selectedBatch } : {} }).then(r => r.data),
    staleTime: 60_000, retry: 1, keepPreviousData: true,
  })

  const { data: alertsData, isLoading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useQuery({
    queryKey: ['admin', 'risk-alerts', selectedBatch],
    queryFn: () => api.get('/admin/risk-alerts', { params: selectedBatch ? { batch: selectedBatch } : {} }).then(r => r.data),
    staleTime: 60_000, retry: 1, keepPreviousData: true,
  })

  const { data: mentorsData, isLoading: mentorsLoading, error: mentorsError, refetch: refetchMentors } = useQuery({
    queryKey: ['admin', 'mentors'],
    queryFn: () => api.get('/admin/mentors').then(r => r.data),
    staleTime: 60_000, retry: 1,
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['analytics', 'entry-trends'],
    queryFn: () => api.get('/analytics/entry-trends').then(r => r.data),
    staleTime: 5 * 60_000, retry: 1,
  })

  const { data: riskDistData } = useQuery({
    queryKey: ['analytics', 'risk-distribution'],
    queryFn: () => api.get('/analytics/risk-distribution').then(r => r.data),
    staleTime: 5 * 60_000, retry: 1,
  })

  // ── Derived ─────────────────────────────────────────────────────────────────
  const ov = overviewData?.data
  const alerts = alertsData?.data
  const mentors = mentorsData?.data
  const trends = trendsData?.data
  const riskDist = riskDistData?.data

  const avgPerMentor = ov && ov.total_mentors > 0
    ? Math.round(ov.total_students / ov.total_mentors * 10) / 10 : 0

  const showAlertBanner = ov && (ov.critical_risk_count > 0 || ov.flagged_unreviewed_count > 0)

  // Per-dept overview computed from mentors/overview (approximate from seeded data)
  const DEPT_KEYS = Object.keys(DEPT_SECTIONS)

  // ── Charts ──────────────────────────────────────────────────────────────────

  // Entry trends line chart
  const trendChartData = useMemo(() => {
    if (!Array.isArray(trends) || trends.length === 0) return null
    const labels = trends.map(t => `Wk ${t.week_number}`)
    return {
      labels,
      datasets: [
        {
          label: 'Entries',
          data: trends.map(t => t.count),
          borderColor: C.purple,
          backgroundColor: 'rgba(127,119,221,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: C.purple,
        },
        {
          label: 'Flagged',
          data: trends.map(t => t.flagged_count ?? 0),
          borderColor: C.red,
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: C.red,
        },
      ],
    }
  }, [trends])

  const trendOpts = {
    responsive: true,
    plugins: {
      legend: { labels: { color: C.muted, font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
        callbacks: {
          title: ctx => `Week ${trends?.[ctx[0]?.dataIndex]?.week_number ?? '?'}`,
          label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' }, beginAtZero: true },
    },
  }

  // Risk doughnut
  const doughnutData = useMemo(() => {
    if (!riskDist) return null
    return {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [riskDist.critical ?? 0, riskDist.high ?? 0, riskDist.medium ?? 0, riskDist.low ?? 0],
        backgroundColor: [`${C.darkRed}cc`, `${C.red}cc`, `${C.amber}cc`, `${C.teal}cc`],
        borderColor: [C.darkRed, C.red, C.amber, C.teal],
        borderWidth: 1,
      }],
    }
  }, [riskDist])

  const doughnutOpts = {
    responsive: true,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: { color: C.muted, font: { size: 11 }, padding: 12, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
      },
    },
  }

  // Dept risk bar chart.
  // No per-department risk source is fetched here (the overview endpoint is aggregate
  // only), so render deterministic zeros instead of Math.random() placeholder data
  // that changed on every render.
  const deptBarData = useMemo(() => ({
    labels: DEPT_KEYS,
    datasets: [{
      label: 'Avg Risk Score',
      data: DEPT_KEYS.map(() => 0),
      backgroundColor: DEPT_KEYS.map((_, i) => {
        const colors = [`${C.red}aa`, `${C.amber}aa`, `${C.purple}aa`, `${C.teal}aa`]
        return colors[i % colors.length]
      }),
      borderWidth: 0,
      borderRadius: 4,
    }],
  }), [])

  const deptBarOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
        callbacks: { label: ctx => ` Avg Risk: ${ctx.raw}` },
      },
    },
    scales: {
      x: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { grid: { display: false }, ticks: { color: C.muted, font: { size: 11 } }, border: { color: 'transparent' } },
    },
  }

  function doRefresh() {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
    setLastUpdated(new Date())
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes adPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
      `}</style>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1280px' }}
      >
        {/* ── Greeting bar ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{
              fontFamily: '"Sora", system-ui, sans-serif',
              fontSize: 'clamp(20px,3vw,26px)', fontWeight: 700,
              color: C.text, margin: 0,
            }}>
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
              Platform overview · {academicYear} · Semester 4
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {batches.length > 0 && (
              <select
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                  borderRadius: '8px', padding: '6px 10px', color: C.text,
                  outline: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit'
                }}
              >
                <option value="" style={{ color: '#000' }}>All batches</option>
                {batches.map(b => (
                  <option key={b} value={b} style={{ color: '#000' }}>{b}</option>
                ))}
              </select>
            )}
            <span style={{ fontSize: '12px', color: C.muted, margin: '0 4px' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={doRefresh}
              style={{
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: C.muted, fontSize: '12px', fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Alert banner ──────────────────────────────────────────────────── */}
        {!ovLoading && showAlertBanner && (
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: 'rgba(226,75,74,0.08)', border: `1px solid rgba(226,75,74,0.25)`,
              borderRadius: '12px', padding: '12px 18px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '12px', flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} color={C.red} />
              <span style={{ fontSize: '13px', color: C.red }}>
                {ov.critical_risk_count > 0 && `${ov.critical_risk_count} students at critical risk`}
                {ov.critical_risk_count > 0 && ov.flagged_unreviewed_count > 0 && ' · '}
                {ov.flagged_unreviewed_count > 0 && `${ov.flagged_unreviewed_count} flagged entries unreviewed`}
              </span>
            </div>
            <button
              onClick={() => navigate('/admin/risk-monitor')}
              style={{
                background: 'rgba(226,75,74,0.12)', border: `1px solid rgba(226,75,74,0.3)`,
                borderRadius: '8px', padding: '5px 14px', color: C.red,
                cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              View Risk Monitor →
            </button>
          </motion.div>
        )}

        {/* ── Row 1 stats ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px', marginBottom: '14px' }}>
          <StatCard label="Total Students" value={ov?.total_students} icon={Users}
            sub={`${Object.entries(DEPT_SECTIONS).map(([d, s]) => `${d}:${s.length * 10}`).join(' · ')}`}
            loading={ovLoading} />
          <StatCard label="Total Mentors" value={ov?.total_mentors} icon={Users}
            sub={`avg ${avgPerMentor} students/mentor`}
            loading={ovLoading} />
          <StatCard label="Entries This Sem" value={ov?.total_entries_this_sem} icon={BookOpen}
            sub={`this week: ${ov?.entries_this_week ?? 0}`}
            loading={ovLoading} />
          <StatCard label="Pending Reviews"
            value={ov?.pending_reviews_count}
            accent={ov?.pending_reviews_count > 20 ? C.red : ov?.pending_reviews_count > 10 ? C.amber : C.text}
            icon={Clock}
            loading={ovLoading} />
        </div>

        {/* ── Row 2 stats ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '14px', marginBottom: '28px' }}>
          <StatCard label="Critical Risk" value={ov?.critical_risk_count}
            accent={ov?.critical_risk_count > 0 ? C.darkRed : C.text}
            loading={ovLoading} />
          <StatCard label="High Risk" value={ov?.high_risk_count}
            accent={ov?.high_risk_count > 0 ? C.red : C.text}
            loading={ovLoading} />
          <StatCard label="Below 75% Attendance" value={ov?.below_75_attendance_count}
            accent={ov?.below_75_attendance_count > 0 ? C.amber : C.teal}
            loading={ovLoading} />
          <StatCard label="No Mentor Assigned" value={ov?.no_mentor_count}
            accent={ov?.no_mentor_count > 0 ? C.amber : C.text}
            loading={ovLoading} />
        </div>

        {/* ── Departments at a glance ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
            Departments at a glance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '14px' }}>
            {Object.entries(DEPT_SECTIONS).map(([dept, sections]) => (
              // No per-department overview endpoint exists; DeptCard renders '—'
              // deterministically for a null overview (no fabricated placeholder values).
              <DeptCard
                key={dept}
                dept={dept}
                sections={sections}
                overview={null}
                navigate={navigate}
              />
            ))}
          </div>
        </div>

        {/* ── Risk distribution + dept bar ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ ...glass }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
              Entry risk distribution
            </div>
            {doughnutData ? (
              <div style={{ maxHeight: 220 }}>
                <Doughnut data={doughnutData} options={doughnutOpts} />
              </div>
            ) : (
              <Sk h={180} />
            )}
          </div>
          <div style={{ ...glass }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
              Avg risk score by department
            </div>
            <Bar data={deptBarData} options={deptBarOpts} />
          </div>
        </div>

        {/* ── Entry trends ──────────────────────────────────────────────────── */}
        <div style={{ ...glass, marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
            Entry trends
          </div>
          {trendsLoading && <Sk h={180} />}
          {trendChartData && <Line data={trendChartData} options={trendOpts} />}
          {!trendsLoading && !trendChartData && (
            <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>
              No entry trend data available yet
            </div>
          )}
        </div>

        {/* ── Risk alerts + Mentor table ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <RiskAlertsPanel
            alerts={alerts}
            loading={alertsLoading}
            error={alertsError}
            onRetry={refetchAlerts}
            navigate={navigate}
          />
          <MentorTable
            mentors={mentors}
            loading={mentorsLoading}
            error={mentorsError}
            onRetry={refetchMentors}
            navigate={navigate}
          />
        </div>
      </motion.div>
    </>
  )
}
