import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, UserCheck, Eye, Check, X, Filter } from 'lucide-react'
import api from '../../services/api'

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
    animation: 'rmPulse 1.6s ease-in-out infinite',
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
  const col = type === 'success' ? C.teal : C.red
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: type === 'success' ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)',
        border: `1px solid ${col}40`, borderRadius: '12px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '10px',
        color: col, fontSize: '13px', fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: col }}>
        <X size={12} />
      </button>
    </motion.div>
  )
}

// ─── Assign Mentor Modal ──────────────────────────────────────────────────────
function AssignMentorModal({ student, onClose, onAssigned }) {
  const [selected, setSelected] = useState(student.mentor_id ?? null)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'mentors'],
    queryFn: () => api.get('/admin/mentors').then(r => r.data),
    staleTime: 60_000,
  })
  const mentors = data?.data || []
  const mutation = useMutation({
    mutationFn: (mentor_id) => api.patch(`/admin/students/${student.student_id}/assign-mentor`, { mentor_id }),
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
        style={{ ...glass, width: '100%', maxWidth: '440px', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Assign mentor — {student.student_name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={15} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isLoading && <Sk h={50} />}
          {mentors.map(m => (
            <div key={m.id} onClick={() => setSelected(m.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
              borderRadius: '10px', cursor: 'pointer',
              border: `1px solid ${selected === m.id ? C.purple : C.border}`,
              background: selected === m.id ? 'rgba(127,119,221,0.08)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(127,119,221,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: C.purple,
              }}>{getInitials(m.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: C.text }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{m.department} · {m.student_count} students</div>
              </div>
              {selected === m.id && <Check size={13} color={C.purple} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => selected && mutation.mutate(selected)} disabled={!selected || mutation.isPending} style={{ flex: 2, padding: '8px', borderRadius: '8px', background: C.purple, border: 'none', color: '#fff', cursor: selected ? 'pointer' : 'not-allowed', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600, opacity: selected ? 1 : 0.5 }}>
            {mutation.isPending ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, navigate, onAssign }) {
  const level = alert.ai_risk_level || riskLevelFromScore(alert.ai_risk_score)
  const rCol = riskColor(level)
  const ago = daysAgo(alert.last_entry_date)
  const att = alert.latest_attendance_pct

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ ...glass, borderLeft: `3px solid ${rCol}`, marginBottom: '12px' }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `${rCol}15`, border: `1px solid ${rCol}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, color: rCol,
        }}>
          {getInitials(alert.student_name || '?')}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{alert.student_name}</span>
            <span style={{
              fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
              background: `${rCol}15`, color: rCol, border: `1px solid ${rCol}30`,
              textTransform: 'capitalize',
            }}>{level}</span>
            {alert.is_flagged === 1 && (
              <span style={{
                fontSize: '10px', padding: '1px 8px', borderRadius: '999px',
                background: 'rgba(226,75,74,0.1)', color: C.red, border: `1px solid rgba(226,75,74,0.25)`,
              }}>Flagged</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: C.muted }}>
            {alert.department}-{alert.section} · Roll {alert.roll_number}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '10px', color: C.subtle }}>Risk score </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: rCol }}>{alert.ai_risk_score ?? '—'}</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: C.subtle }}>Attendance </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: attColor(att) }}>
                {att != null ? `${att}%` : '—'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: C.subtle }}>Last entry </span>
              <span style={{ fontSize: '13px', color: ago != null && ago > 14 ? C.red : C.muted }}>
                {ago != null ? `${ago}d ago` : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Mentor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, alignItems: 'flex-end' }}>
          {alert.mentor_name
            ? <span style={{ fontSize: '12px', color: C.text }}>{alert.mentor_name}</span>
            : <span style={{
                fontSize: '11px', padding: '2px 10px', borderRadius: '999px',
                background: 'rgba(239,159,39,0.1)', color: C.amber, border: `1px solid rgba(239,159,39,0.2)`,
              }}>No mentor</span>
          }

          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => navigate(`/admin/students/${alert.student_id}`)}
              style={{
                background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
                borderRadius: '7px', padding: '5px 10px', color: C.purple,
                cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Eye size={11} /> View report
            </button>
            <button
              onClick={() => onAssign(alert)}
              style={{
                background: 'rgba(29,158,117,0.08)', border: `1px solid rgba(29,158,117,0.2)`,
                borderRadius: '7px', padding: '5px 10px', color: C.teal,
                cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <UserCheck size={11} /> Assign mentor
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Pill filter ──────────────────────────────────────────────────────────────
function PillFilter({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: C.muted, flexShrink: 0 }}>{label}:</span>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '4px 12px', borderRadius: '999px', fontSize: '11px',
          fontFamily: 'inherit', cursor: 'pointer',
          background: value === o ? C.purple : 'rgba(255,255,255,0.05)',
          border: `1px solid ${value === o ? C.purple : C.border}`,
          color: value === o ? '#fff' : C.muted,
          transition: 'all 0.15s',
        }}>{o}</button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RiskMonitor() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reduced = useReducedMotion()

  const [riskFilter, setRiskFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [mentorFilter, setMentorFilter] = useState('All')
  const [sortKey, setSortKey] = useState('risk')
  const [assignTarget, setAssignTarget] = useState(null)
  const [toast, setToast] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'risk-alerts'],
    queryFn: () => api.get('/admin/risk-alerts').then(r => r.data),
    staleTime: 60_000, retry: 1,
  })

  const raw = data?.data || []

  // Client-side filter
  const filtered = useMemo(() => {
    let list = Array.isArray(raw) ? raw : []
    if (riskFilter !== 'All') {
      const lvl = riskFilter.toLowerCase()
      list = list.filter(a => (a.ai_risk_level || riskLevelFromScore(a.ai_risk_score)) === lvl)
    }
    if (deptFilter !== 'All') list = list.filter(a => a.department === deptFilter)
    if (mentorFilter === 'With mentor') list = list.filter(a => !!a.mentor_name)
    if (mentorFilter === 'Without mentor') list = list.filter(a => !a.mentor_name)

    return [...list].sort((a, b) => {
      if (sortKey === 'risk') return (b.ai_risk_score ?? 0) - (a.ai_risk_score ?? 0)
      if (sortKey === 'attendance') return (a.latest_attendance_pct ?? 100) - (b.latest_attendance_pct ?? 100)
      if (sortKey === 'last_entry') {
        const da = daysAgo(a.last_entry_date) ?? 9999
        const db_ = daysAgo(b.last_entry_date) ?? 9999
        return db_ - da
      }
      return 0
    })
  }, [raw, riskFilter, deptFilter, mentorFilter, sortKey])

  const criticalCount = raw.filter(a => (a.ai_risk_level || riskLevelFromScore(a.ai_risk_score)) === 'critical').length
  const highCount = raw.filter(a => (a.ai_risk_level || riskLevelFromScore(a.ai_risk_score)) === 'high').length
  const flaggedCount = raw.filter(a => a.is_flagged === 1).length

  return (
    <>
      <style>{`@keyframes rmPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {assignTarget && (
        <AssignMentorModal
          student={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'risk-alerts'] })
            setToast({ msg: 'Mentor assigned', type: 'success' })
          }}
        />
      )}

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1100px' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
            Risk monitor
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
            Students requiring immediate attention
          </p>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Critical risk', val: criticalCount, col: C.darkRed },
            { label: 'High risk', val: highCount, col: C.red },
            { label: 'Flagged + unreviewed', val: flaggedCount, col: C.amber },
          ].map(({ label, val, col }) => (
            <div key={label} style={{ ...glass }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: val > 0 ? col : C.teal }}>{isLoading ? '—' : val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...glass, marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <Filter size={14} color={C.muted} />
          <PillFilter label="Risk" options={['All', 'Critical', 'High']} value={riskFilter} onChange={setRiskFilter} />
          <PillFilter label="Dept" options={['All', 'CSE', 'AIML', 'CS', 'DS']} value={deptFilter} onChange={setDeptFilter} />
          <PillFilter label="Mentor" options={['All', 'With mentor', 'Without mentor']} value={mentorFilter} onChange={setMentorFilter} />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: C.muted }}>Sort:</span>
            {[
              { label: 'Risk score', key: 'risk' },
              { label: 'Attendance', key: 'attendance' },
              { label: 'Last entry', key: 'last_entry' },
            ].map(s => (
              <button key={s.key} onClick={() => setSortKey(s.key)} style={{
                padding: '4px 10px', borderRadius: '999px', fontSize: '11px',
                fontFamily: 'inherit', cursor: 'pointer',
                background: sortKey === s.key ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sortKey === s.key ? C.purple : C.border}`,
                color: sortKey === s.key ? C.purple : C.muted,
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Showing count */}
        <div style={{ fontSize: '12px', color: C.muted, marginBottom: '14px' }}>
          Showing {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== raw.length ? ` (filtered from ${raw.length})` : ''}
        </div>

        {/* List */}
        {isLoading && [1,2,3].map(i => <Sk key={i} h={110} r={16} style={{ marginBottom: 12 }} />)}
        {isError && <ErrCard msg="Failed to load risk alerts" onRetry={refetch} />}

        {!isLoading && !isError && filtered.length === 0 && (
          <div style={{
            ...glass,
            background: 'rgba(29,158,117,0.06)', border: `1px solid rgba(29,158,117,0.2)`,
            textAlign: 'center', padding: '48px',
          }}>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>✓</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: C.teal, marginBottom: '6px' }}>
              No students at high or critical risk
            </div>
            <div style={{ fontSize: '13px', color: C.muted }}>
              All students are currently within acceptable risk levels
            </div>
          </div>
        )}

        {!isLoading && !isError && filtered.map(alert => (
          <AlertCard
            key={alert.entry_id || alert.student_id}
            alert={alert}
            navigate={navigate}
            onAssign={(a) => setAssignTarget(a)}
          />
        ))}
      </motion.div>
    </>
  )
}
