import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

ChartJS.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

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

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

function formatMonthYear(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCgpaColor(v) {
  if (v >= 8.5) return C.teal
  if (v >= 7) return C.purple
  if (v >= 6) return C.amber
  return C.red
}

const GRADE_MAP = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, F: 0 }

const Skel = ({ h = 16, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'pfPulse 1.5s ease-in-out infinite' }} />
)

const typeColors = { event: C.teal, course: C.purple, competition: C.amber, other: C.subtle }
const typeIcons = {
  event: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  course: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  competition: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  other: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
}

// ─── CGPA Sparkline ───────────────────────────────────────────────────────────
function CGPASparkline({ marksData }) {
  const points = useMemo(() => {
    return [...marksData].sort((a, b) => a.semester - b.semester).filter(m => m.cgpa != null).map(m => m.cgpa)
  }, [marksData])

  if (!points.length) return <div style={{ width: 200, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: C.muted }}>No data</div>

  const data = {
    labels: points.map((_, i) => `S${i + 1}`),
    datasets: [{
      data: points,
      borderColor: C.purple,
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointBackgroundColor: C.purple,
    }],
  }
  const options = {
    responsive: false,
    animation: { duration: 800 },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false, min: 0, max: 10 },
    },
  }

  return <Line data={data} options={options} width={200} height={60} />
}

// ─── Achievement Card ─────────────────────────────────────────────────────────
function AchievementCard({ achievement }) {
  const typeColor = typeColors[achievement.type] || C.subtle
  const icon = typeIcons[achievement.type] || typeIcons.other

  return (
    <motion.div whileHover={{ scale: 1.01 }} style={{ ...glass, padding: '16px', position: 'relative' }}>
      {/* Type badge */}
      <div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', background: `${typeColor}22`, border: `1px solid ${typeColor}55`, color: typeColor, textTransform: 'capitalize' }}>
        {achievement.type}
      </div>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', paddingRight: '80px' }}>
        <div style={{ color: typeColor, flexShrink: 0, marginTop: '2px' }}>{icon}</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{achievement.title}</div>
      </div>

      {achievement.description && (
        <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5, marginBottom: '10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {achievement.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {achievement.date && <span style={{ fontSize: '11px', color: C.muted }}>{formatDate(achievement.date)}</span>}
        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted }}>Sem {achievement.semester}</span>
        {achievement.proof_url && (
          <a href={achievement.proof_url} target="_blank" rel="noreferrer"
            style={{ fontSize: '11px', color: C.purple, textDecoration: 'none', marginLeft: 'auto' }}>
            View certificate →
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ─── Semester Summary Card ────────────────────────────────────────────────────
function SemesterCard({ sem, marksData, diaryEntries, achievements, attendanceHistory, isCurrent }) {
  const semMarks = marksData.find(m => m.semester === sem)
  const semEntries = diaryEntries.filter(e => e.semester === sem)
  const semAchievements = achievements.filter(a => a.semester === sem)
  const lastAtt = attendanceHistory.length > 0 ? attendanceHistory[attendanceHistory.length - 1] : null

  const riskDots = semEntries.slice(-5).map(e => e.ai_risk_score)
  const getRiskDotColor = (score) => {
    if (score == null) return 'rgba(255,255,255,0.08)'
    if (score < 30) return C.green
    if (score < 60) return C.amber
    return C.red
  }

  return (
    <div style={{
      ...glass,
      width: '200px',
      flexShrink: 0,
      borderTop: `3px solid ${C.purple}`,
      ...(isCurrent ? { border: `2px dashed ${C.purple}66`, borderTop: `3px solid ${C.purple}` } : {}),
      position: 'relative',
    }}>
      {isCurrent && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${C.amber}22`, border: `1px solid ${C.amber}55`, color: C.amber }}>In progress</div>
      )}
      <div style={{ fontSize: '13px', fontWeight: 700, color: C.purple, marginBottom: '12px' }}>Semester {sem}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>CGPA</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: semMarks?.cgpa != null ? getCgpaColor(semMarks.cgpa) : C.subtle }}>
            {semMarks?.cgpa != null ? semMarks.cgpa.toFixed(2) : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>Attendance</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: lastAtt ? (lastAtt.cumulative_pct >= 75 ? C.green : C.red) : C.muted }}>
            {lastAtt ? `${Math.round(lastAtt.cumulative_pct)}%` : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>Entries</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{semEntries.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>Achievements</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{semAchievements.length}</div>
          </div>
        </div>
        {riskDots.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: C.muted, marginBottom: '4px' }}>Risk trend</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {riskDots.map((s, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: getRiskDotColor(s) }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const academicYear = currentAcademicYear()
  const semester = user?.current_semester ?? 1

  const [achievementFilter, setAchievementFilter] = useState('all')
  const [marksTab, setMarksTab] = useState(semester)

  // Fetch all data in parallel
  const { data: marksData, isLoading: marksLoading } = useQuery({
    queryKey: ['marks', 'all'],
    queryFn: () => api.get('/marks').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements', 'all'],
    queryFn: () => api.get('/achievements').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const { data: diaryData } = useQuery({
    queryKey: ['diary', 'list', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/diary', { params: { semester, academic_year: academicYear, limit: 100 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', 'history', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/attendance/me/history', { params: { semester, year: academicYear } }).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })

  const allMarks = useMemo(() => marksData?.data || [], [marksData])
  const allAchievements = useMemo(() => achievementsData?.data || [], [achievementsData])
  const diaryEntries = useMemo(() => diaryData?.data || [], [diaryData])
  const attendanceHistory = useMemo(() => attendanceData?.data || [], [attendanceData])

  const activeMarksEntry = useMemo(() => allMarks.find(m => m.semester === marksTab) || null, [allMarks, marksTab])

  const cgpas = useMemo(() => allMarks.filter(m => m.cgpa != null).map(m => m.cgpa), [allMarks])
  const latestCgpa = cgpas[cgpas.length - 1] ?? null
  const highestCgpa = cgpas.length ? Math.max(...cgpas) : null
  const highestSem = highestCgpa != null ? (allMarks.find(m => m.cgpa === highestCgpa)?.semester ?? null) : null
  const avgCgpa = cgpas.length ? (cgpas.reduce((s, v) => s + v, 0) / cgpas.length) : null

  // Available semesters for section 3
  const availableSemesters = useMemo(() => {
    const s = new Set(allMarks.map(m => m.semester))
    s.add(semester)
    return [...s].sort((a, b) => a - b)
  }, [allMarks, semester])

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    if (achievementFilter === 'all') return allAchievements
    return allAchievements.filter(a => a.type === achievementFilter)
  }, [allAchievements, achievementFilter])

  // Unique semesters for summary
  const summarySemsSet = useMemo(() => {
    const s = new Set(allMarks.map(m => m.semester))
    s.add(semester)
    return [...s].sort((a, b) => a - b)
  }, [allMarks, semester])

  // Course achievements (for skills section)
  const courseAchievements = useMemo(() => allAchievements.filter(a => a.type === 'course'), [allAchievements])

  const coursesByPlatform = useMemo(() => {
    const map = {}
    courseAchievements.forEach(a => {
      const p = a.platform || 'Other'
      if (!map[p]) map[p] = []
      map[p].push(a)
    })
    return map
  }, [courseAchievements])

  const isLoading = marksLoading || achievementsLoading

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes pfPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
        <div style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={glass}><Skel h={100} /></div>
          <div style={glass}><Skel h={80} /></div>
          <div style={glass}><Skel h={200} /></div>
          <div style={glass}><Skel h={160} /></div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes pfPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Section 1: Profile card ── */}
        <div style={glass}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${C.purple}66, ${C.teal}44)`, border: `2px solid ${C.purple}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {getInitials(user?.name || '')}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: '0 0 6px' }}>{user?.name || '—'}'s Portfolio</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {[
                  user?.department,
                  user?.section ? `Section ${user.section}` : null,
                  user?.roll_number ? `Roll ${user.roll_number}` : null,
                  user?.batch ? `Batch ${user.batch}` : null,
                ].filter(Boolean).map(item => (
                  <span key={item} style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, color: C.muted }}>{item}</span>
                ))}
              </div>
              <div style={{ fontSize: '13px', color: C.muted, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <span>Semester {semester}</span>
                {user?.email && <span>{user.email}</span>}
                {user?.created_at && <span>Member since {formatMonthYear(user.created_at)}</span>}
              </div>
              {user?.mentor_id ? (
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.teal }}>✓ Mentor assigned</div>
              ) : (
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.muted }}>No mentor assigned</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: CGPA overview ── */}
        <div style={glass}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>Academic performance</div>
              <div style={{ fontSize: '12px', color: C.muted }}>{allMarks.length} semester{allMarks.length !== 1 ? 's' : ''} of records</div>
            </div>

            {allMarks.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <CGPASparkline marksData={allMarks} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'Latest CGPA', value: latestCgpa != null ? latestCgpa.toFixed(2) : '—', color: latestCgpa != null ? getCgpaColor(latestCgpa) : C.subtle },
                { label: `Highest (Sem ${highestSem || '—'})`, value: highestCgpa != null ? highestCgpa.toFixed(2) : '—', color: highestCgpa != null ? getCgpaColor(highestCgpa) : C.subtle },
                { label: 'Average', value: avgCgpa != null ? avgCgpa.toFixed(2) : '—', color: avgCgpa != null ? getCgpaColor(avgCgpa) : C.subtle },
              ].map(stat => (
                <div key={stat.label} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, minWidth: '90px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: C.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 3: Academic records ── */}
        <div style={glass}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Academic records</div>

          {/* Semester tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {availableSemesters.map(sem => (
              <button key={sem} onClick={() => setMarksTab(sem)}
                style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: marksTab === sem ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${marksTab === sem ? C.purple : C.border}`, color: marksTab === sem ? '#fff' : C.muted, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Sem {sem}
                {sem !== semester && <span style={{ fontSize: '10px', opacity: 0.6 }}>🔒</span>}
              </button>
            ))}
          </div>

          {activeMarksEntry ? (
            <>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grade</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeMarksEntry.subjects || []).map((s, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: C.text }}>{s.subject_name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, padding: '3px 12px', borderRadius: '999px', background: 'rgba(167,139,250,0.15)', border: `1px solid ${C.purple}55`, color: C.purple }}>{s.grade}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px', color: C.muted }}>{GRADE_MAP[s.grade] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {activeMarksEntry.cgpa != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: C.muted }}>CGPA</span>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: getCgpaColor(activeMarksEntry.cgpa) }}>{activeMarksEntry.cgpa.toFixed(2)}</span>
                </div>
              )}
              {marksTab === semester && activeMarksEntry.submission_count < 2 && (
                <button onClick={() => navigate('/student/submit')}
                  style={{ padding: '7px 18px', borderRadius: '8px', background: 'rgba(167,139,250,0.12)', border: `1px solid ${C.purple}44`, color: C.purple, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}>
                  Edit marks →
                </button>
              )}
              {marksTab !== semester && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted }}>
                  🔒 This is a locked semester record. Contact admin to unlock.
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>No marks submitted for Semester {marksTab}</div>
              {marksTab === semester && (
                <button onClick={() => navigate('/student/submit')}
                  style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(167,139,250,0.12)', border: `1px solid ${C.purple}44`, color: C.purple, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  Submit marks →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Section 4: Achievements wall ── */}
        <div style={glass}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Achievements</div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                {allAchievements.length} achievement{allAchievements.length !== 1 ? 's' : ''}
                {allAchievements.length > 0 && ` across ${new Set(allAchievements.map(a => a.semester)).size} semester${new Set(allAchievements.map(a => a.semester)).size !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['all','All'],['event','Events'],['course','Courses'],['competition','Competitions'],['other','Other']].map(([key, label]) => (
                <button key={key} onClick={() => setAchievementFilter(key)}
                  style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: achievementFilter === key ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${achievementFilter === key ? C.purple : C.border}`, color: achievementFilter === key ? '#fff' : C.muted }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredAchievements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏆</div>
              <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>No achievements logged yet.</div>
              <button onClick={() => navigate('/student/submit')}
                style={{ padding: '7px 18px', borderRadius: '8px', background: 'rgba(167,139,250,0.12)', border: `1px solid ${C.purple}44`, color: C.purple, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                Log your first achievement in Write Entry →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredAchievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          )}
        </div>

        {/* ── Section 5: Semester summary cards (only if multiple semesters) ── */}
        {summarySemsSet.length > 1 && (
          <div style={glass}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Semester overview</div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {summarySemsSet.map(sem => (
                <SemesterCard
                  key={sem}
                  sem={sem}
                  marksData={allMarks}
                  diaryEntries={diaryEntries}
                  achievements={allAchievements}
                  attendanceHistory={sem === semester ? attendanceHistory : []}
                  isCurrent={sem === semester}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Section 6: Skills and certifications (only if courses exist) ── */}
        {courseAchievements.length > 0 && (
          <div style={glass}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Skills & certifications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(coursesByPlatform).map(([platform, courses]) => (
                <div key={platform}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>{platform}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {courses.map(course => (
                      <div key={course.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{course.title}</div>
                          {course.date && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{formatDate(course.date)}</div>}
                        </div>
                        {course.proof_url && (
                          <a href={course.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: C.purple, textDecoration: 'none', whiteSpace: 'nowrap' }}>View certificate →</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
