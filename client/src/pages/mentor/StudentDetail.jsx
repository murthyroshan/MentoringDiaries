import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Chart as ChartJS, registerables,
} from 'chart.js'
import { Line, Bar, Radar } from 'react-chartjs-2'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'

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
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'sdPulse 1.6s ease-in-out infinite' }} />
)

function getRiskColor(s) {
  if (s == null) return C.subtle
  if (s < 30) return C.teal
  if (s < 60) return C.amber
  if (s < 80) return C.red
  return '#991F1F'
}
function getMoodEmoji(m) { return { 5:'😄', 4:'🙂', 3:'😐', 2:'😟', 1:'😞' }[m] || '😐' }
function getInitials(n = '') {
  const p = n.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase()
}
function fmt(d) { return d ? new Date(d).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' }) : '—' }

const chartDefaults = {
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

// ─── Schedule session modal ────────────────────────────────────────────────────
function ScheduleModal({ studentId, studentName, onClose }) {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [form, setForm] = useState({ scheduled_at: '', duration_mins: 30, location: '', notes: '' })

  const mut = useMutation({
    mutationFn: (d) => api.post('/mentor/sessions', d).then(r => r.data),
    onSuccess: () => {
      addToast('Session scheduled', 'success')
      qc.invalidateQueries({ queryKey: ['mentor'] })
      onClose()
    },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to schedule', 'error'),
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        style={{ ...glass, width: '100%', maxWidth: 460, margin: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>Schedule session</div>
            <div style={{ fontSize: '12px', color: C.muted }}>with {studentName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '18px' }}>✕</button>
        </div>

        {[
          { label: 'Date & time', type: 'datetime-local', field: 'scheduled_at' },
          { label: 'Duration (minutes)', type: 'number', field: 'duration_mins', step: 15 },
          { label: 'Location', type: 'text', field: 'location', placeholder: 'e.g. Room 202-A' },
          { label: 'Notes', type: 'text', field: 'notes', placeholder: 'Agenda or topics...' },
        ].map(({ label, type, field, placeholder, step }) => (
          <div key={field} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: C.muted, display: 'block', marginBottom: '5px' }}>{label}</label>
            <input
              type={type} step={step}
              value={form[field]}
              placeholder={placeholder}
              onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
              style={{
                width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                borderRadius: '10px', color: C.text, fontSize: '13px', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        ))}

        <button
          onClick={() => mut.mutate({ student_id: studentId, ...form })}
          disabled={!form.scheduled_at || mut.isPending}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
            border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: form.scheduled_at ? 'pointer' : 'not-allowed',
            opacity: !form.scheduled_at || mut.isPending ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >{mut.isPending ? 'Scheduling...' : 'Confirm session'}</button>
      </motion.div>
    </motion.div>
  )
}

// ─── Inline response box ───────────────────────────────────────────────────────
function ResponseBox({ entryId, onDone }) {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [text, setText] = useState('')
  const [loadingSugg, setLoadingSugg] = useState(false)

  const mut = useMutation({
    mutationFn: (body) => api.patch(`/diary/${entryId}/response`, body).then(r => r.data),
    onSuccess: () => {
      addToast('Response submitted', 'success')
      qc.invalidateQueries({ queryKey: ['mentor'] })
      onDone?.()
    },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to submit', 'error'),
  })

  async function loadSuggestion() {
    setLoadingSugg(true)
    try {
      const res = await api.get(`/mentor/ai-suggestion/${entryId}`)
      const sugg = res.data?.data?.supportiveResponse || ''
      setText(sugg)
    } catch { addToast('Failed to load AI suggestion', 'error') }
    setLoadingSugg(false)
  }

  return (
    <div style={{
      marginTop: '12px', padding: '14px', borderRadius: '12px',
      background: 'rgba(127,119,221,0.06)', border: `1px solid rgba(127,119,221,0.15)`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: C.purple }}>Write response</span>
        <button onClick={loadSuggestion} disabled={loadingSugg} style={{
          background: 'none', border: `1px solid ${C.purple}30`, borderRadius: '6px',
          padding: '3px 10px', color: C.purple, fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
        }}>{loadingSugg ? '⟳ Loading...' : '✦ AI suggest'}</button>
      </div>
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Write a supportive, constructive response..."
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px',
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'inherit',
          resize: 'vertical', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
        {['Well done!', 'Keep it up!', 'Let\'s discuss this'].map(chip => (
          <button key={chip} onClick={() => setText(t => t ? t + ' ' + chip : chip)} style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '6px',
            padding: '3px 8px', color: C.muted, fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
          }}>{chip}</button>
        ))}
        <button onClick={() => mut.mutate({ response: text })} disabled={!text.trim() || mut.isPending} style={{
          background: C.purple, border: 'none', borderRadius: '8px',
          padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 600,
          cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5,
          fontFamily: 'inherit',
        }}>{mut.isPending ? 'Sending...' : 'Submit →'}</button>
      </div>
    </div>
  )
}

// ─── Timeline item ─────────────────────────────────────────────────────────────
function TimelineItem({ item, idx }) {
  const [showResponse, setShowResponse] = useState(false)
  const isEntry = item.type === 'entry'
  const isSession = item.type === 'session'
  const d = item.data || {}

  const riskCol = isEntry ? getRiskColor(d.ai_risk_score) : C.teal
  const accent = isEntry ? riskCol : C.teal

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}
    >
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `${accent}18`, border: `2px solid ${accent}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px',
        }}>
          {isEntry ? getMoodEmoji(d.mood) : '📅'}
        </div>
        <div style={{ flex: 1, width: '1px', background: C.border, marginTop: '4px' }} />
      </div>

      <div style={{
        flex: 1, borderRadius: '12px',
        background: 'rgba(255,255,255,0.025)', border: `1px solid ${C.border}`,
        padding: '12px 14px', marginBottom: '4px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
              {isEntry ? `Week ${d.week_number} diary entry` : `Session`}
            </span>
            {isEntry && (
              <>
                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${riskCol}12`, color: riskCol }}>
                  Risk {d.ai_risk_score ?? '—'}
                </span>
                {d.mentor_response && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.teal}12`, color: C.teal }}>Reviewed</span>}
                {!d.mentor_response && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.amber}12`, color: C.amber }}>Pending</span>}
              </>
            )}
            {isSession && d.status && (
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.teal}12`, color: C.teal, textTransform: 'capitalize' }}>{d.status}</span>
            )}
          </div>
          <span style={{ fontSize: '11px', color: C.muted, flexShrink: 0 }}>{fmt(item.date)}</span>
        </div>

        {isEntry && (
          <>
            {d.reflection && <div style={{ fontSize: '12px', color: C.muted, fontStyle: 'italic', marginBottom: '6px' }}>"{d.reflection.slice(0, 200)}{d.reflection.length > 200 ? '...' : ''}"</div>}
            {d.ai_summary && <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>{d.ai_summary.slice(0, 160)}{d.ai_summary.length > 160 ? '...' : ''}</div>}
            {(d.subject_ratings || []).length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {d.subject_ratings.map(s => (
                  <span key={s.subject_name} style={{
                    fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                    background: s.rating < 3 ? 'rgba(226,75,74,0.1)' : 'rgba(255,255,255,0.05)',
                    color: s.rating < 3 ? C.red : C.muted,
                  }}>{s.subject_name} {s.rating}/5</span>
                ))}
              </div>
            )}
            {d.mentor_response && (
              <div style={{
                padding: '8px 12px', borderRadius: '8px', marginTop: '6px',
                background: 'rgba(127,119,221,0.06)', border: `1px solid rgba(127,119,221,0.12)`,
                fontSize: '12px', color: C.muted,
              }}>
                <strong style={{ color: C.purple }}>Your response: </strong>
                {d.mentor_response}
              </div>
            )}
            {!d.mentor_response && (
              <button onClick={() => setShowResponse(x => !x)} style={{
                background: 'none', border: `1px solid rgba(127,119,221,0.2)`, borderRadius: '7px',
                padding: '4px 12px', color: C.purple, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                marginTop: '4px',
              }}>
                {showResponse ? 'Cancel' : 'Write response →'}
              </button>
            )}
            <AnimatePresence>
              {showResponse && <ResponseBox entryId={d.id} onDone={() => setShowResponse(false)} />}
            </AnimatePresence>
          </>
        )}

        {isSession && (
          <>
            {d.notes && <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px' }}>Notes: {d.notes}</div>}
            {(d.action_items || []).length > 0 && (
              <div style={{ fontSize: '12px', color: C.muted }}>
                Action items: {d.action_items.join(', ')}
              </div>
            )}
            {d.location && <div style={{ fontSize: '11px', color: C.subtle }}>📍 {d.location}</div>}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [showSchedule, setShowSchedule] = useState(false)

  const { data: timelineData, isLoading: tlLoading, error: tlError, refetch } = useQuery({
    queryKey: ['mentor', 'student_timeline', id],
    queryFn: () => api.get(`/mentor/students/${id}/timeline`).then(r => r.data),
    staleTime: 2 * 60 * 1000, enabled: !!id,
  })

  // Get student info from roster (cached)
  const { data: rosterData } = useQuery({
    queryKey: ['mentor', 'students_roster'],
    queryFn: () => api.get('/mentor/students-roster').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const student = useMemo(() => {
    return rosterData?.data?.find(s => String(s.id) === String(id))
  }, [rosterData, id])

  const timeline = timelineData?.data || []
  const entries = timeline.filter(t => t.type === 'entry').map(t => t.data)

  // ── Derived stats ──────────────────────────────────────────────────────────
  const latestEntry = entries[0]
  const riskHistory = [...entries].sort((a, b) => a.week_number - b.week_number)
  const riskValues = riskHistory.map(e => e.ai_risk_score ?? 0)
  const weeks = riskHistory.map(e => `Wk ${e.week_number}`)
  const moodValues = riskHistory.map(e => e.mood ?? 0)

  const avgRisk = riskValues.length ? Math.round(riskValues.reduce((a, b) => a + b, 0) / riskValues.length) : 0
  const avgMood = moodValues.length ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1) : '—'
  const h = student?.health || {}

  // Subject performance
  const subjectMap = {}
  for (const e of entries) {
    for (const sr of (e.subject_ratings || [])) {
      if (!subjectMap[sr.subject_name]) subjectMap[sr.subject_name] = []
      subjectMap[sr.subject_name].push(sr.rating)
    }
  }
  const subjects = Object.entries(subjectMap).map(([name, vals]) => ({
    name, avg: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
  })).sort((a, b) => b.avg - a.avg)

  // ── Charts ──────────────────────────────────────────────────────────────────
  const riskLineData = {
    labels: weeks,
    datasets: [
      { label: 'Risk score', data: riskValues, borderColor: C.red, backgroundColor: 'rgba(226,75,74,0.08)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
      { label: 'Mood (×20)', data: moodValues.map(m => m * 20), borderColor: C.purple, backgroundColor: 'transparent', tension: 0.4, pointRadius: 3, borderWidth: 1.5, borderDash: [4, 3] },
    ],
  }
  const riskLineOpts = {
    ...chartDefaults,
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0, max: 100 },
    },
  }

  const subjectBarData = subjects.length ? {
    labels: subjects.map(s => s.name),
    datasets: [{
      label: 'Avg rating',
      data: subjects.map(s => s.avg),
      backgroundColor: subjects.map(s => s.avg >= 4 ? `${C.teal}99` : s.avg >= 3 ? `${C.amber}99` : `${C.red}99`),
      borderColor: subjects.map(s => s.avg >= 4 ? C.teal : s.avg >= 3 ? C.amber : C.red),
      borderWidth: 1, borderRadius: 4,
    }],
  } : null
  const subjectBarOpts = {
    ...chartDefaults,
    indexAxis: 'y',
    plugins: { ...chartDefaults.plugins, legend: { display: false } },
    scales: {
      x: { ...chartDefaults.scales.x, min: 0, max: 5 },
      y: { ...chartDefaults.scales.y },
    },
  }

  const riskCol = getRiskColor(h?.latest_risk_score)

  return (
    <>
      <style>{`@keyframes sdPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '1080px' }}
      >
        {/* Back button */}
        <button onClick={() => navigate('/mentor/students')} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: C.muted, fontSize: '13px', fontFamily: 'inherit',
          marginBottom: '16px', padding: 0,
        }}>← Back to students</button>

        {/* ── Student header ─────────────────────────────────────────────── */}
        <div style={{ ...glass, marginBottom: '18px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {tlLoading
            ? <div style={{ display: 'flex', gap: '14px', alignItems: 'center', width: '100%' }}><Sk h={60} w={60} r={30} /><div style={{ flex: 1 }}><Sk h={20} w="200px" /><div style={{ marginTop: 8 }}><Sk h={13} w="150px" /></div></div></div>
            : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: `${riskCol}18`, border: `2px solid ${riskCol}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700, color: riskCol,
                }}>{getInitials(student?.name || '?')}</div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '20px', fontWeight: 700, color: C.text, margin: 0 }}>
                    {student?.name || `Student #${id}`}
                  </h1>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                    {student?.department}-{student?.section} · {student?.roll_number} · Batch {student?.batch} · Semester {student?.current_semester}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {h?.is_flagged && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(226,75,74,0.12)', color: C.red, border: `1px solid rgba(226,75,74,0.25)` }}>🚩 Flagged</span>}
                    {h?.below_75_attendance && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(239,159,39,0.12)', color: C.amber, border: `1px solid rgba(239,159,39,0.25)` }}>⚠ Low attendance</span>}
                    {h?.missed_this_week && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(127,119,221,0.12)', color: C.purple }}>No entry this week</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowSchedule(true)} style={{
                    background: `linear-gradient(135deg, ${C.teal}, #157a5a)`,
                    border: 'none', borderRadius: '10px', padding: '8px 16px',
                    color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>📅 Schedule session</button>
                  <button onClick={() => navigate(`/mentor/review/${latestEntry?.id}`)} disabled={!latestEntry || !!latestEntry.mentor_response} style={{
                    background: latestEntry && !latestEntry.mentor_response ? `linear-gradient(135deg,${C.purple},#5B53C0)` : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: '10px', padding: '8px 16px',
                    color: latestEntry && !latestEntry.mentor_response ? '#fff' : C.subtle,
                    fontSize: '12px', fontWeight: 600, cursor: latestEntry && !latestEntry.mentor_response ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}>Review last entry →</button>
                </div>
              </>
            )
          }
        </div>

        {/* ── 4 stat cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '18px' }}>
          {[
            { label: 'Latest risk', value: h?.latest_risk_score != null ? `${h.latest_risk_score}` : '—', sub: latestEntry?.ai_risk_level || '', color: getRiskColor(h?.latest_risk_score) },
            { label: 'Avg risk', value: avgRisk || '—', sub: `last ${riskValues.length} entries`, color: getRiskColor(avgRisk) },
            { label: 'Attendance', value: h?.current_attendance_pct != null ? `${Math.round(h.current_attendance_pct)}%` : '—', sub: h?.attendance_trend || '', color: h?.below_75_attendance ? C.amber : C.teal },
            { label: 'Avg mood', value: avgMood, sub: `last ${moodValues.length} entries`, color: C.purple },
          ].map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              style={{ ...glass, padding: '16px' }}
            >
              <div style={{ fontSize: '10px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: card.color }}>{tlLoading ? <Sk h={28} w="60px" /> : card.value}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px', textTransform: 'capitalize' }}>{card.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Charts row ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: subjects.length > 0 ? '1fr 1fr' : '1fr', gap: '14px', marginBottom: '18px' }}>
          <div style={glass}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>Risk & mood over time</div>
            {tlLoading ? <Sk h={200} /> : riskValues.length > 0 ? <Line data={riskLineData} options={riskLineOpts} /> : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '13px' }}>No entries yet</div>}
          </div>
          {subjects.length > 0 && (
            <div style={glass}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>Subject performance</div>
              {tlLoading ? <Sk h={200} /> : <Bar data={subjectBarData} options={subjectBarOpts} />}
            </div>
          )}
        </div>

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        <div style={glass}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>
              Timeline <span style={{ fontSize: '12px', color: C.muted, fontWeight: 400 }}>— entries  &amp; sessions combined</span>
            </div>
            <button onClick={() => refetch()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontSize: '12px', fontFamily: 'inherit' }}>↻ Refresh</button>
          </div>

          {tlLoading && [1,2,3].map(i => <div key={i} style={{ marginBottom: 14 }}><Sk h={80} /></div>)}
          {tlError && <div style={{ color: C.red, fontSize: '13px', textAlign: 'center', padding: '20px' }}>Failed to load timeline · <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer' }}>Retry</button></div>}
          {!tlLoading && timeline.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: '32px', fontSize: '13px' }}>No diary entries or sessions yet</div>}

          {!tlLoading && timeline.map((item, i) => (
            <TimelineItem key={`${item.type}-${item.data?.id || i}`} item={item} idx={i} />
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal
            studentId={Number(id)}
            studentName={student?.name || `Student #${id}`}
            onClose={() => setShowSchedule(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
