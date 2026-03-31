import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Chart as ChartJS, BarElement, BarController,
  CategoryScale, LinearScale, Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { AlertTriangle, ArrowLeft, ChevronRight, Download, Search, Eye } from 'lucide-react'
import api from '../../services/api'

ChartJS.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip)

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
  dark:    '#0C0C12',
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

// ─── Constants ─────────────────────────────────────────────────────────────────
const DEPT_SECTIONS = {
  CSE:  ['A', 'B', 'C', 'D'],
  AIML: ['A', 'B'],
  CS:   ['A', 'B'],
  DS:   ['A', 'B'],
}
const DEPTS = Object.keys(DEPT_SECTIONS)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

function riskColor(level) {
  if (level === 'critical') return C.darkRed
  if (level === 'high') return C.red
  if (level === 'medium') return C.amber
  return C.teal
}

function attColor(pct) {
  if (pct == null) return C.subtle
  if (pct >= 80) return C.teal
  if (pct >= 75) return C.amber
  return C.red
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
    animation: 'srPulse 1.6s ease-in-out infinite',
  }} />
)

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

// ─── Risk dots ────────────────────────────────────────────────────────────────
function RiskDots({ students }) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const s of students) counts[s.risk_level || 'low']++
  const total = students.length || 1
  const MAX_DOTS = 10
  const dots = []
  const levels = ['critical', 'high', 'medium', 'low']
  for (const lvl of levels) {
    const n = Math.max(1, Math.round((counts[lvl] / total) * MAX_DOTS)) 
    for (let i = 0; i < n && dots.length < MAX_DOTS; i++) {
      dots.push(riskColor(lvl))
    }
  }
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {dots.map((col, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: col, opacity: 0.8,
        }} />
      ))}
    </div>
  )
}

// ─── Section card (browse view) ───────────────────────────────────────────────
function SectionCard({ dept, section, semester, navigate }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'section-report', dept, section, semester],
    queryFn: () => api.get(`/admin/sections/${dept}/${section}/report`, {
      params: { semester, academic_year: currentAcademicYear() },
    }).then(r => r.data),
    staleTime: 3 * 60_000, retry: 1,
  })

  const report = data?.data
  const summary = report?.summary
  const students = report?.students || []

  return (
    <motion.div
      style={{ ...glass, cursor: 'pointer' }}
      whileHover={{ borderColor: 'rgba(127,119,221,0.3)', y: -2 }}
      transition={{ duration: 0.18 }}
      onClick={() => navigate(`/admin/sections/${dept}/${section}`)}
    >
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '17px', fontWeight: 700, color: C.purple }}>
          {dept} — Section {section}
        </div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
          {isLoading ? '...' : `${summary?.total_students ?? 0} students`} · Semester {semester}
        </div>
      </div>

      {isLoading && <Sk h={80} />}
      {isError && <div style={{ fontSize: '12px', color: C.red }}>Failed to load · <button onClick={e => { e.stopPropagation(); refetch() }} style={{ background: 'none', border: 'none', color: C.amber, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Retry</button></div>}

      {!isLoading && !isError && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'Avg Attendance', val: summary.avg_attendance != null ? `${summary.avg_attendance}%` : '—', col: attColor(summary.avg_attendance) },
              { label: 'Avg Risk', val: summary.avg_risk_score ?? '—', col: summary.avg_risk_score > 60 ? C.red : summary.avg_risk_score > 30 ? C.amber : C.teal },
              { label: 'Pending Reviews', val: summary.pending_reviews_count, col: summary.pending_reviews_count > 0 ? C.amber : C.teal },
              { label: 'High/Critical', val: (summary.high_risk_count || 0) + (summary.critical_risk_count || 0), col: (summary.high_risk_count + summary.critical_risk_count) > 0 ? C.red : C.teal },
            ].map(({ label, val, col }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                padding: '8px 10px', border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: '10px', color: C.muted }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: col, marginTop: '2px' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Attendance bar */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                width: `${Math.min(summary.avg_attendance ?? 0, 100)}%`,
                background: attColor(summary.avg_attendance),
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>

          {/* Risk dots */}
          <RiskDots students={students} />
        </>
      )}

      <button
        onClick={e => { e.stopPropagation(); navigate(`/admin/sections/${dept}/${section}`) }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          width: '100%', marginTop: '14px',
          background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
          borderRadius: '8px', padding: '7px 12px',
          color: C.purple, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        View section <ChevronRight size={12} />
      </button>
    </motion.div>
  )
}

// ─── Section detail view ──────────────────────────────────────────────────────
function SectionDetail({ dept, section }) {
  const navigate = useNavigate()
  const [semester, setSemester] = useState(4)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('roll_number')
  const [sortAsc, setSortAsc] = useState(true)
  const [assignModal, setAssignModal] = useState(null) // student object

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'section-report', dept, section, semester],
    queryFn: () => api.get(`/admin/sections/${dept}/${section}/report`, {
      params: { semester, academic_year: currentAcademicYear() },
    }).then(r => r.data),
    staleTime: 2 * 60_000, retry: 1,
  })

  const report = data?.data
  const summary = report?.summary
  const students = useMemo(() => report?.students || [], [report])

  const filtered = useMemo(() => {
    let list = students
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        String(s.roll_number).includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let va, vb
      if (sortKey === 'attendance') {
        va = a.attendance?.latest_cumulative_pct ?? -1
        vb = b.attendance?.latest_cumulative_pct ?? -1
      } else if (sortKey === 'risk') {
        va = a.diary?.latest_risk_score ?? -1
        vb = b.diary?.latest_risk_score ?? -1
      } else {
        va = a[sortKey] ?? ''
        vb = b[sortKey] ?? ''
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
  }, [students, search, sortKey, sortAsc])

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(true) }
  }

  // Export CSV
  function exportCSV() {
    const header = 'Roll,Name,Attendance%,RiskScore,RiskLevel,TotalEntries,Mentor,PendingReviews'
    const rows = students.map(s => [
      s.roll_number, s.name,
      s.attendance?.latest_cumulative_pct ?? '',
      s.diary?.latest_risk_score ?? '',
      s.risk_level,
      s.diary?.total_entries ?? 0,
      s.mentor_name || '',
      s.diary?.pending_reviews ?? 0,
    ].join(',')).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dept}-${section}-sem${semester}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Chart data
  const attChartData = useMemo(() => {
    if (!students.length) return null
    const sorted = [...students]
      .filter(s => s.attendance?.latest_cumulative_pct != null)
      .sort((a, b) => a.attendance.latest_cumulative_pct - b.attendance.latest_cumulative_pct)
    return {
      labels: sorted.map(s => `Roll ${s.roll_number}`),
      datasets: [{
        label: 'Attendance %',
        data: sorted.map(s => s.attendance.latest_cumulative_pct),
        backgroundColor: sorted.map(s => s.attendance.latest_cumulative_pct < 75 ? `${C.red}aa` : `${C.teal}aa`),
        borderWidth: 0, borderRadius: 3,
      }],
    }
  }, [students])

  const riskChartData = useMemo(() => {
    if (!students.length) return null
    const sorted = [...students]
      .filter(s => s.diary?.latest_risk_score != null)
      .sort((a, b) => b.diary.latest_risk_score - a.diary.latest_risk_score)
    return {
      labels: sorted.map(s => `Roll ${s.roll_number}`),
      datasets: [{
        label: 'Risk Score',
        data: sorted.map(s => s.diary.latest_risk_score),
        backgroundColor: sorted.map(s => `${riskColor(s.risk_level)}aa`),
        borderWidth: 0, borderRadius: 3,
      }],
    }
  }, [students])

  const barOpts = (xMax = 100) => ({
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
      },
    },
    scales: {
      x: {
        min: 0, max: xMax,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: C.muted, font: { size: 10 } },
        border: { color: 'transparent' },
      },
      y: {
        grid: { display: false },
        ticks: { color: C.muted, font: { size: 10 } },
        border: { color: 'transparent' },
      },
    },
  })

  const thStyle = (key) => ({
    padding: '8px 12px', textAlign: 'left',
    fontSize: '10px', cursor: 'pointer',
    fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
    background: 'none', border: 'none', fontFamily: 'inherit',
    borderBottom: `1px solid ${C.border}`,
    color: sortKey === key ? C.purple : C.muted,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ maxWidth: '1280px' }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
        <button onClick={() => navigate('/admin/sections')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'inherit', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={12} /> Sections
        </button>
        <ChevronRight size={10} />
        <span>{dept}</span>
        <ChevronRight size={10} />
        <span style={{ color: C.text }}>Section {section}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
            {dept} — Section {section} · Semester {semester}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={semester}
            onChange={e => setSemester(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '6px 10px', color: C.text,
              fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {[1,2,3,4].map(s => <option key={s} value={s} style={{ background: '#111118' }}>Sem {s}</option>)}
          </select>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <Sk key={i} h={90} />)}
        </div>
      )}
      {isError && <ErrCard msg={`Failed to load report for ${dept}-${section}`} onRetry={refetch} />}

      {!isLoading && !isError && summary && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total Students', val: summary.total_students, col: C.text },
              { label: 'Avg Attendance', val: summary.avg_attendance != null ? `${summary.avg_attendance}%` : '—', col: attColor(summary.avg_attendance) },
              { label: 'Avg Risk Score', val: summary.avg_risk_score ?? '—', col: summary.avg_risk_score > 60 ? C.red : summary.avg_risk_score > 30 ? C.amber : C.teal },
              { label: 'Pending Reviews', val: summary.pending_reviews_count, col: summary.pending_reviews_count > 0 ? C.amber : C.teal },
            ].map(({ label, val, col }) => (
              <div key={label} style={glass}>
                <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{label}</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: col }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={glass}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
                Attendance distribution
              </div>
              {attChartData
                ? <div style={{ maxHeight: 260, overflowY: 'auto' }}><Bar data={attChartData} options={barOpts(100)} /></div>
                : <div style={{ color: C.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No attendance data</div>
              }
            </div>
            <div style={glass}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
                Risk score distribution
              </div>
              {riskChartData
                ? <div style={{ maxHeight: 260, overflowY: 'auto' }}><Bar data={riskChartData} options={barOpts(100)} /></div>
                : <div style={{ color: C.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>No risk data</div>
              }
            </div>
          </div>

          {/* Student table */}
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                Students ({filtered.length})
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  borderRadius: '8px', padding: '5px 10px',
                }}>
                  <Search size={13} color={C.muted} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or roll..."
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      color: C.text, fontSize: '12px', fontFamily: 'inherit',
                      width: '160px',
                    }}
                  />
                </div>
                <button onClick={exportCSV} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
                  borderRadius: '8px', padding: '5px 10px',
                  color: C.purple, fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
                }}>
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {[
                      { label: 'Roll', key: 'roll_number' },
                      { label: 'Name', key: 'name' },
                      { label: 'Attendance', key: 'attendance' },
                      { label: 'Risk', key: 'risk' },
                      { label: 'Risk Level', key: 'risk_level' },
                      { label: 'Last Entry', key: null },
                      { label: 'Mentor', key: null },
                      { label: 'Pending', key: null },
                      { label: 'Actions', key: null },
                    ].map(h => (
                      <th
                        key={h.label}
                        onClick={h.key ? () => toggleSort(h.key) : undefined}
                        style={thStyle(h.key)}
                      >
                        {h.label}{h.key && sortKey === h.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const att = s.attendance?.latest_cumulative_pct
                    const risk = s.diary?.latest_risk_score
                    const levelCol = riskColor(s.risk_level)
                    const lastEntry = s.diary?.last_submitted_at
                    const ago = daysAgo(lastEntry)
                    return (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 12px', color: C.muted }}>{s.roll_number}</td>
                        <td style={{ padding: '10px 12px', color: C.text, fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: attColor(att) }}>
                          {att != null ? `${att}%` : <span style={{ color: C.subtle }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: risk != null ? levelCol : C.subtle, fontWeight: 600 }}>
                          {risk ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '11px', padding: '2px 9px', borderRadius: '999px',
                            background: `${levelCol}15`, color: levelCol, border: `1px solid ${levelCol}30`,
                            textTransform: 'capitalize',
                          }}>
                            {s.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: ago != null && ago > 14 ? C.red : C.muted, fontSize: '12px' }}>
                          {ago != null ? `${ago}d ago` : <span style={{ color: C.subtle }}>Never</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.mentor_name
                            ? <span style={{ fontSize: '12px', color: C.text }}>{s.mentor_name}</span>
                            : <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                background: 'rgba(239,159,39,0.1)', color: C.amber,
                                border: `1px solid rgba(239,159,39,0.2)`,
                              }}>Unassigned</span>
                          }
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {s.diary?.pending_reviews > 0
                            ? <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                background: 'rgba(239,159,39,0.1)', color: C.amber,
                                border: `1px solid rgba(239,159,39,0.2)`,
                              }}>{s.diary.pending_reviews}</span>
                            : <span style={{ color: C.subtle, fontSize: '12px' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => navigate(`/admin/students/${s.id}`)}
                            style={{
                              background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
                              borderRadius: '7px', padding: '4px 10px',
                              color: C.purple, fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            <Eye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>
                        {search ? 'No students match your search' : 'No students found in this section'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}

// ─── Browse view (list of section cards) ──────────────────────────────────────
function SectionBrowse() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [deptFilter, setDeptFilter] = useState(searchParams.get('dept') || 'All')
  const [semester, setSemester] = useState(4)
  const reduced = useReducedMotion()

  const visibleDepts = deptFilter === 'All' ? DEPTS : [deptFilter]
  const visibleSections = useMemo(() => {
    const out = []
    for (const d of visibleDepts) {
      for (const s of DEPT_SECTIONS[d] || []) {
        out.push({ dept: d, section: s })
      }
    }
    return out
  }, [deptFilter])

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ maxWidth: '1280px' }}
    >
      <style>{`@keyframes srPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
            Sections
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
            Browse department and section reports
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ ...glass, marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', ...DEPTS].map(d => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              style={{
                padding: '5px 14px', borderRadius: '999px', fontSize: '12px',
                fontFamily: 'inherit', cursor: 'pointer', fontWeight: deptFilter === d ? 600 : 400,
                background: deptFilter === d ? C.purple : 'rgba(255,255,255,0.05)',
                border: `1px solid ${deptFilter === d ? C.purple : C.border}`,
                color: deptFilter === d ? '#fff' : C.muted,
                transition: 'all 0.15s',
              }}
            >{d}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: C.muted }}>Semester:</span>
          <select
            value={semester}
            onChange={e => setSemester(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '5px 10px', color: C.text,
              fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {[1,2,3,4].map(s => <option key={s} value={s} style={{ background: '#111118' }}>Sem {s}</option>)}
          </select>
        </div>
      </div>

      {/* Section cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
        gap: '16px',
      }}>
        {visibleSections.map(({ dept, section }) => (
          <SectionCard
            key={`${dept}-${section}`}
            dept={dept}
            section={section}
            semester={semester}
            navigate={navigate}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─── Root: decide which view to render ────────────────────────────────────────
export default function SectionReport() {
  const { dept, section } = useParams()

  if (dept && section) {
    return <SectionDetail dept={dept} section={section} />
  }
  return <SectionBrowse />
}
