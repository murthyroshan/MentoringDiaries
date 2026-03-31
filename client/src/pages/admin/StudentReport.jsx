import { useState, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Chart as ChartJS, LineElement, LineController, PointElement,
  CategoryScale, LinearScale, Tooltip, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  AlertTriangle, ArrowLeft, ChevronRight, X, Check,
  UserCheck, UserX, Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../../services/api'

ChartJS.register(LineElement, LineController, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:    '#06060A',
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

function riskLevelFromScore(score) {
  if (score == null || score < 30) return 'low'
  if (score < 60) return 'medium'
  if (score < 80) return 'high'
  return 'critical'
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
    animation: 'stPulse 1.6s ease-in-out infinite',
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  const bg = type === 'success' ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)'
  const col = type === 'success' ? C.teal : C.red
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: bg, border: `1px solid ${col}40`,
        borderRadius: '12px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '10px',
        color: col, fontSize: '13px', fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: col, marginLeft: 4 }}>
        <X size={12} />
      </button>
    </motion.div>
  )
}

// ─── Assign Mentor Modal ──────────────────────────────────────────────────────
function AssignMentorModal({ student, currentMentorId, onClose, onAssigned }) {
  const [selected, setSelected] = useState(currentMentorId)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'mentors'],
    queryFn: () => api.get('/admin/mentors').then(r => r.data),
    staleTime: 60_000,
  })
  const mentors = data?.data || []

  const mutation = useMutation({
    mutationFn: (mentor_id) => api.patch(`/admin/students/${student.id}/assign-mentor`, { mentor_id }),
    onSuccess: () => { onAssigned(); onClose() },
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          ...glass, width: '100%', maxWidth: '480px',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>
            Assign mentor to {student.name}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isLoading && [1,2,3].map(i => <Sk key={i} h={60} />)}
          {mentors.map(m => (
            <div
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${selected === m.id ? C.purple : C.border}`,
                background: selected === m.id ? 'rgba(127,119,221,0.08)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(127,119,221,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: C.purple,
              }}>
                {getInitials(m.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{m.department} · {m.student_count} students</div>
              </div>
              {selected === m.id && <Check size={14} color={C.purple} />}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px', borderRadius: '9px',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={() => selected && mutation.mutate(selected)}
            disabled={!selected || mutation.isPending}
            style={{
              flex: 2, padding: '9px', borderRadius: '9px',
              background: C.purple, border: 'none',
              color: '#fff', cursor: selected ? 'pointer' : 'not-allowed',
              fontSize: '13px', fontFamily: 'inherit', fontWeight: 600,
              opacity: selected ? 1 : 0.5,
            }}
          >
            {mutation.isPending ? 'Assigning…' : 'Assign selected mentor'}
          </button>
        </div>
        {mutation.isError && (
          <div style={{ fontSize: '12px', color: C.red, marginTop: '8px', textAlign: 'center' }}>
            Failed to assign mentor. Please try again.
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Diary entry card ─────────────────────────────────────────────────────────
function EntryCard({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const riskLvl = entry.ai_risk_level || riskLevelFromScore(entry.ai_risk_score)
  const rCol = riskColor(riskLvl)
  const ago = daysAgo(entry.created_at)

  return (
    <div style={{
      ...glass,
      borderLeft: `2px solid ${rCol}`,
      padding: '14px 16px',
      marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
              Week {entry.week_number} · Sem {entry.semester}
            </span>
            <span style={{
              fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
              background: `${rCol}15`, color: rCol, border: `1px solid ${rCol}30`,
              textTransform: 'capitalize',
            }}>{riskLvl}</span>
            {entry.is_flagged === 1 && (
              <span style={{
                fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
                background: 'rgba(226,75,74,0.1)', color: C.red, border: `1px solid rgba(226,75,74,0.25)`,
              }}>Flagged</span>
            )}
            {entry.mentor_response && (
              <span style={{
                fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
                background: 'rgba(29,158,117,0.1)', color: C.teal, border: `1px solid rgba(29,158,117,0.25)`,
              }}>Reviewed</span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>
            Risk score: {entry.ai_risk_score ?? '—'} · Mood: {entry.mood ?? '—'}/5
            {ago != null ? ` · ${ago}d ago` : ''}
          </div>
        </div>
        <button
          onClick={() => setExpanded(p => !p)}
          style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
            borderRadius: '7px', padding: '4px 8px', cursor: 'pointer',
            color: C.muted, display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontFamily: 'inherit',
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
          {entry.reflection && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Reflection</div>
              <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{entry.reflection}</div>
            </div>
          )}
          {entry.challenges && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Challenges</div>
              <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>{entry.challenges}</div>
            </div>
          )}
          {entry.ai_summary && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '10px', marginBottom: '10px',
            }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>AI Analysis</div>
              <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>{entry.ai_summary}</div>
            </div>
          )}
          {entry.subject_ratings?.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Subject Ratings</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {entry.subject_ratings.map(r => (
                  <span key={r.id} style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                    color: C.muted,
                  }}>
                    {r.subject_name}: <span style={{ color: C.text, fontWeight: 600 }}>{r.rating}/5</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {entry.mentor_response && (
            <div style={{
              background: 'rgba(29,158,117,0.06)', border: `1px solid rgba(29,158,117,0.2)`,
              borderRadius: '8px', padding: '10px',
            }}>
              <div style={{ fontSize: '10px', color: C.teal, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Mentor Response</div>
              <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.5 }}>{entry.mentor_response}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StudentReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()

  const [entryFilter, setEntryFilter] = useState('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [semesterOverride, setSemesterOverride] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'student-report', id],
    queryFn: () => api.get(`/admin/students/${id}/full-report`).then(r => r.data),
    staleTime: 2 * 60_000, retry: 1,
  })

  const report = data?.data
  const student = report?.student
  const attendanceHistory = report?.attendance_history || []
  const allEntries = report?.diary_entries || []
  const riskTrend = report?.risk_trend || []
  const marks = report?.marks || []
  const achievements = report?.achievements || []
  const sessions = report?.sessions || []

  // Current risk from latest entry
  const latestEntry = allEntries.length ? allEntries[allEntries.length - 1] : null
  const currentRiskScore = latestEntry?.ai_risk_score ?? null
  const currentRiskLevel = latestEntry?.ai_risk_level || riskLevelFromScore(currentRiskScore)
  const rCol = riskColor(currentRiskLevel)

  const latestAtt = attendanceHistory.length
    ? attendanceHistory[attendanceHistory.length - 1]
    : null
  const attPct = latestAtt?.cumulative_pct ?? null

  // entry filter
  const filteredEntries = useMemo(() => {
    if (entryFilter === 'reviewed') return allEntries.filter(e => !!e.mentor_response)
    if (entryFilter === 'pending') return allEntries.filter(e => !e.mentor_response)
    if (entryFilter === 'flagged') return allEntries.filter(e => e.is_flagged === 1)
    return allEntries
  }, [allEntries, entryFilter])

  // Sort entries by week desc
  const sortedEntries = useMemo(() => [...filteredEntries].reverse(), [filteredEntries])

  const avgRisk = useMemo(() => {
    const scores = allEntries.map(e => e.ai_risk_score).filter(s => s != null)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  }, [allEntries])

  // Attendance chart
  const attChartData = useMemo(() => {
    if (!attendanceHistory.length) return null
    return {
      labels: attendanceHistory.map(r => `Wk ${r.week_number}`),
      datasets: [
        {
          label: 'Cumulative %',
          data: attendanceHistory.map(r => r.cumulative_pct),
          borderColor: C.purple,
          backgroundColor: 'rgba(127,119,221,0.08)',
          fill: true, tension: 0.4, pointRadius: 2,
        },
        {
          label: 'Weekly %',
          data: attendanceHistory.map(r => r.weekly_pct),
          borderColor: C.teal,
          backgroundColor: 'transparent',
          borderDash: [4, 3],
          fill: false, tension: 0.4, pointRadius: 2,
        },
        {
          label: '75% Threshold',
          data: attendanceHistory.map(() => 75),
          borderColor: 'rgba(226,75,74,0.5)',
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          fill: false, pointRadius: 0,
        },
      ],
    }
  }, [attendanceHistory])

  // Risk trend chart
  const riskChartData = useMemo(() => {
    if (!riskTrend.length) return null
    return {
      labels: riskTrend.map(r => `Sem ${r.semester} Wk ${r.week_number}`),
      datasets: [{
        label: 'Risk Score',
        data: riskTrend.map(r => r.ai_risk_score ?? 0),
        borderColor: C.purple,
        backgroundColor: 'rgba(127,119,221,0.08)',
        fill: true, tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: riskTrend.map(r => riskColor(riskLevelFromScore(r.ai_risk_score))),
      }],
    }
  }, [riskTrend])

  const lineOpts = (yMax = 100) => ({
    responsive: true,
    plugins: {
      legend: { labels: { color: C.muted, font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.92)',
        titleColor: C.muted, bodyColor: C.text,
        borderColor: C.border, borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { min: 0, max: yMax, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: C.muted, font: { size: 10 } }, border: { color: 'transparent' } },
    },
  })

  // Mutations
  const removeMentorMutation = useMutation({
    mutationFn: () => api.patch(`/admin/students/${id}/assign-mentor`, { mentor_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-report', id] })
      setToast({ msg: 'Mentor removed', type: 'success' })
      setConfirmRemove(false)
    },
    onError: () => setToast({ msg: 'Failed to remove mentor', type: 'error' }),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch(`/users/${id}`, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-report', id] })
      setToast({ msg: 'Account deactivated', type: 'success' })
    },
    onError: () => setToast({ msg: 'Failed to deactivate account', type: 'error' }),
  })

  const changeSemesterMutation = useMutation({
    mutationFn: (sem) => api.patch(`/users/${id}`, { current_semester: sem }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'student-report', id] })
      setToast({ msg: 'Semester updated', type: 'success' })
    },
    onError: () => setToast({ msg: 'Failed to update semester', type: 'error' }),
  })

  function exportCSV() {
    const header = 'Week,Semester,AcademicYear,Mood,Difficulty,AttendancePct,RiskScore,RiskLevel,Flagged,MentorResponse,Reflection,Challenges,CreatedAt'
    const rows = allEntries.map(e => [
      e.week_number, e.semester, e.academic_year, e.mood, e.weekly_difficulty,
      e.attendance_pct, e.ai_risk_score, e.ai_risk_level,
      e.is_flagged, e.mentor_response ? 'Yes' : 'No',
      `"${(e.reflection || '').replace(/"/g, '""')}"`,
      `"${(e.challenges || '').replace(/"/g, '""')}"`,
      e.created_at,
    ].join(',')).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `student-${id}-report.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return (
    <div style={{ maxWidth: '1100px' }}>
      <style>{`@keyframes stPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <Sk h={120} r={16} />
      <div style={{ marginTop: 20 }} />
      <Sk h={80} r={16} />
      <div style={{ marginTop: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[1,2,3,4].map(i => <Sk key={i} h={80} r={12} />)}
      </div>
    </div>
  )

  if (isError) return (
    <div style={{ maxWidth: '600px' }}>
      <style>{`@keyframes stPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <ErrCard msg="Failed to load student report" onRetry={refetch} />
    </div>
  )

  if (!student) return null

  const semList = [1,2,3,4,5,6,7,8]

  return (
    <>
      <style>{`@keyframes stPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {showAssignModal && (
        <AssignMentorModal
          student={student}
          currentMentorId={student.mentor_id}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'student-report', id] })
            setToast({ msg: 'Mentor assigned successfully', type: 'success' })
          }}
        />
      )}

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1100px' }}
      >
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
          <button onClick={() => navigate('/admin/sections')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'inherit', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={12} /> Sections
          </button>
          <ChevronRight size={10} />
          <button onClick={() => navigate(`/admin/sections/${student.department}/${student.section}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'inherit', fontSize: '12px' }}>
            {student.department} / Section {student.section}
          </button>
          <ChevronRight size={10} />
          <span style={{ color: C.text }}>{student.name}</span>
        </div>

        {/* Student header card */}
        <div style={{ ...glass, marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: `${rCol}18`, border: `2px solid ${rCol}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, color: rCol,
          }}>
            {getInitials(student.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: C.text }}>
              {student.name}
            </h2>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
              {student.department}-{student.section} · Roll {student.roll_number} · Batch {student.batch}
            </div>
            <div style={{ fontSize: '12px', color: C.muted }}>
              Semester {student.current_semester} · {student.email}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
            <span style={{
              fontSize: '12px', padding: '4px 14px', borderRadius: '999px',
              background: `${rCol}15`, color: rCol, border: `1px solid ${rCol}30`,
              textTransform: 'capitalize', fontWeight: 600,
            }}>
              {currentRiskLevel} risk
            </span>
            <span style={{
              fontSize: '16px', fontWeight: 700,
              color: attColor(attPct),
            }}>
              {attPct != null ? `${attPct}% att.` : '—'}
            </span>
          </div>
        </div>

        {/* Mentor card */}
        <div style={{ ...glass, borderLeft: `2px solid ${C.purple}`, marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Mentor assignment
          </div>
          {student.mentor ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(127,119,221,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: C.purple,
              }}>
                {getInitials(student.mentor.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: C.text }}>{student.mentor.name}</div>
                <div style={{ fontSize: '12px', color: C.muted }}>{student.mentor.department}</div>
              </div>
              <span style={{
                fontSize: '11px', padding: '2px 10px', borderRadius: '999px',
                background: 'rgba(29,158,117,0.1)', color: C.teal, border: `1px solid rgba(29,158,117,0.2)`,
              }}>Assigned</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setShowAssignModal(true)} style={{
                  background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
                  borderRadius: '8px', padding: '5px 12px', color: C.purple,
                  cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                }}>Change</button>
                {!confirmRemove
                  ? <button onClick={() => setConfirmRemove(true)} style={{
                      background: 'rgba(226,75,74,0.08)', border: `1px solid rgba(226,75,74,0.2)`,
                      borderRadius: '8px', padding: '5px 12px', color: C.red,
                      cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                    }}>Remove</button>
                  : <div style={{ display: 'flex', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: C.muted, alignSelf: 'center' }}>Confirm?</span>
                      <button onClick={() => removeMentorMutation.mutate()} disabled={removeMentorMutation.isPending} style={{
                        background: 'rgba(226,75,74,0.15)', border: `1px solid rgba(226,75,74,0.3)`,
                        borderRadius: '7px', padding: '4px 10px', color: C.red,
                        cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                      }}>Yes</button>
                      <button onClick={() => setConfirmRemove(false)} style={{
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                        borderRadius: '7px', padding: '4px 10px', color: C.muted,
                        cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                      }}>No</button>
                    </div>
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                ...glass, borderStyle: 'dashed', padding: '14px 20px',
                flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <UserX size={16} color={C.muted} />
                <span style={{ fontSize: '13px', color: C.muted }}>No mentor assigned</span>
              </div>
              <button onClick={() => setShowAssignModal(true)} style={{
                background: 'rgba(127,119,221,0.12)', border: `1px solid rgba(127,119,221,0.25)`,
                borderRadius: '10px', padding: '8px 16px', color: C.purple,
                cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <UserCheck size={14} /> Assign mentor →
              </button>
            </div>
          )}
        </div>

        {/* Overview stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Diary Entries', val: allEntries.length, col: C.text },
            { label: 'Avg Risk Score', val: avgRisk ?? '—', col: avgRisk != null ? riskColor(riskLevelFromScore(avgRisk)) : C.muted },
            { label: 'Attendance', val: attPct != null ? `${attPct}%` : '—', col: attColor(attPct) },
            { label: 'Sessions', val: sessions.length, col: C.text },
          ].map(({ label, val, col }) => (
            <div key={label} style={glass}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: col }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Attendance chart */}
        {attChartData && (
          <div style={{ ...glass, marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
              Attendance timeline
            </div>
            <Line data={attChartData} options={lineOpts(100)} />
          </div>
        )}

        {/* Risk trend chart */}
        {riskChartData && (
          <div style={{ ...glass, marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
              Risk trend
            </div>
            <Line data={riskChartData} options={lineOpts(100)} />
          </div>
        )}

        {/* Diary entries */}
        <div style={{ ...glass, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
              Diary entries ({sortedEntries.length})
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'reviewed', 'pending', 'flagged'].map(f => (
                <button key={f} onClick={() => setEntryFilter(f)} style={{
                  padding: '4px 12px', borderRadius: '999px', fontSize: '11px',
                  fontFamily: 'inherit', cursor: 'pointer',
                  background: entryFilter === f ? C.purple : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${entryFilter === f ? C.purple : C.border}`,
                  color: entryFilter === f ? '#fff' : C.muted,
                  textTransform: 'capitalize',
                }}>{f}</button>
              ))}
            </div>
          </div>
          {sortedEntries.length === 0
            ? <div style={{ textAlign: 'center', padding: '32px', color: C.muted, fontSize: '13px' }}>No entries match this filter</div>
            : sortedEntries.map(e => <EntryCard key={e.id} entry={e} />)
          }
        </div>

        {/* Marks */}
        {marks.length > 0 && (
          <div style={{ ...glass, marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
              Academic records
            </div>
            {marks.map(m => (
              <div key={m.id} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>
                  Semester {m.semester} · {m.academic_year} · CGPA: <span style={{ color: C.text, fontWeight: 600 }}>{m.cgpa}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {m.subjects?.map(s => (
                    <span key={s.id} style={{
                      fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                      color: C.muted,
                    }}>
                      {s.subject_name}: <span style={{ color: C.text, fontWeight: 600 }}>{s.grade}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div style={{ ...glass, marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>
              Achievements ({achievements.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '10px' }}>
              {achievements.map(a => (
                <div key={a.id} style={{
                  ...glass, padding: '12px',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ fontSize: '11px', color: C.purple, textTransform: 'capitalize', marginBottom: '4px' }}>{a.type}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: C.text }}>{a.title}</div>
                  {a.description && <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>{a.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin actions */}
        <div style={{ ...glass, borderTop: `2px solid ${C.border}` }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            Admin actions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowAssignModal(true)} style={{
              background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
              borderRadius: '9px', padding: '7px 14px', color: C.purple,
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <UserCheck size={13} /> Assign / change mentor
            </button>
            <button onClick={exportCSV} style={{
              background: 'rgba(29,158,117,0.08)', border: `1px solid rgba(29,158,117,0.2)`,
              borderRadius: '9px', padding: '7px 14px', color: C.teal,
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Download size={13} /> Export CSV
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: C.muted }}>Semester:</span>
              <select
                defaultValue={student.current_semester || 4}
                onChange={e => changeSemesterMutation.mutate(Number(e.target.value))}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                  borderRadius: '7px', padding: '5px 8px', color: C.text,
                  fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {semList.map(s => <option key={s} value={s} style={{ background: '#111118' }}>Sem {s}</option>)}
              </select>
            </div>

            {student.is_active !== 0 && (
              <button
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                style={{
                  background: 'rgba(226,75,74,0.08)', border: `1px solid rgba(226,75,74,0.2)`,
                  borderRadius: '9px', padding: '7px 14px', color: C.red,
                  cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <UserX size={13} /> Deactivate account
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
