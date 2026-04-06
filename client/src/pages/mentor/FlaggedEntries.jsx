import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'

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
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'fePulse 1.6s ease-in-out infinite' }} />
)

function getInitials(n = '') {
  const p = n.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase()
}
function getRiskColor(s) {
  if (s == null) return C.subtle
  if (s < 30) return C.teal
  if (s < 60) return C.amber
  if (s < 80) return C.red
  return '#991F1F'
}

const REASON_MAP = {
  high_risk: { label: 'High risk', color: C.red, icon: '🔴' },
  flagged_entry: { label: 'Flagged entry', color: '#991F1F', icon: '🚩' },
  low_attendance: { label: 'Low attendance', color: C.amber, icon: '⚠' },
}

// ─── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 14 }}
        style={{ ...glass, maxWidth: 400, width: '100%', margin: 16, padding: '24px' }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>Confirm action</div>
        <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>{msg}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '7px 16px', color: C.muted, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: C.red, border: 'none', borderRadius: '8px', padding: '7px 16px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}>Confirm</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Flagged Student Card ─────────────────────────────────────────────────────
function FlaggedCard({ student, navigate, onFlagAdmin }) {
  const riskCol = getRiskColor(student.latest_risk_score)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <motion.div
        layout
        whileHover={{ y: -2 }}
        style={{
          ...glass,
          borderLeft: `3px solid ${C.red}`,
          marginBottom: '14px',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: '14px', padding: '16px 18px 16px 22px', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: `${riskCol}18`, border: `2px solid ${riskCol}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: riskCol,
          }}>{getInitials(student.name)}</div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{student.name}</span>
              <span style={{ fontSize: '11px', color: C.muted }}>{student.department}-{student.section} · {student.roll_number}</span>
            </div>

            {/* Reason tags */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {student.reasons.map(reason => {
                const r = REASON_MAP[reason] || {}
                return (
                  <span key={reason} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                    background: `${r.color}14`, color: r.color, border: `1px solid ${r.color}28`,
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                  }}>{r.icon} {r.label}</span>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: C.muted, flexWrap: 'wrap' }}>
              <span>Risk score: <strong style={{ color: riskCol }}>{student.latest_risk_score}</strong></span>
              {student.current_attendance_pct != null && (
                <span>Attendance: <strong style={{ color: student.current_attendance_pct < 75 ? C.amber : C.text }}>
                  {Math.round(student.current_attendance_pct)}%
                </strong></span>
              )}
              {student.pending_entries?.length > 0 && (
                <span>{student.pending_entries.length} entries awaiting review</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => navigate(`/mentor/students/${student.id}`)} style={{
              background: 'rgba(127,119,221,0.1)', border: `1px solid rgba(127,119,221,0.2)`,
              borderRadius: '8px', padding: '6px 12px', color: C.purple, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>View profile →</button>
            {student.flagged_entry_id && (
              <button onClick={() => navigate(`/mentor/review/${student.flagged_entry_id}`)} style={{
                background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.2)`,
                borderRadius: '8px', padding: '6px 12px', color: C.red, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
              }}>Review entry →</button>
            )}
            <button onClick={() => setShowConfirm(true)} style={{
              background: 'none', border: `1px solid rgba(239,159,39,0.2)`,
              borderRadius: '8px', padding: '6px 12px', color: C.amber, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>🚩 Flag to admin</button>
          </div>
        </div>

        {/* Pending entries */}
        {expanded && (student.pending_entries || []).length > 0 && (
          <div style={{ padding: '0 18px 16px 22px' }}>
            <div style={{ fontSize: '12px', color: C.muted, marginBottom: '8px' }}>Pending entries:</div>
            {student.pending_entries.map(e => (
              <div key={e.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.025)', marginBottom: '6px',
              }}>
                <span style={{ fontSize: '12px', color: C.muted }}>Week {e.week_number}</span>
                <button onClick={() => navigate(`/mentor/review/${e.id}`)} style={{
                  background: 'rgba(127,119,221,0.1)', border: 'none', borderRadius: '6px',
                  padding: '4px 10px', color: C.purple, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                }}>Review</button>
              </div>
            ))}
          </div>
        )}

        {/* Expand button */}
        {(student.pending_entries || []).length > 0 && (
          <button onClick={() => setExpanded(x => !x)} style={{
            width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none',
            borderTop: `1px solid ${C.border}`, padding: '6px',
            color: C.muted, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {expanded ? '▲ Hide' : `▼ Show ${student.pending_entries.length} pending entries`}
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmDialog
            msg={`Flag ${student.name} to the admin for immediate attention? All admins will be notified.`}
            onConfirm={() => { onFlagAdmin([student.id]); setShowConfirm(false) }}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FlaggedEntries() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const reduced = useReducedMotion()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor', 'flagged_students'],
    queryFn: () => api.get('/mentor/flagged-students').then(r => r.data),
    staleTime: 3 * 60 * 1000,
  })

  const flagMut = useMutation({
    mutationFn: (ids) => api.post('/mentor/bulk-action', { student_ids: ids, action: 'flag_for_admin' }).then(r => r.data),
    onSuccess: () => { addToast('Students flagged to admin', 'success'); qc.invalidateQueries({ queryKey: ['mentor'] }) },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to flag', 'error'),
  })

  const students = data?.data || []

  return (
    <>
      <style>{`@keyframes fePulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '900px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>Flagged students</h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
              {isLoading ? 'Loading...' : `${students.length} students requiring attention`}
            </p>
          </div>
          <button onClick={() => refetch()} style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
            borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', color: C.muted, fontSize: '12px', fontFamily: 'inherit',
          }}>↻ Refresh</button>
        </div>

        {/* Summary bar */}
        {!isLoading && students.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {Object.entries(REASON_MAP).map(([key, r]) => {
              const count = students.filter(s => s.reasons.includes(key)).length
              if (!count) return null
              return (
                <div key={key} style={{
                  ...glass, padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '18px' }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: r.color }}>{count}</div>
                    <div style={{ fontSize: '10px', color: C.muted }}>{r.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isLoading && [1,2,3].map(i => <Sk key={i} h={130} style={{ marginBottom: 14 }} />)}

        {error && (
          <div style={{ ...glass, borderLeft: `2px solid ${C.red}`, textAlign: 'center', padding: '24px' }}>
            <div style={{ color: C.red, fontSize: '13px', marginBottom: '10px' }}>Failed to load flagged students</div>
            <button onClick={() => refetch()} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`, borderRadius: '8px', padding: '6px 14px', color: C.red, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Retry</button>
          </div>
        )}

        {!isLoading && !error && students.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ ...glass, textAlign: 'center', padding: '60px 32px', border: `1px solid rgba(29,158,117,0.2)` }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.teal, marginBottom: '6px' }}>No students flagged</div>
            <div style={{ fontSize: '13px', color: C.muted }}>All students are within normal parameters.</div>
          </motion.div>
        )}

        {!isLoading && students.map(s => (
          <FlaggedCard key={s.id} student={s} navigate={navigate} onFlagAdmin={flagMut.mutate} />
        ))}
      </motion.div>
    </>
  )
}
