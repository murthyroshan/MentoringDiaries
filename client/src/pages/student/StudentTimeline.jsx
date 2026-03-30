import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  CategoryScale, LinearScale, Filler, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

ChartJS.register(LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

// ─── Static historical data (previous semesters) ─────────────────────────────
// Provides realistic chart data for Sem 1–3 when the server has no records.
const STATIC_ATTENDANCE = {
  1: [
    { week_number: 1,  weekly_pct: 100, cumulative_pct: 100 },
    { week_number: 2,  weekly_pct: 90,  cumulative_pct: 95  },
    { week_number: 3,  weekly_pct: 80,  cumulative_pct: 90  },
    { week_number: 4,  weekly_pct: 70,  cumulative_pct: 85  },
    { week_number: 5,  weekly_pct: 60,  cumulative_pct: 80  },
    { week_number: 6,  weekly_pct: 85,  cumulative_pct: 81  },
    { week_number: 7,  weekly_pct: 90,  cumulative_pct: 82  },
    { week_number: 8,  weekly_pct: 95,  cumulative_pct: 84  },
    { week_number: 9,  weekly_pct: 100, cumulative_pct: 86  },
    { week_number: 10, weekly_pct: 80,  cumulative_pct: 85  },
    { week_number: 11, weekly_pct: 75,  cumulative_pct: 84  },
    { week_number: 12, weekly_pct: 70,  cumulative_pct: 82  },
  ],
  2: [
    { week_number: 1,  weekly_pct: 80,  cumulative_pct: 80  },
    { week_number: 2,  weekly_pct: 70,  cumulative_pct: 75  },
    { week_number: 3,  weekly_pct: 65,  cumulative_pct: 72  },
    { week_number: 4,  weekly_pct: 75,  cumulative_pct: 73  },
    { week_number: 5,  weekly_pct: 80,  cumulative_pct: 74  },
    { week_number: 6,  weekly_pct: 85,  cumulative_pct: 76  },
    { week_number: 7,  weekly_pct: 90,  cumulative_pct: 78  },
    { week_number: 8,  weekly_pct: 95,  cumulative_pct: 80  },
    { week_number: 9,  weekly_pct: 85,  cumulative_pct: 81  },
    { week_number: 10, weekly_pct: 70,  cumulative_pct: 79  },
    { week_number: 11, weekly_pct: 60,  cumulative_pct: 76  },
    { week_number: 12, weekly_pct: 75,  cumulative_pct: 76  },
  ],
  3: [
    { week_number: 1,  weekly_pct: 90,  cumulative_pct: 90  },
    { week_number: 2,  weekly_pct: 85,  cumulative_pct: 87  },
    { week_number: 3,  weekly_pct: 95,  cumulative_pct: 90  },
    { week_number: 4,  weekly_pct: 80,  cumulative_pct: 88  },
    { week_number: 5,  weekly_pct: 75,  cumulative_pct: 85  },
    { week_number: 6,  weekly_pct: 70,  cumulative_pct: 83  },
    { week_number: 7,  weekly_pct: 65,  cumulative_pct: 80  },
    { week_number: 8,  weekly_pct: 60,  cumulative_pct: 77  },
    { week_number: 9,  weekly_pct: 70,  cumulative_pct: 76  },
    { week_number: 10, weekly_pct: 80,  cumulative_pct: 77  },
    { week_number: 11, weekly_pct: 85,  cumulative_pct: 78  },
    { week_number: 12, weekly_pct: 90,  cumulative_pct: 79  },
  ],
}

const STATIC_RISK_ENTRIES = {
  1: [
    { week_number: 2,  ai_risk_score: 22, ai_sentiment: 'positive', mood: 4 },
    { week_number: 4,  ai_risk_score: 38, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 6,  ai_risk_score: 55, ai_sentiment: 'negative', mood: 2 },
    { week_number: 8,  ai_risk_score: 42, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 10, ai_risk_score: 28, ai_sentiment: 'positive', mood: 4 },
    { week_number: 12, ai_risk_score: 18, ai_sentiment: 'positive', mood: 5 },
  ],
  2: [
    { week_number: 1,  ai_risk_score: 48, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 3,  ai_risk_score: 62, ai_sentiment: 'negative', mood: 2 },
    { week_number: 5,  ai_risk_score: 71, ai_sentiment: 'negative', mood: 2 },
    { week_number: 7,  ai_risk_score: 55, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 9,  ai_risk_score: 40, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 11, ai_risk_score: 30, ai_sentiment: 'positive', mood: 4 },
  ],
  3: [
    { week_number: 2,  ai_risk_score: 30, ai_sentiment: 'positive', mood: 4 },
    { week_number: 4,  ai_risk_score: 45, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 6,  ai_risk_score: 68, ai_sentiment: 'negative', mood: 2 },
    { week_number: 8,  ai_risk_score: 75, ai_sentiment: 'negative', mood: 1 },
    { week_number: 10, ai_risk_score: 50, ai_sentiment: 'neutral',  mood: 3 },
    { week_number: 12, ai_risk_score: 35, ai_sentiment: 'positive', mood: 4 },
  ],
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  border:  'rgba(255,255,255,0.06)',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  green:   '#3DD68C',
  amber:   '#F59E0B',
  red:     '#EF4444',
  teal:    '#2DD4BF',
  purple:  '#A78BFA',
}

const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '20px',
}

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

// Derive the academic year that a given semester belongs to, based on the student's batch.
// Batch '2023-2027': Sem 1-2 → 2023-24, Sem 3-4 → 2024-25, Sem 5-6 → 2025-26, etc.
function getAcademicYearForSemester(semester, batch) {
  const startYear = parseInt(batch?.split('-')?.[0])
  if (!startYear) return currentAcademicYear()
  const yearOffset = Math.floor((semester - 1) / 2)
  const y = startYear + yearOffset
  return `${y}-${String(y + 1).slice(2)}`
}

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return C.green
  if (score < 60) return C.amber
  if (score < 80) return C.red
  return '#991F1F'
}

const GRADE_MAP = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, F: 0 }

const chartDefaults = {
  responsive: true,
  plugins: {
    legend: {
      labels: { color: 'rgba(242,240,232,0.6)', font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: 'rgba(11,11,17,0.92)',
      titleColor: 'rgba(242,240,232,0.6)',
      bodyColor: '#F2F0E8',
      borderColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: 'rgba(242,240,232,0.45)', font: { size: 11 } },
      border: { color: 'transparent' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: 'rgba(242,240,232,0.45)', font: { size: 11 } },
      border: { color: 'transparent' },
    },
  },
}

const Skel = ({ h = 220 }) => (
  <div style={{ height: h, borderRadius: '10px', background: 'rgba(255,255,255,0.04)', animation: 'tlPulse 1.5s ease-in-out infinite' }} />
)

// ─── Chart 1: Attendance timeline ─────────────────────────────────────────────
function AttendanceChart({ history }) {
  const sorted = useMemo(() => [...history].sort((a, b) => a.week_number - b.week_number), [history])

  if (!sorted.length) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>No attendance data for this semester</div>

  const labels = sorted.map(r => `Wk ${r.week_number}`)
  const cumulative = sorted.map(r => r.cumulative_pct)
  const weekly = sorted.map(r => r.weekly_pct)
  const threshold = sorted.map(() => 75)

  const pointColors = cumulative.map(v => v < 75 ? C.red : C.purple)

  const data = {
    labels,
    datasets: [
      {
        label: 'Cumulative %',
        data: cumulative,
        borderColor: C.purple,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 5,
      },
      {
        label: 'Weekly %',
        data: weekly,
        borderColor: C.teal,
        borderWidth: 1.5,
        borderDash: [5, 5],
        tension: 0.3,
        fill: false,
        pointRadius: 3,
        pointBackgroundColor: C.teal,
      },
      {
        label: '75% threshold',
        data: threshold,
        borderColor: C.red,
        borderWidth: 1,
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
        tension: 0,
      },
    ],
  }

  const options = {
    ...chartDefaults,
    animation: { duration: 1200 },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          title: (items) => `Week ${sorted[items[0].dataIndex]?.week_number}`,
          label: (ctx) => {
            if (ctx.datasetIndex === 2) return null
            const label = ctx.datasetIndex === 0 ? 'Cumulative' : 'This week'
            return ` ${label}: ${ctx.raw?.toFixed(1)}%`
          },
        },
      },
    },
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 100, ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` } },
    },
  }

  return <Line data={data} options={options} />
}

// ─── Chart 2: Risk score history ──────────────────────────────────────────────
function RiskChart({ entries, sessions }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.week_number - b.week_number).filter(e => e.ai_risk_score != null), [entries])

  if (!sorted.length) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>No diary entries with risk scores yet</div>

  const labels = sorted.map(e => `Wk ${e.week_number}`)
  const scores = sorted.map(e => e.ai_risk_score)
  const pointColors = scores.map(s => getRiskColor(s))

  const data = {
    labels,
    datasets: [
      {
        label: 'AI Risk Score',
        data: scores,
        borderColor: C.purple,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx.chart
          const { ctx: canvasCtx, chartArea } = chart
          if (!chartArea) return 'transparent'
          const grad = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          grad.addColorStop(0, `${C.purple}55`)
          grad.addColorStop(1, `${C.purple}00`)
          return grad
        },
        pointBackgroundColor: pointColors,
        pointBorderColor: pointColors,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  }

  const options = {
    ...chartDefaults,
    animation: { duration: 1200 },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          title: (items) => `Week ${sorted[items[0].dataIndex]?.week_number}`,
          label: (ctx) => {
            const e = sorted[ctx.dataIndex]
            const moodEmoji = ['', '😔', '😟', '😐', '🙂', '😄'][e.mood] || ''
            return [
              ` Risk: ${ctx.raw}`,
              e.ai_sentiment ? ` Sentiment: ${e.ai_sentiment}` : null,
              e.mood ? ` Mood: ${moodEmoji}` : null,
            ].filter(Boolean)
          },
        },
      },
    },
    scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 100 } },
  }

  return <Line data={data} options={options} />
}

// ─── Chart 3: Mood × Attendance overlay ────────────────────────────────────
function MoodAttendanceChart({ entries, history }) {
  const weekSet = useMemo(() => {
    const s = new Set()
    entries.forEach(e => s.add(e.week_number))
    history.forEach(r => s.add(r.week_number))
    return [...s].sort((a, b) => a - b)
  }, [entries, history])

  if (!weekSet.length) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>No data yet</div>

  const attMap = useMemo(() => {
    const m = {}
    history.forEach(r => { m[r.week_number] = r.cumulative_pct })
    return m
  }, [history])

  const moodMap = useMemo(() => {
    const m = {}
    entries.forEach(e => { if (e.mood) m[e.week_number] = e.mood })
    return m
  }, [entries])

  const labels = weekSet.map(w => `Wk ${w}`)
  const attData = weekSet.map(w => attMap[w] ?? null)
  const moodData = weekSet.map(w => moodMap[w] ?? null)

  const data = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Attendance %',
        data: attData,
        backgroundColor: `${C.teal}55`,
        borderColor: C.teal,
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Mood (1–5)',
        data: moodData,
        borderColor: C.purple,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: C.purple,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          title: (items) => `Week ${weekSet[items[0].dataIndex]}`,
          label: (ctx) => {
            if (ctx.datasetIndex === 0) return ` Attendance: ${ctx.raw?.toFixed(1) ?? '—'}%`
            const moodLabels = ['', 'Tough', 'Struggling', 'Okay', 'Good', 'Great']
            return ` Mood: ${ctx.raw ?? '—'} (${moodLabels[ctx.raw] || ''})`
          },
        },
      },
    },
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 100, position: 'left', ticks: { ...chartDefaults.scales.y.ticks, callback: v => `${v}%` } },
      y1: { ...chartDefaults.scales.y, min: 0, max: 5, position: 'right', grid: { display: false }, ticks: { ...chartDefaults.scales.y.ticks, stepSize: 1 } },
    },
  }

  return <Line data={data} options={options} />
}

// ─── Chart 4: CGPA bar chart ───────────────────────────────────────────────
function CGPAChart({ marksData, currentSemester }) {
  const semesterMarks = useMemo(() => {
    const map = {}
    ;(marksData || []).forEach(m => { map[m.semester] = m.cgpa })
    return map
  }, [marksData])

  const maxSem = Math.max(currentSemester, ...(marksData || []).map(m => m.semester))
  const semesters = Array.from({ length: maxSem }, (_, i) => i + 1)

  if (!semesters.length) return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>No marks data yet</div>

  const cgpas = semesters.map(s => semesterMarks[s] ?? 0)
  const barColors = cgpas.map(v => {
    if (v >= 8.5) return `${C.teal}88`
    if (v >= 7) return `${C.purple}88`
    if (v >= 6) return `${C.amber}88`
    if (v > 0) return `${C.red}88`
    return 'rgba(255,255,255,0.08)'
  })
  const borderColors = barColors.map(c => c.replace('88', 'cc'))

  const trendLine = cgpas.map((v, i) => {
    const filled = cgpas.filter((x, j) => j <= i && x > 0)
    return filled.length ? filled[filled.length - 1] : null
  })

  const data = {
    labels: semesters.map(s => `Sem ${s}`),
    datasets: [
      {
        type: 'bar',
        label: 'CGPA',
        data: cgpas,
        backgroundColor: barColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Trend',
        data: trendLine,
        borderColor: 'rgba(242,240,232,0.5)',
        borderWidth: 1,
        tension: 0.3,
        pointRadius: 0,
        fill: false,
        yAxisID: 'y',
      },
    ],
  }

  const options = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 1) return null
            const sem = semesters[ctx.dataIndex]
            const val = semesterMarks[sem]
            return val != null ? ` Semester ${sem} · CGPA ${val}` : ` Not submitted yet`
          },
        },
      },
    },
    scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 10, ticks: { ...chartDefaults.scales.y.ticks, stepSize: 2 } } },
  }

  return <Line data={data} options={options} />
}

// ─── Chart 5: Subject grade history ────────────────────────────────────────
function SubjectGradeChart({ marksData }) {
  const semColors = [C.purple, C.teal, C.amber, '#f97316', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6']

  const { subjectNames, datasets } = useMemo(() => {
    const subjectSet = new Set()
    ;(marksData || []).forEach(m => {
      ;(m.subjects || []).forEach(s => subjectSet.add(s.subject_name))
    })
    const names = [...subjectSet]

    const ds = (marksData || []).map((m, i) => {
      const gradeMap = {}
      ;(m.subjects || []).forEach(s => { gradeMap[s.subject_name] = GRADE_MAP[s.grade] ?? 0 })
      return {
        label: `Sem ${m.semester}`,
        data: names.map(n => gradeMap[n] ?? 0),
        backgroundColor: `${semColors[i % semColors.length]}88`,
        borderColor: semColors[i % semColors.length],
        borderWidth: 1,
        borderRadius: 4,
      }
    })

    return { subjectNames: names, datasets: ds }
  }, [marksData])

  if (!subjectNames.length || !datasets.length) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>No subject grade data yet</div>
  }

  const data = { labels: subjectNames, datasets }
  const options = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const gradeNum = ctx.raw
            const gradeName = Object.entries(GRADE_MAP).find(([, v]) => v === gradeNum)?.[0] || '—'
            return ` ${ctx.dataset.label} · ${ctx.label} · ${gradeName} (${gradeNum})`
          },
        },
      },
    },
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 10, ticks: { ...chartDefaults.scales.y.ticks, stepSize: 2 } },
      x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, maxRotation: 30, minRotation: 0 } },
    },
  }

  return <Bar data={data} options={options} />
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentTimeline() {
  const { user } = useAuthStore()
  const academicYear = currentAcademicYear()
  const currentSemester = user?.current_semester ?? 1

  const [activeSemester, setActiveSemester] = useState(currentSemester)

  // Use the academic year that the selected semester actually belongs to
  const activeSemesterYear = useMemo(
    () => getAcademicYearForSemester(activeSemester, user?.batch),
    [activeSemester, user?.batch]
  )

  const { data: marksAllData, isLoading: marksLoading } = useQuery({
    queryKey: ['marks', 'all'],
    queryFn: () => api.get('/marks').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const allMarks = useMemo(() => marksAllData?.data || [], [marksAllData])
  const availableSemesters = useMemo(() => {
    const fromMarks = new Set(allMarks.map(m => m.semester))
    fromMarks.add(currentSemester)
    return [...fromMarks].sort((a, b) => a - b)
  }, [allMarks, currentSemester])

  // Whether we're viewing a past (non-current) semester
  const isPastSemester = activeSemester < currentSemester

  const { data: attendanceData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'history', { semester: activeSemester, academic_year: activeSemesterYear }],
    queryFn: () => api.get('/attendance/me/history', { params: { semester: activeSemester, year: activeSemesterYear } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !isPastSemester || !(activeSemester in STATIC_ATTENDANCE),
  })
  // Use static data for past semesters when API has no records
  const attendanceHistory = useMemo(() => {
    const live = attendanceData?.data || []
    if (live.length > 0) return live
    return STATIC_ATTENDANCE[activeSemester] || []
  }, [attendanceData, activeSemester])

  const { data: diaryData, isLoading: diaryLoading } = useQuery({
    queryKey: ['diary', 'list', { semester: activeSemester, academic_year: activeSemesterYear }],
    queryFn: () => api.get('/diary', { params: { semester: activeSemester, academic_year: activeSemesterYear, limit: 100 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !isPastSemester || !(activeSemester in STATIC_RISK_ENTRIES),
  })
  // Use static risk entries for past semesters when API has no records
  const diaryEntries = useMemo(() => {
    const live = diaryData?.data || []
    if (live.length > 0) return live
    return STATIC_RISK_ENTRIES[activeSemester] || []
  }, [diaryData, activeSemester])

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', 'student'],
    queryFn: () => api.get('/sessions', { params: { limit: 100 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const sessions = useMemo(() => sessionsData?.data || [], [sessionsData])

  const isLoading = marksLoading || attLoading || diaryLoading

  return (
    <>
      <style>{`@keyframes tlPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>Academic timeline</h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '6px 0 0' }}>
              {getAcademicYearForSemester(activeSemester, user?.batch)}
              {isPastSemester && activeSemester in STATIC_ATTENDANCE && (
                <span style={{ marginLeft: '8px', fontSize: '11px', color: C.amber, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '1px 6px' }}>
                  historical data
                </span>
              )}
            </p>
          </div>

          {/* Semester selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {availableSemesters.map(sem => (
              <button key={sem} onClick={() => setActiveSemester(sem)}
                style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeSemester === sem ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${activeSemester === sem ? C.purple : C.border}`, color: activeSemester === sem ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                Sem {sem}{sem === currentSemester ? ' (current)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Past semester static-data notice */}
        {isPastSemester && activeSemester in STATIC_ATTENDANCE && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '12px', color: C.amber }}>
            <span style={{ fontSize: '15px' }}>📊</span>
            Showing archived data for Semester {activeSemester} · Charts reflect your recorded performance from that period.
          </div>
        )}

        {/* Chart 1: Attendance timeline */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
            Attendance · Semester {activeSemester}
          </div>
          {attLoading ? <Skel /> : <AttendanceChart history={attendanceHistory} />}
        </div>

        {/* Chart 2: Risk score history */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>
            AI risk score history · Semester {activeSemester}
          </div>
          {diaryLoading ? <Skel /> : <RiskChart entries={diaryEntries} sessions={sessions} />}
        </div>

        {/* Chart 3: Mood × Attendance overlay */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Mood & attendance · Semester {activeSemester}</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>Bars = attendance %, Line = mood score</div>
          {isLoading ? <Skel /> : <MoodAttendanceChart entries={diaryEntries} history={attendanceHistory} />}
        </div>

        {/* Chart 4: CGPA bar chart */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Semester CGPA</div>
          {marksLoading ? <Skel /> : <CGPAChart marksData={allMarks} currentSemester={currentSemester} />}
        </div>

        {/* Chart 5: Subject grade history */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Subject grade history</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>Grade points: O=10, A+=9, A=8, B+=7, B=6, C=5, F=0</div>
          {marksLoading ? <Skel /> : <SubjectGradeChart marksData={allMarks} />}
        </div>
      </motion.div>
    </>
  )
}
