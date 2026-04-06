import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'msPulse 1.6s ease-in-out infinite' }} />
)
function getInitials(n = '') {
  const p = n.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase()
}
function fmtDate(d) { return d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' }
function fmtDateShort(d) { return d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }

// ─── Schedule session modal ────────────────────────────────────────────────────
function ScheduleModal({ students, defaultStudent, onClose, onSuccess }) {
  const { addToast } = useUIStore()
  const qc = useQueryClient()
  const [form, setForm] = useState({ student_id: defaultStudent?.id || '', scheduled_at: '', duration_mins: 30, location: '', notes: '' })

  const mut = useMutation({
    mutationFn: (d) => api.post('/mentor/sessions', d).then(r => r.data),
    onSuccess: () => {
      addToast('Session scheduled!', 'success')
      qc.invalidateQueries({ queryKey: ['mentor', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.()
      onClose()
    },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to schedule', 'error'),
  })

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        style={{ ...glass, width: '100%', maxWidth: 460, margin: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Schedule session</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '18px' }}>✕</button>
        </div>

        {/* Student select */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: C.muted, display: 'block', marginBottom: '5px' }}>Student</label>
          <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} style={{
            width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
            borderRadius: '10px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
          }}>
            <option value="">Select student...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {[
          { label: 'Date & time', type: 'datetime-local', field: 'scheduled_at' },
          { label: 'Duration (minutes)', type: 'number', field: 'duration_mins', step: 15 },
          { label: 'Location', type: 'text', field: 'location', placeholder: 'e.g. Room 202-A' },
          { label: 'Notes / Agenda', type: 'text', field: 'notes', placeholder: 'Topics to cover...' },
        ].map(({ label, type, field, placeholder, step }) => (
          <div key={field} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: C.muted, display: 'block', marginBottom: '5px' }}>{label}</label>
            <input type={type} step={step} value={form[field]} placeholder={placeholder}
              onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
        ))}

        <button onClick={() => mut.mutate({ ...form })} disabled={!form.student_id || !form.scheduled_at || mut.isPending} style={{
          width: '100%', padding: '10px', borderRadius: '10px',
          background: form.student_id && form.scheduled_at ? `linear-gradient(135deg,${C.teal},#157a5a)` : 'rgba(255,255,255,0.05)',
          border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
          cursor: form.student_id && form.scheduled_at ? 'pointer' : 'not-allowed',
          opacity: !form.student_id || !form.scheduled_at || mut.isPending ? 0.6 : 1,
          fontFamily: 'inherit',
        }}>{mut.isPending ? 'Scheduling...' : 'Confirm session'}</button>
      </motion.div>
    </motion.div>
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, past }) {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(session.notes || '')
  const actionItems = session.action_items || (typeof session.action_items === 'string' ? JSON.parse(session.action_items || '[]') : [])

  const updMut = useMutation({
    mutationFn: (d) => api.patch(`/mentor/sessions/${session.id}`, d).then(r => r.data),
    onSuccess: () => { addToast('Session updated', 'success'); qc.invalidateQueries({ queryKey: ['sessions'] }); setEditing(false) },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to update', 'error'),
  })

  const statusColor = session.status === 'completed' ? C.teal
    : session.status === 'cancelled' ? C.red : C.purple

  return (
    <motion.div
      layout
      style={{
        ...glass,
        borderLeft: `3px solid ${statusColor}`,
        marginBottom: '12px', padding: '16px 18px 16px 20px',
        opacity: past ? 0.75 : 1,
      }}
      whileHover={{ y: -1 }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `${statusColor}18`, border: `1px solid ${statusColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: statusColor,
        }}>{getInitials(session.student_name || session.student?.name || '?')}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{session.student_name || session.student?.name}</span>
            <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '999px', background: `${statusColor}12`, color: statusColor, textTransform: 'capitalize' }}>{session.status}</span>
          </div>
          <div style={{ fontSize: '12px', color: C.muted }}>
            {fmtDate(session.scheduled_at)}
            {session.duration_mins ? ` · ${session.duration_mins}m` : ''}
            {session.location ? ` · ${session.location}` : ''}
          </div>

          {/* Notes */}
          {editing ? (
            <div style={{ marginTop: '10px' }}>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                borderRadius: '8px', color: C.text, fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button onClick={() => updMut.mutate({ notes })} disabled={updMut.isPending} style={{
                  background: C.teal, border: 'none', borderRadius: '7px', padding: '5px 12px',
                  color: '#fff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '7px', padding: '5px 12px', color: C.muted, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          ) : notes ? (
            <div style={{ marginTop: '6px', fontSize: '12px', color: C.muted, fontStyle: 'italic' }}>Notes: {notes}</div>
          ) : null}

          {/* Action items */}
          {actionItems.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {actionItems.map((a, i) => (
                <span key={i} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(29,158,117,0.1)', color: C.teal }}>✓ {a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!past && session.status !== 'cancelled' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => { setEditing(x => !x); setNotes(session.notes || '') }} style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '7px', padding: '5px 10px', color: C.muted, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Edit notes</button>
            <button onClick={() => updMut.mutate({ status: 'completed' })} style={{
              background: 'rgba(29,158,117,0.1)', border: `1px solid rgba(29,158,117,0.2)`,
              borderRadius: '7px', padding: '5px 10px', color: C.teal, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Mark done</button>
            <button onClick={() => updMut.mutate({ status: 'cancelled' })} style={{
              background: 'rgba(226,75,74,0.06)', border: `1px solid rgba(226,75,74,0.15)`,
              borderRadius: '7px', padding: '5px 10px', color: C.red, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MentorSessions() {
  const reduced = useReducedMotion()
  const [showSchedule, setShowSchedule] = useState(false)
  const [tab, setTab] = useState('upcoming')

  const { data: sessData, isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
    staleTime: 3 * 60 * 1000,
  })

  const { data: rosterData } = useQuery({
    queryKey: ['mentor', 'students_roster'],
    queryFn: () => api.get('/mentor/students-roster').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const sessions = useMemo(() => {
    const raw = sessData?.data || []
    const now = new Date()
    const upcoming = raw.filter(s => s.scheduled_at && new Date(s.scheduled_at) >= now && s.status !== 'cancelled').sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    const past = raw.filter(s => s.scheduled_at && (new Date(s.scheduled_at) < now || s.status === 'cancelled' || s.status === 'completed')).sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
    return { upcoming, past }
  }, [sessData])

  const students = rosterData?.data || []

  const stats = useMemo(() => {
    const all = sessData?.data || []
    const completed = all.filter(s => s.status === 'completed').length
    const scheduled = all.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) >= new Date()).length
    const cancelled = all.filter(s => s.status === 'cancelled').length
    const totalMins = all.filter(s => s.status === 'completed' && s.duration_mins).reduce((acc, s) => acc + s.duration_mins, 0)
    return { completed, scheduled, cancelled, totalMins }
  }, [sessData])

  return (
    <>
      <style>{`@keyframes msPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '960px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>Sessions</h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
              {isLoading ? 'Loading...' : `${sessions.upcoming.length} upcoming · ${sessions.past.length} past`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => refetch()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: C.muted, fontSize: '12px', fontFamily: 'inherit' }}>↻</button>
            <button onClick={() => setShowSchedule(true)} style={{
              background: `linear-gradient(135deg,${C.teal},#157a5a)`,
              border: 'none', borderRadius: '10px', padding: '8px 18px',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>+ Schedule session</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Upcoming', v: stats.scheduled, color: C.purple },
            { label: 'Completed', v: stats.completed, color: C.teal },
            { label: 'Cancelled', v: stats.cancelled, color: C.red },
            { label: 'Total hrs', v: `${(stats.totalMins / 60).toFixed(1)}`, color: C.amber },
          ].map(({ label, v, color }) => (
            <div key={label} style={{ ...glass, padding: '14px' }}>
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', width: 'fit-content', border: `1px solid ${C.border}` }}>
          {[{ k:'upcoming',l:'Upcoming' },{ k:'past',l:'Past' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '6px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              background: tab === t.k ? 'rgba(127,119,221,0.2)' : 'transparent',
              color: tab === t.k ? C.purple : C.muted,
              fontSize: '13px', fontFamily: 'inherit', fontWeight: tab === t.k ? 600 : 400,
            }}>{t.l} <span style={{ fontSize: '11px' }}>({tab === t.k ? sessions[t.k].length : sessions[t.k].length})</span></button>
          ))}
        </div>

        {isLoading && [1,2,3].map(i => <Sk key={i} h={90} style={{ marginBottom: 12 }} />)}

        {!isLoading && sessions[tab].length === 0 && (
          <div style={{ ...glass, textAlign: 'center', padding: '48px 24px', color: C.muted }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{tab === 'upcoming' ? '📅' : '📋'}</div>
            <div style={{ fontSize: '14px', color: tab === 'upcoming' ? C.purple : C.muted }}>
              {tab === 'upcoming' ? 'No upcoming sessions — schedule one!' : 'No past sessions yet.'}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!isLoading && sessions[tab].map(s => (
              <SessionCard key={s.id} session={s} past={tab === 'past'} />
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal students={students} onClose={() => setShowSchedule(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
