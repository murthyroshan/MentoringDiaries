import { useState, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Chart as ChartJS, registerables,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import api from '../../services/api'

ChartJS.register(...registerables)

const C = {
  void: '#06060A', dark: '#0C0C12', surface: '#111118',
  border: 'rgba(255,255,255,0.06)', text: '#F2F0E8',
  muted: 'rgba(242,240,232,0.45)', subtle: 'rgba(242,240,232,0.18)',
  purple: '#7F77DD', teal: '#1D9E75', amber: '#EF9F27', red: '#E24B4A',
}
const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px',
}
const Sk = ({ h = 20, w = '100%', r = 10 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'maPulse 1.6s ease-in-out infinite' }} />
)

const PALETTE = [C.purple, C.teal, C.amber, C.red, '#60A5FA', '#F472B6', '#34D399', '#FB923C']

const baseChartOpts = {
  responsive: true,
  plugins: {
    legend: { labels: { color: C.muted, font: { size: 10 }, boxWidth: 12 } },
    tooltip: { backgroundColor: 'rgba(11,11,17,0.92)', titleColor: C.muted, bodyColor: C.text, borderColor: C.border, borderWidth: 1 },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
  },
}

// ─── Chart section wrapper ────────────────────────────────────────────────────
function ChartSection({ title, subtitle, loading, empty, children, span = 1 }) {
  return (
    <div style={{ ...glass, gridColumn: span > 1 ? `span ${span}` : undefined }}>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>{subtitle}</div>}
      </div>
      {loading && <Sk h={200} />}
      {!loading && empty && (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '12px' }}>
          No data available
        </div>
      )}
      {!loading && !empty && children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorAnalytics() {
  const reduced = useReducedMotion()

  const results = useQueries({
    queries: [
      { queryKey: ['mentor', 'student_comparison'], queryFn: () => api.get('/mentor/student-comparison').then(r => r.data), staleTime: 5 * 60 * 1000 },
      { queryKey: ['mentor', 'subject_concerns'], queryFn: () => api.get('/mentor/subject-concerns').then(r => r.data), staleTime: 5 * 60 * 1000 },
      { queryKey: ['mentor', 'students_roster'], queryFn: () => api.get('/mentor/students-roster').then(r => r.data), staleTime: 5 * 60 * 1000 },
      { queryKey: ['mentor', 'attendance_watchlist'], queryFn: () => api.get('/mentor/attendance-watchlist').then(r => r.data), staleTime: 5 * 60 * 1000 },
      { queryKey: ['mentor', 'priority_queue'], queryFn: () => api.get('/mentor/priority-queue').then(r => r.data), staleTime: 5 * 60 * 1000 },
    ],
  })

  const [compRes, subjRes, rosterRes, attRes, queueRes] = results
  const anyLoading = results.some(r => r.isLoading)

  // ── Data ────────────────────────────────────────────────────────────────────
  const compStudents = compRes.data?.data?.students || []
  const subjects = subjRes.data?.data || []
  const roster = rosterRes.data?.data || []
  const attWatchlist = attRes.data?.data || []
  const queueEntries = queueRes.data?.data || []

  // ── 1. Student risk comparison (multi-line) ────────────────────────────────
  const compChartData = useMemo(() => {
    if (!compStudents.length) return null
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
          tension: 0.4, pointRadius: 3, borderWidth: 1.5, spanGaps: true,
        }
      }),
    }
  }, [compStudents])

  // ── 2. Cohort risk distribution (bar) ─────────────────────────────────────
  const riskDistData = useMemo(() => {
    if (!roster.length) return null
    const buckets = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const s of roster) {
      const r = s.health?.latest_risk_score ?? 0
      if (r < 30) buckets.low++
      else if (r < 60) buckets.medium++
      else if (r < 80) buckets.high++
      else buckets.critical++
    }
    return {
      labels: ['Low (0–29)', 'Medium (30–59)', 'High (60–79)', 'Critical (80+)'],
      datasets: [{
        label: 'Students',
        data: [buckets.low, buckets.medium, buckets.high, buckets.critical],
        backgroundColor: [`${C.teal}99`, `${C.amber}99`, `${C.red}99`, 'rgba(153,31,31,0.6)'],
        borderColor: [C.teal, C.amber, C.red, '#991F1F'],
        borderWidth: 1, borderRadius: 6,
      }],
    }
  }, [roster])

  // ── 3. Mood distribution (doughnut) ───────────────────────────────────────
  const moodData = useMemo(() => {
    if (!roster.length) return null
    const moods = [0, 0, 0, 0, 0]
    for (const s of roster) {
      const m = s.health?.latest_mood
      if (m && m >= 1 && m <= 5) moods[m - 1]++
    }
    return {
      labels: ['1 – Very low', '2 – Low', '3 – Okay', '4 – Good', '5 – Great'],
      datasets: [{
        data: moods,
        backgroundColor: ['rgba(153,31,31,0.8)', `${C.red}99`, `${C.amber}99`, `${C.teal}99`, 'rgba(16,185,129,0.85)'],
        borderColor: ['#991F1F', C.red, C.amber, C.teal, '#10B981'],
        borderWidth: 1,
      }],
    }
  }, [roster])

  // ── 4. Attendance overview (bar per student) ───────────────────────────────
  const attChartData = useMemo(() => {
    if (!roster.length) return null
    const sorted = [...roster].sort((a, b) => (a.health?.current_attendance_pct ?? 0) - (b.health?.current_attendance_pct ?? 0))
    return {
      labels: sorted.map(s => s.name.split(' ')[0]),
      datasets: [{
        label: 'Attendance %',
        data: sorted.map(s => s.health?.current_attendance_pct ?? 0),
        backgroundColor: sorted.map(s => {
          const p = s.health?.current_attendance_pct ?? 100
          return p < 60 ? 'rgba(153,31,31,0.8)' : p < 75 ? `${C.red}99` : p < 85 ? `${C.amber}99` : `${C.teal}99`
        }),
        borderColor: sorted.map(s => {
          const p = s.health?.current_attendance_pct ?? 100
          return p < 75 ? C.red : p < 85 ? C.amber : C.teal
        }),
        borderWidth: 1, borderRadius: 4,
      }],
    }
  }, [roster])

  // ── 5. Subject concerns (horizontal bar) ──────────────────────────────────
  const subjChartData = useMemo(() => {
    if (!subjects.length) return null
    return {
      labels: subjects.map(s => s.subject_name),
      datasets: [
        {
          label: 'Avg rating / 5',
          data: subjects.map(s => s.avg_rating),
          backgroundColor: subjects.map(s => s.avg_rating < 3 ? `${C.red}80` : s.avg_rating < 4 ? `${C.amber}80` : `${C.teal}80`),
          borderColor: subjects.map(s => s.avg_rating < 3 ? C.red : s.avg_rating < 4 ? C.amber : C.teal),
          borderWidth: 1, borderRadius: 4,
        },
        {
          label: '% students struggling',
          data: subjects.map(s => s.pct_of_students_struggling),
          backgroundColor: `${C.purple}50`,
          borderColor: C.purple,
          borderWidth: 1, borderRadius: 4,
        },
      ],
    }
  }, [subjects])

  // ── 6. Queue age distribution ──────────────────────────────────────────────
  const queueAgeData = useMemo(() => {
    if (!queueEntries.length) return null
    const buckets = { '0–2 days': 0, '3–7 days': 0, '8–14 days': 0, '15+ days': 0 }
    for (const e of queueEntries) {
      const d = e.days_since_submitted ?? 0
      if (d <= 2) buckets['0–2 days']++
      else if (d <= 7) buckets['3–7 days']++
      else if (d <= 14) buckets['8–14 days']++
      else buckets['15+ days']++
    }
    return {
      labels: Object.keys(buckets),
      datasets: [{
        data: Object.values(buckets),
        backgroundColor: [`${C.teal}90`, `${C.amber}90`, `${C.red}90`, 'rgba(153,31,31,0.85)'],
        borderColor: [C.teal, C.amber, C.red, '#991F1F'],
        borderWidth: 1,
      }],
    }
  }, [queueEntries])

  // ── 7. Submission consistency ─────────────────────────────────────────────
  const submissionData = useMemo(() => {
    if (!roster.length) return null
    const sorted = [...roster].sort((a, b) => (b.health?.streak ?? 0) - (a.health?.streak ?? 0))
    return {
      labels: sorted.map(s => s.name.split(' ')[0]),
      datasets: [{
        label: 'Submission streak (weeks)',
        data: sorted.map(s => s.health?.streak ?? 0),
        backgroundColor: sorted.map(s => {
          const st = s.health?.streak ?? 0
          return st >= 6 ? `${C.teal}90` : st >= 3 ? `${C.purple}80` : `${C.amber}70`
        }),
        borderColor: sorted.map(s => {
          const st = s.health?.streak ?? 0
          return st >= 6 ? C.teal : st >= 3 ? C.purple : C.amber
        }),
        borderWidth: 1, borderRadius: 4,
      }],
    }
  }, [roster])

  // ── Insight cards ──────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list = []
    if (roster.length) {
      const avgRisk = roster.reduce((a, s) => a + (s.health?.latest_risk_score ?? 0), 0) / roster.length
      if (avgRisk > 60) list.push({ type: 'warning', msg: `Cohort avg risk is ${Math.round(avgRisk)} — review flagged students immediately.` })
      const lowAtt = roster.filter(s => s.health?.below_75_attendance).length
      if (lowAtt > 0) list.push({ type: 'warning', msg: `${lowAtt} student${lowAtt > 1 ? 's are' : ' is'} below 75% attendance.` })
      const struggling = subjects.filter(s => s.pct_of_students_struggling > 50)
      if (struggling.length) list.push({ type: 'info', msg: `More than half your students are struggling in: ${struggling.map(s => s.subject_name).join(', ')}.` })
      const missed = roster.filter(s => s.health?.missed_this_week).length
      if (missed > 0) list.push({ type: 'info', msg: `${missed} student${missed > 1 ? 's' : ''} haven't submitted a diary this week.` })
    }
    return list
  }, [roster, subjects])

  return (
    <>
      <style>{`@keyframes maPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '1280px' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
            Cohort-level insights across all {roster.length} assigned students
          </p>
        </div>

        {/* Insight cards */}
        {insights.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {insights.map((ins, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{
                  padding: '10px 16px', borderRadius: '10px',
                  background: ins.type === 'warning' ? 'rgba(239,159,39,0.06)' : 'rgba(127,119,221,0.06)',
                  border: `1px solid ${ins.type === 'warning' ? 'rgba(239,159,39,0.2)' : 'rgba(127,119,221,0.15)'}`,
                  fontSize: '12px',
                  color: ins.type === 'warning' ? C.amber : C.purple,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span>{ins.type === 'warning' ? '⚠' : '💡'}</span>
                {ins.msg}
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(440px,1fr))', gap: '16px' }}>

          <ChartSection title="Student risk comparison" subtitle="Last 8 weeks — all students" loading={compRes.isLoading} empty={!compChartData}>
            {compChartData && <Line data={compChartData} options={{ ...baseChartOpts, scales: { ...baseChartOpts.scales, y: { ...baseChartOpts.scales.y, min: 0, max: 100 } } }} />}
          </ChartSection>

          <ChartSection title="Cohort risk distribution" subtitle="How many students fall in each risk band" loading={rosterRes.isLoading} empty={!riskDistData}>
            {riskDistData && <Bar data={riskDistData} options={{ ...baseChartOpts, plugins: { ...baseChartOpts.plugins, legend: { display: false } } }} />}
          </ChartSection>

          <ChartSection title="Mood snapshot" subtitle="Latest mood rating per student" loading={rosterRes.isLoading} empty={!moodData}>
            {moodData && (
              <div style={{ maxWidth: 280, margin: '0 auto' }}>
                <Doughnut data={moodData} options={{
                  plugins: { legend: { position: 'bottom', labels: { color: C.muted, font: { size: 10 }, boxWidth: 12, padding: 12 } }, tooltip: baseChartOpts.plugins.tooltip },
                  cutout: '60%',
                }} />
              </div>
            )}
          </ChartSection>

          <ChartSection title="Pending entry age" subtitle="How long entries have been waiting for review" loading={queueRes.isLoading} empty={!queueAgeData}>
            {queueAgeData && (
              <div style={{ maxWidth: 280, margin: '0 auto' }}>
                <Doughnut data={queueAgeData} options={{
                  plugins: { legend: { position: 'bottom', labels: { color: C.muted, font: { size: 10 }, boxWidth: 12, padding: 10 } }, tooltip: baseChartOpts.plugins.tooltip },
                  cutout: '55%',
                }} />
              </div>
            )}
          </ChartSection>

          <ChartSection title="Attendance by student" subtitle="Current cumulative % — red = below 75%" loading={rosterRes.isLoading} empty={!attChartData} span={2}>
            {attChartData && (
              <>
                <Bar data={attChartData} options={{
                  ...baseChartOpts,
                  plugins: { ...baseChartOpts.plugins, legend: { display: false } },
                  scales: { ...baseChartOpts.scales, y: { ...baseChartOpts.scales.y, min: 0, max: 100 } },
                }} />
                <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,159,39,0.05)', border: `1px solid rgba(239,159,39,0.15)`, fontSize: '11px', color: C.amber }}>
                  Red bars = below 75%. Yellow = 75–84%. Green = 85%+.
                </div>
              </>
            )}
          </ChartSection>

          <ChartSection title="Subject concerns" subtitle="Avg student rating per subject (1–5) + % struggling" loading={subjRes.isLoading} empty={!subjChartData} span={2}>
            {subjChartData && (
              <Bar data={subjChartData} options={{
                ...baseChartOpts,
                indexAxis: 'y',
                scales: {
                  x: { ...baseChartOpts.scales.x, min: 0, max: 100 },
                  y: { ...baseChartOpts.scales.y },
                },
              }} />
            )}
          </ChartSection>

          <ChartSection title="Submission consistency — streaks" subtitle="Current consecutive weeks of diary submissions per student" loading={rosterRes.isLoading} empty={!submissionData} span={2}>
            {submissionData && (
              <Bar data={submissionData} options={{
                ...baseChartOpts,
                plugins: { ...baseChartOpts.plugins, legend: { display: false } },
              }} />
            )}
          </ChartSection>

          {/* Attendance watchlist table */}
          <ChartSection title="Attendance watchlist" subtitle="Students with declining or below-75% attendance" loading={attRes.isLoading} empty={attWatchlist.length === 0} span={2}>
            {attWatchlist.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: s.is_below_75 ? 'rgba(226,75,74,0.15)' : 'rgba(239,159,39,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700,
                  color: s.is_below_75 ? C.red : C.amber,
                }}>
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{s.department}-{s.section}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: s.is_below_75 ? C.red : C.amber }}>
                    {s.current_cumulative_pct}%
                  </span>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                    background: s.trend_direction === 'rising' ? 'rgba(29,158,117,0.1)' : s.trend_direction === 'falling' ? 'rgba(226,75,74,0.1)' : 'rgba(255,255,255,0.05)',
                    color: s.trend_direction === 'rising' ? C.teal : s.trend_direction === 'falling' ? C.red : C.muted,
                  }}>
                    {s.trend_direction === 'rising' ? '↑ Rising' : s.trend_direction === 'falling' ? '↓ Falling' : '→ Stable'}
                  </span>
                </div>
              </div>
            ))}
          </ChartSection>
        </div>
      </motion.div>
    </>
  )
}
