import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Chart as ChartJS,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Filler, Tooltip, Legend,
  DoughnutController, ArcElement,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { getWeekDateRange, getCurrentISOWeek } from '../../utils/weekDates'

ChartJS.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend, DoughnutController, ArcElement)

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
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

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return C.green
  if (score < 60) return C.amber
  if (score < 80) return C.red
  return '#991F1F'
}

function getRiskLabel(score) {
  if (score == null) return '—'
  if (score < 30) return 'Low'
  if (score < 60) return 'Medium'
  if (score < 80) return 'High'
  return 'Critical'
}

function getMoodColor(m) {
  if (m === 5) return C.teal
  if (m === 4) return C.purple
  if (m === 3) return C.amber
  if (m === 2) return '#f97316'
  return C.red
}

function getMoodEmoji(m) {
  return ['', '😔', '😟', '😐', '🙂', '😄'][m] || '😐'
}

function getMoodLabel(m) {
  return ['', 'Tough', 'Struggling', 'Okay', 'Good', 'Great'][m] || 'Okay'
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const Skel = ({ h = 16, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'mePulse 1.5s ease-in-out infinite' }} />
)

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

// ─── Risk Trend Chart ─────────────────────────────────────────────────────────
function RiskTrendChart({ entries }) {
  const chartRef = useRef(null)
  const sorted = useMemo(() => [...entries].sort((a, b) => a.week_number - b.week_number).filter(e => e.ai_risk_score != null), [entries])

  const chartData = useMemo(() => {
    if (!sorted.length) return null
    const labels = sorted.map(e => `Wk ${e.week_number}`)
    const scores = sorted.map(e => e.ai_risk_score)
    const pointColors = scores.map(s => getRiskColor(s))

    return {
      labels,
      datasets: [
        {
          label: 'Risk Score',
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
  }, [sorted])

  const options = {
    responsive: true,
    animation: { duration: 1000 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted,
        bodyColor: C.text,
        borderColor: C.border,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const e = sorted[ctx.dataIndex]
            return ` Risk ${ctx.raw} · ${e?.ai_sentiment || ''}`
          },
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 11 } }, border: { color: 'transparent' } },
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 11 }, stepSize: 20 }, border: { color: 'transparent' } },
    },
  }

  if (!sorted.length) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: C.muted }}>Submit diary entries to see your risk trend</div>
  }

  return <Line data={chartData} options={options} />
}

// ─── Mood Doughnut ─────────────────────────────────────────────────────────────
function MoodDoughnut({ entries }) {
  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    entries.forEach(e => { if (e.mood) c[e.mood] = (c[e.mood] || 0) + 1 })
    return c
  }, [entries])

  const data = {
    labels: ['Tough', 'Struggling', 'Okay', 'Good', 'Great'],
    datasets: [{
      data: [counts[1], counts[2], counts[3], counts[4], counts[5]],
      backgroundColor: [C.red, '#f97316', C.amber, C.purple, C.teal],
      borderColor: 'transparent',
      borderWidth: 0,
    }],
  }
  const options = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        bodyColor: C.text,
        borderColor: C.border,
        borderWidth: 1,
      },
    },
  }

  const hasData = entries.length > 0

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>Mood distribution</div>
      <div style={{ position: 'relative', width: '120px', margin: '0 auto 12px' }}>
        {hasData ? <Doughnut data={data} options={options} /> : (
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: C.muted }}>No data</span>
          </div>
        )}
        {hasData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, color: C.text }}>{entries.length}</span>
            <span style={{ fontSize: '9px', color: C.muted }}>entries</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[5,4,3,2,1].map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: getMoodColor(m), flexShrink: 0 }} />
            <span style={{ color: C.muted }}>{getMoodEmoji(m)} {getMoodLabel(m)}</span>
            <span style={{ marginLeft: 'auto', color: C.text, fontWeight: 600 }}>{counts[m] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Entry Card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, isExpanded, onToggle, navigate, semester }) {
  const [fullEntry, setFullEntry] = useState(null)
  const [loadingFull, setLoadingFull] = useState(false)

  useEffect(() => {
    if (isExpanded && !fullEntry && !loadingFull) {
      setLoadingFull(true)
      api.get(`/diary/${entry.id}`).then(r => {
        setFullEntry(r.data.data)
        setLoadingFull(false)
      }).catch(() => setLoadingFull(false))
    }
  }, [isExpanded]) // eslint-disable-line

  const riskColor = getRiskColor(entry.ai_risk_score)
  const moodColor = getMoodColor(entry.mood)
  const statusColor = entry.status === 'reviewed' ? C.teal : entry.is_flagged ? C.red : C.amber
  const statusLabel = entry.is_flagged ? 'Flagged' : entry.status === 'reviewed' ? 'Reviewed' : 'Pending'

  const subjectConcerns = useMemo(() => {
    if (!fullEntry?.subject_ratings) return []
    return fullEntry.subject_ratings.filter(r => r.rating <= 2).map(r => r.subject_name)
  }, [fullEntry])

  const currentYear = new Date().getFullYear()
  const isCurrentSem = entry.semester === semester

  return (
    <motion.div layout style={{ ...glass, padding: 0, overflow: 'hidden' }}>
      {/* Card header — always visible */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px', cursor: 'pointer' }}
      >
        {/* Mood circle */}
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${moodColor}33`, border: `2px solid ${moodColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
          {getMoodEmoji(entry.mood)}
        </div>

        {/* Center info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: C.text }}>Week {entry.week_number}</span>
            <span style={{ fontSize: '12px', color: C.muted }}>
              {entry.start_date && entry.end_date ? `${formatDate(entry.start_date)} – ${formatDate(entry.end_date)}` : formatDate(entry.created_at)}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {entry.reflection?.slice(0, 120)}{entry.reflection?.length > 120 ? '...' : ''}
          </div>
          {isExpanded && subjectConcerns.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
              {subjectConcerns.map(s => (
                <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', border: `1px solid rgba(239,68,68,0.3)`, color: C.red }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right: risk + status + chevron */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: `${statusColor}22`, border: `1px solid ${statusColor}55`, color: statusColor }}>{statusLabel}</span>
          {entry.ai_risk_score != null && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: `${riskColor}22`, border: `1px solid ${riskColor}55`, color: riskColor }}>
              Risk {entry.ai_risk_score} · {getRiskLabel(entry.ai_risk_score)}
            </span>
          )}
          <span style={{ fontSize: '16px', color: C.muted, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s', marginTop: '2px' }}>›</span>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}` }}>
              {loadingFull ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px' }}>
                  <Skel h={16} /><Skel h={60} /><Skel h={80} />
                </div>
              ) : (
                <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Full reflection */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reflection</div>
                    <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7 }}>{entry.reflection}</div>
                  </div>

                  {/* Challenges */}
                  {entry.challenges && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Challenges</div>
                      <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.7 }}>{entry.challenges}</div>
                    </div>
                  )}

                  {/* Subject ratings */}
                  {fullEntry?.subject_ratings?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject ratings</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                        {fullEntry.subject_ratings.map(sr => (
                          <div key={sr.subject_name} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>{sr.subject_name}</div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1,2,3,4,5].map(s => (
                                <span key={s} style={{ fontSize: '14px', color: sr.rating >= s ? C.purple : C.border }}>{sr.rating >= s ? '★' : '☆'}</span>
                              ))}
                            </div>
                            {sr.note && <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{sr.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendance */}
                  {entry.attendance_pct != null && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attendance</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px', fontWeight: 900, color: entry.attendance_pct >= 75 ? C.green : C.red }}>{Math.round(entry.attendance_pct)}%</span>
                        <span style={{ fontSize: '12px', color: C.muted }}>Cumulative · Semester {entry.semester}</span>
                      </div>
                      {entry.attendance_explanation && (
                        <div style={{ marginTop: '6px', fontSize: '13px', color: C.muted, fontStyle: 'italic' }}>"{entry.attendance_explanation}"</div>
                      )}
                    </div>
                  )}

                  {/* AI analysis */}
                  {entry.ai_risk_score != null && (
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(167,139,250,0.07)', border: `1px solid rgba(167,139,250,0.2)` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Analysis</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: `${getRiskColor(entry.ai_risk_score)}22`, border: `1px solid ${getRiskColor(entry.ai_risk_score)}55`, color: getRiskColor(entry.ai_risk_score) }}>
                          {getRiskLabel(entry.ai_risk_score)} · {entry.ai_risk_score}
                        </span>
                        {entry.ai_sentiment && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: C.muted }}>{entry.ai_sentiment}</span>
                        )}
                      </div>
                      {entry.ai_summary && <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, marginBottom: '8px' }}>{entry.ai_summary}</div>}
                      {Array.isArray(entry.ai_flags) && entry.ai_flags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {entry.ai_flags.map((f, i) => (
                            <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mentor response */}
                  {entry.mentor_response ? (
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(61,214,140,0.07)', border: `1px solid rgba(61,214,140,0.2)` }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Mentor response {entry.mentor?.name ? `· ${entry.mentor.name}` : ''}
                      </div>
                      <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{entry.mentor_response}</div>
                      {entry.mentor_responded_at && <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px' }}>{formatDate(entry.mentor_responded_at)}</div>}
                    </div>
                  ) : entry.is_flagged ? (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.25)`, fontSize: '13px', color: C.red }}>
                      🚩 This entry has been flagged for attention
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.muted }}>
                      <span>🕐</span> Awaiting mentor review
                    </div>
                  )}

                  {/* Attachment */}
                  {entry.attachment_url && (
                    <a href={entry.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: C.purple, textDecoration: 'none' }}>
                      📎 View attachment →
                    </a>
                  )}

                  {/* Edit button */}
                  {isCurrentSem && (
                    <div style={{ paddingTop: '4px' }}>
                      <button
                        onClick={() => navigate(`/student/submit?edit=${entry.id}`)}
                        style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '7px 16px', color: C.text, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
                      >
                        Edit this entry →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyEntries() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const semester = user?.current_semester ?? 1
  const academicYear = currentAcademicYear()
  const currentYear = new Date().getFullYear()
  const currentWeek = getCurrentISOWeek()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [expandedId, setExpandedId] = useState(null)

  const { data: diaryData, isLoading, error, refetch } = useQuery({
    queryKey: ['diary', 'list', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/diary', { params: { semester, academic_year: academicYear, limit: 100 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const allEntries = useMemo(() => diaryData?.data || [], [diaryData])

  // Filter
  const filtered = useMemo(() => {
    let arr = allEntries
    if (filter === 'reviewed') arr = arr.filter(e => e.status === 'reviewed')
    else if (filter === 'pending') arr = arr.filter(e => e.status !== 'reviewed' && !e.is_flagged)
    else if (filter === 'flagged') arr = arr.filter(e => e.is_flagged === 1 || e.is_flagged === true)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter(e => e.reflection?.toLowerCase().includes(q))
    }
    if (sort === 'newest') arr = [...arr].sort((a, b) => b.week_number - a.week_number)
    else if (sort === 'oldest') arr = [...arr].sort((a, b) => a.week_number - b.week_number)
    else if (sort === 'highest_risk') arr = [...arr].sort((a, b) => (b.ai_risk_score ?? 0) - (a.ai_risk_score ?? 0))
    else if (sort === 'lowest_risk') arr = [...arr].sort((a, b) => (a.ai_risk_score ?? 0) - (b.ai_risk_score ?? 0))
    return arr
  }, [allEntries, filter, search, sort])

  // Stats
  const streak = useMemo(() => computeStreak(allEntries), [allEntries])
  const avgRisk = useMemo(() => {
    const withScore = allEntries.filter(e => e.ai_risk_score != null)
    if (!withScore.length) return null
    return Math.round(withScore.reduce((s, e) => s + e.ai_risk_score, 0) / withScore.length)
  }, [allEntries])

  const mostCommonMood = useMemo(() => {
    if (!allEntries.length) return null
    const counts = {}
    allEntries.forEach(e => { if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1 })
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 0)
  }, [allEntries])

  const reviewedCount = useMemo(() => allEntries.filter(e => e.mentor_response).length, [allEntries])

  // Missed weeks
  const missedWeeks = useMemo(() => {
    const submittedSet = new Set(allEntries.map(e => e.week_number))
    const missed = []
    for (let w = 1; w <= currentWeek; w++) {
      if (!submittedSet.has(w)) missed.push(w)
    }
    return missed
  }, [allEntries, currentWeek])

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes mePulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
        <div style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Skel h={32} w="200px" />
          <div style={glass}><Skel h={200} /></div>
          <div style={glass}><Skel h={120} /></div>
          {[1,2,3].map(i => <div key={i} style={glass}><Skel h={90} /></div>)}
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <style>{`@keyframes mePulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
        <div style={{ ...glass, border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>Failed to load entries</div>
          <button onClick={() => refetch()} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '7px 18px', color: C.red, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Retry</button>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes mePulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>My diary entries</h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '6px 0 0' }}>{allEntries.length} entries this semester</p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all','All'],['reviewed','Reviewed'],['pending','Pending'],['flagged','Flagged']].map(([key,label]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === key ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${filter === key ? C.purple : C.border}`, color: filter === key ? '#fff' : C.muted, transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '180px' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reflections..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '7px 32px 7px 12px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ background: 'rgba(17,17,24,0.9)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '7px 12px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest_risk">Highest risk</option>
            <option value="lowest_risk">Lowest risk</option>
          </select>
        </div>

        {/* Risk trend chart */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Risk score trend</div>
          <RiskTrendChart entries={allEntries} />
        </div>

        {/* Stats + Mood row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
          {/* Mood doughnut */}
          <div style={glass}>
            <MoodDoughnut entries={allEntries} />
          </div>

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Avg risk score', value: avgRisk != null ? String(avgRisk) : '—', color: avgRisk != null ? getRiskColor(avgRisk) : C.subtle },
              { label: 'Most common mood', value: mostCommonMood ? `${getMoodEmoji(mostCommonMood)} ${getMoodLabel(mostCommonMood)}` : '—', color: mostCommonMood ? getMoodColor(mostCommonMood) : C.subtle },
              { label: 'Current streak', value: `${streak} week${streak !== 1 ? 's' : ''}`, color: streak > 0 ? C.teal : C.muted },
              { label: 'Mentor feedback', value: `${reviewedCount} entr${reviewedCount !== 1 ? 'ies' : 'y'}`, color: C.purple },
            ].map(stat => (
              <div key={stat.label} style={{ ...glass, padding: '16px' }}>
                <div style={{ fontSize: '11px', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Missed weeks panel */}
        {missedWeeks.length > 0 && (
          <div style={{ ...glass, borderLeft: `2px solid ${C.amber}`, borderRadius: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.amber, marginBottom: '12px' }}>
              Weeks without an entry ({missedWeeks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {missedWeeks.map(w => {
                const { startDate, endDate } = getWeekDateRange(w, currentYear)
                return (
                  <div key={w} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: C.text }}>
                      Week {w} · {startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – {endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigate(`/student/submit?week=${w}`)}
                      style={{ padding: '5px 14px', borderRadius: '8px', background: 'rgba(167,139,250,0.12)', border: `1px solid rgba(167,139,250,0.25)`, color: C.purple, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Submit late entry →
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Entry list */}
        <div>
          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{search || filter !== 'all' ? ' (filtered)' : ''}
          </div>
          {filtered.length === 0 ? (
            <div style={{ ...glass, textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '14px', color: C.muted }}>
                {search || filter !== 'all' ? 'No entries match your filters' : 'No diary entries yet'}
              </div>
              {!search && filter === 'all' && (
                <button onClick={() => navigate('/student/submit')} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: `1px solid ${C.purple}55`, color: C.purple, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  Write your first entry →
                </button>
              )}
            </div>
          ) : (
            <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  navigate={navigate}
                  semester={semester}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}
