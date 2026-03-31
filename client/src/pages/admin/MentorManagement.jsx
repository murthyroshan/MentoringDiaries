import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ChevronDown, ChevronUp, Eye, X,
  Search, Check, UserPlus, UserMinus,
} from 'lucide-react'
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'mmPulse 1.6s ease-in-out infinite' }} />
)

// ─── Error card ───────────────────────────────────────────────────────────────
function ErrCard({ msg, onRetry }) {
  return (
    <div style={{ ...glass, border: `1px solid rgba(226,75,74,0.2)`, textAlign: 'center', padding: '28px' }}>
      <AlertTriangle size={20} color={C.red} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>{msg}</div>
      <button onClick={onRetry} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`, borderRadius: '8px', padding: '6px 16px', color: C.red, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Retry</button>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  const col = type === 'success' ? C.teal : C.red
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        background: type === 'success' ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)',
        border: `1px solid ${col}40`, borderRadius: '12px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: '10px',
        color: col, fontSize: '13px', fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
      {type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: col }}><X size={12} /></button>
    </motion.div>
  )
}

// ─── Student picker modal ─────────────────────────────────────────────────────
function StudentPickerModal({ mentor, onClose, onAssigned }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { role: 'student', limit: 100 }],
    queryFn: () => api.get('/users', { params: { role: 'student', limit: 100 } }).then(r => r.data),
    staleTime: 30_000,
  })
  const students = (data?.data || []).filter(s => s.mentor_id !== mentor.id)

  const filtered = useMemo(() => {
    if (!search) return students
    const q = search.toLowerCase()
    return students.filter(s => s.name.toLowerCase().includes(q) || String(s.roll_number).includes(q))
  }, [students, search])

  const mutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map(sid =>
      api.patch(`/admin/students/${sid}/assign-mentor`, { mentor_id: mentor.id })
    )),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mentors'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onAssigned()
      onClose()
    },
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ ...glass, width: '100%', maxWidth: '480px', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Add students to {mentor.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px', marginBottom: '10px' }}>
          <Search size={12} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or roll..." style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: '12px', fontFamily: 'inherit', width: '100%' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isLoading && <Sk h={40} />}
          {filtered.map(s => (
            <div key={s.id} onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px',
                borderRadius: '9px', cursor: 'pointer',
                border: `1px solid ${selected.includes(s.id) ? C.purple : C.border}`,
                background: selected.includes(s.id) ? 'rgba(127,119,221,0.08)' : 'rgba(255,255,255,0.02)',
              }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(127,119,221,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: C.purple }}>
                {getInitials(s.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: C.text }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{s.department}-{s.section} · Roll {s.roll_number}</div>
              </div>
              {selected.includes(s.id) && <Check size={12} color={C.purple} />}
            </div>
          ))}
          {!isLoading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: C.muted, fontSize: '12px' }}>No unassigned students found</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => selected.length && mutation.mutate(selected)} disabled={!selected.length || mutation.isPending} style={{ flex: 2, padding: '8px', borderRadius: '8px', background: C.purple, border: 'none', color: '#fff', cursor: selected.length ? 'pointer' : 'not-allowed', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600, opacity: selected.length ? 1 : 0.5 }}>
            {mutation.isPending ? 'Assigning…' : `Assign ${selected.length} student${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Mentor card ──────────────────────────────────────────────────────────────
function MentorCard({ mentor, navigate, onToast }) {
  const [expanded, setExpanded] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const qc = useQueryClient()

  const studentCount = mentor.student_count || 0
  const countCol = studentCount === 0 ? C.amber : studentCount > 10 ? C.red : studentCount > 5 ? C.amber : C.teal
  const countLabel = studentCount === 0 ? 'No students' : `${studentCount} student${studentCount !== 1 ? 's' : ''}`

  // Fetch students only when expanded
  const { data: sectionData } = useQuery({
    queryKey: ['admin', 'mentor-students', mentor.id],
    queryFn: () => api.get('/users', { params: { role: 'student', limit: 100 } })
      .then(r => (r.data?.data || []).filter(s => s.mentor_id === mentor.id)),
    enabled: expanded,
    staleTime: 30_000,
  })
  const students = sectionData || []

  const removeMutation = useMutation({
    mutationFn: (sid) => api.patch(`/admin/students/${sid}/assign-mentor`, { mentor_id: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'mentors'] })
      qc.invalidateQueries({ queryKey: ['admin', 'mentor-students', mentor.id] })
      onToast({ msg: 'Student unassigned', type: 'success' })
    },
    onError: () => onToast({ msg: 'Failed to unassign', type: 'error' }),
  })

  return (
    <>
      {showPicker && (
        <StudentPickerModal
          mentor={mentor}
          onClose={() => setShowPicker(false)}
          onAssigned={() => onToast({ msg: 'Students assigned', type: 'success' })}
        />
      )}
      <div style={{ ...glass, marginBottom: '14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(127,119,221,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 700, color: C.purple,
          }}>
            {getInitials(mentor.name)}
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{mentor.name}</div>
            <div style={{ fontSize: '12px', color: C.muted }}>{mentor.department} · {mentor.email}</div>
          </div>
          <span style={{
            fontSize: '12px', padding: '3px 12px', borderRadius: '999px',
            background: `${countCol}12`, color: countCol, border: `1px solid ${countCol}25`,
          }}>
            {countLabel}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setShowPicker(true)} style={{
              background: 'rgba(29,158,117,0.08)', border: `1px solid rgba(29,158,117,0.2)`,
              borderRadius: '8px', padding: '5px 11px', color: C.teal,
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <UserPlus size={12} /> Add students
            </button>
            <button onClick={() => setExpanded(p => !p)} style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '5px 10px', color: C.muted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', fontFamily: 'inherit',
            }}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Expanded students list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '14px', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                {students.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: C.muted, fontSize: '13px' }}>
                    No students assigned to this mentor
                  </div>
                ) : (
                  students.map(s => {
                    const riskLvl = riskLevelFromScore(null)
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '9px', marginBottom: '6px',
                        background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`,
                        flexWrap: 'wrap',
                      }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(127,119,221,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, color: C.purple,
                        }}>{getInitials(s.name)}</div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                          <div style={{ fontSize: '13px', color: C.text }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>
                            {s.department}-{s.section} · Roll {s.roll_number}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => navigate(`/admin/students/${s.id}`)} style={{
                            background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
                            borderRadius: '6px', padding: '4px 8px', color: C.purple,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                            fontSize: '11px', fontFamily: 'inherit',
                          }}>
                            <Eye size={11} /> View
                          </button>
                          <button onClick={() => removeMutation.mutate(s.id)} style={{
                            background: 'rgba(226,75,74,0.06)', border: `1px solid rgba(226,75,74,0.15)`,
                            borderRadius: '6px', padding: '4px 8px', color: C.red,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                            fontSize: '11px', fontFamily: 'inherit',
                          }}>
                            <UserMinus size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorManagement() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [toast, setToast] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'mentors'],
    queryFn: () => api.get('/admin/mentors').then(r => r.data),
    staleTime: 60_000, retry: 1,
  })

  const mentors = data?.data || []
  const totalStudents = mentors.reduce((s, m) => s + (m.student_count || 0), 0)

  return (
    <>
      <style>{`@keyframes mmPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1000px' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
            Mentor management
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
            {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} · {totalStudents} students assigned
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1,2,3].map(i => <Sk key={i} h={80} r={16} />)}
          </div>
        )}

        {/* Error */}
        {isError && <ErrCard msg="Failed to load mentors" onRetry={refetch} />}

        {/* Mentor cards */}
        {!isLoading && !isError && mentors.length === 0 && (
          <div style={{ ...glass, textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '14px', color: C.muted }}>No mentors found</div>
          </div>
        )}

        {!isLoading && !isError && mentors.map(m => (
          <MentorCard
            key={m.id}
            mentor={m}
            navigate={navigate}
            onToast={setToast}
          />
        ))}
      </motion.div>
    </>
  )
}
