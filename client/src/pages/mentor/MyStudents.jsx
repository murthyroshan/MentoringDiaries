import { useState, useMemo } from 'react'
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
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'msPulse 1.6s ease-in-out infinite' }} />
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
function daysAgo(d) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null }

// ─── Inline mini sparkline ────────────────────────────────────────────────────
function MiniSpark({ values = [], color = C.purple, w = 80, h = 28 }) {
  if (values.length < 2) return <span style={{ fontSize: '10px', color: C.subtle }}>No data</span>
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" points={pts} />
      <circle cx={(values.length - 1) * step} cy={h - ((values[values.length - 1] - min) / range) * (h - 4) - 2} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Health dot ───────────────────────────────────────────────────────────────
function HealthDots({ risk }) {
  const col = getRiskColor(risk)
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: (risk == null ? 0 : risk / 25) > i ? col : 'rgba(255,255,255,0.1)',
        }} />
      ))}
      <span style={{ fontSize: '10px', color: col, marginLeft: '4px' }}>{risk ?? '—'}</span>
    </div>
  )
}

// ─── Student card ─────────────────────────────────────────────────────────────
function StudentCard({ student, onBulkToggle, isBulkSelected }) {
  const navigate = useNavigate()
  const h = student.health || {}
  const riskTrend = h.risk_trend || []
  const latestRisk = h.latest_risk_score
  const riskCol = getRiskColor(latestRisk)
  const isCritical = latestRisk >= 80
  const badConditions = h.below_75_attendance || h.is_flagged || h.missed_this_week

  return (
    <motion.div
      layout
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.1)' }}
      style={{
        ...glass, padding: '18px', cursor: 'pointer',
        borderLeft: isCritical ? `3px solid ${C.red}` : h.is_flagged ? `3px solid ${C.amber}` : `3px solid transparent`,
        position: 'relative',
      }}
    >
      {/* Bulk checkbox */}
      <div
        style={{ position: 'absolute', top: 14, right: 14 }}
        onClick={e => { e.stopPropagation(); onBulkToggle(student.id) }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '5px',
          border: `1.5px solid ${isBulkSelected ? C.purple : C.border}`,
          background: isBulkSelected ? C.purple : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          {isBulkSelected && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
        </div>
      </div>

      <div onClick={() => navigate(`/mentor/students/${student.id}`)} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `${riskCol}18`, border: `2px solid ${riskCol}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: riskCol,
        }}>{getInitials(student.name)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '3px' }}>{student.name}</div>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '8px' }}>
            {student.department}-{student.section} · {student.roll_number} · Sem {student.current_semester}
          </div>

          <HealthDots risk={latestRisk} />

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
            <MiniSpark values={riskTrend} color={riskCol} />
            <div style={{ fontSize: '10px', color: C.muted }}>
              {h.current_attendance_pct != null
                ? <span style={{ color: h.below_75_attendance ? C.amber : C.muted }}>{Math.round(h.current_attendance_pct)}% att.</span>
                : null}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
            {h.is_flagged && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(226,75,74,0.12)', color: C.red, border: `1px solid rgba(226,75,74,0.25)` }}>Flagged</span>}
            {h.below_75_attendance && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(239,159,39,0.12)', color: C.amber, border: `1px solid rgba(239,159,39,0.25)` }}>Low att.</span>}
            {h.missed_this_week && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(127,119,221,0.12)', color: C.purple, border: `1px solid rgba(127,119,221,0.25)` }}>No entry this wk</span>}
            {h.pending_reviews > 0 && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(127,119,221,0.08)', color: C.purple }}>
              {h.pending_reviews} pending
            </span>}
            {h.streak > 1 && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(29,158,117,0.1)', color: C.teal }}>
              🔥 {h.streak}wk streak
            </span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Bulk action bar ───────────────────────────────────────────────────────────
function BulkBar({ selected, onAction, onClear }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedDate, setSchedDate] = useState('')
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  const bulkMut = useMutation({
    mutationFn: (payload) => api.post('/mentor/bulk-action', payload).then(r => r.data),
    onSuccess: (_, vars) => {
      addToast(`${vars.action} sent to ${selected.length} students`, 'success')
      onClear()
      qc.invalidateQueries({ queryKey: ['mentor'] })
    },
    onError: (e) => addToast(e?.response?.data?.message || 'Bulk action failed', 'error'),
  })

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, maxWidth: '640px', width: 'calc(100% - 48px)',
        background: 'rgba(17,17,24,0.97)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${C.purple}40`,
        borderRadius: '16px', padding: '14px 18px',
        display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${C.purple}20`,
      }}
    >
      <span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{selected.length} selected</span>
      <button onClick={() => bulkMut.mutate({ student_ids: selected, action: 'send_reminder' })} style={{
        background: `${C.amber}15`, border: `1px solid ${C.amber}25`, borderRadius: '8px',
        padding: '6px 12px', color: C.amber, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
      }}>⏰ Send reminder</button>
      <button onClick={() => bulkMut.mutate({ student_ids: selected, action: 'flag_for_admin' })} style={{
        background: `${C.red}10`, border: `1px solid ${C.red}20`, borderRadius: '8px',
        padding: '6px 12px', color: C.red, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
      }}>🚩 Flag for admin</button>
      {!showSchedule
        ? <button onClick={() => setShowSchedule(true)} style={{
            background: `${C.teal}10`, border: `1px solid ${C.teal}20`, borderRadius: '8px',
            padding: '6px 12px', color: C.teal, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>📅 Group session</button>
        : <>
          <input type="datetime-local" value={schedDate} onChange={e => setSchedDate(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '4px 8px', color: C.text, fontSize: '12px', fontFamily: 'inherit' }}
          />
          <button onClick={() => bulkMut.mutate({ student_ids: selected, action: 'schedule_group_session', scheduled_at: schedDate })} disabled={!schedDate} style={{
            background: C.teal, border: 'none', borderRadius: '8px',
            padding: '6px 12px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>Confirm</button>
          <button onClick={() => setShowSchedule(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'inherit', fontSize: '12px' }}>Cancel</button>
        </>}
      <button onClick={onClear} style={{
        marginLeft: 'auto', background: 'none', border: 'none',
        cursor: 'pointer', color: C.muted, fontSize: '12px', fontFamily: 'inherit',
      }}>✕ Clear</button>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyStudents() {
  const reduced = useReducedMotion()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [selected, setSelected] = useState([])
  const [view, setView] = useState('grid') // 'grid' | 'list'

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor', 'students_roster'],
    queryFn: () => api.get('/mentor/students-roster').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const students = useMemo(() => {
    let list = data?.data || []
    // roll_number is an integer from the API; String() before toLowerCase() to avoid a crash
    if (search) list = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || String(s.roll_number ?? '').toLowerCase().includes(search.toLowerCase()))
    if (filter === 'flagged') list = list.filter(s => s.health?.is_flagged)
    if (filter === 'low_att') list = list.filter(s => s.health?.below_75_attendance)
    if (filter === 'no_entry') list = list.filter(s => s.health?.missed_this_week)
    if (filter === 'high_risk') list = list.filter(s => (s.health?.latest_risk_score ?? 0) >= 60)
    if (sortKey === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sortKey === 'risk') list = [...list].sort((a, b) => (b.health?.latest_risk_score ?? 0) - (a.health?.latest_risk_score ?? 0))
    if (sortKey === 'attendance') list = [...list].sort((a, b) => (a.health?.current_attendance_pct ?? 0) - (b.health?.current_attendance_pct ?? 0))
    return list
  }, [data, search, filter, sortKey])

  const all = data?.data || []
  const counts = {
    flagged: all.filter(s => s.health?.is_flagged).length,
    low_att: all.filter(s => s.health?.below_75_attendance).length,
    no_entry: all.filter(s => s.health?.missed_this_week).length,
    high_risk: all.filter(s => (s.health?.latest_risk_score ?? 0) >= 60).length,
  }

  function toggleBulk(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  return (
    <>
      <style>{`@keyframes msPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '1200px', paddingBottom: selected.length ? '96px' : 0 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora", system-ui, sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>My students</h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
              {isLoading ? 'Loading...' : `${all.length} students assigned`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', border: `1px solid ${C.border}` }}>
              {['grid', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: view === v ? 'rgba(127,119,221,0.2)' : 'transparent',
                  color: view === v ? C.purple : C.muted, fontSize: '11px', fontFamily: 'inherit',
                }}>{v === 'grid' ? '⊞ Grid' : '☰ List'}</button>
              ))}
            </div>
            <button onClick={() => refetch()} style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
              color: C.muted, fontSize: '12px', fontFamily: 'inherit',
            }}>↻</button>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '13px' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or roll..."
              style={{
                width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                color: C.text, fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { k: 'all', l: 'All' },
              { k: 'high_risk', l: 'High risk', c: counts.high_risk },
              { k: 'flagged', l: 'Flagged', c: counts.flagged },
              { k: 'low_att', l: 'Low att.', c: counts.low_att },
              { k: 'no_entry', l: 'No entry this wk', c: counts.no_entry },
            ].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{
                padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
                fontSize: '11px', fontFamily: 'inherit',
                background: filter === f.k ? `${C.purple}18` : 'rgba(255,255,255,0.04)',
                color: filter === f.k ? C.purple : C.muted,
                border: `1px solid ${filter === f.k ? C.purple + '30' : C.border}`,
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                {f.l}{f.c != null && <span style={{ fontSize: '10px', background: filter === f.k ? C.purple : 'rgba(255,255,255,0.1)', color: filter === f.k ? '#fff' : C.muted, borderRadius: '999px', padding: '0 5px', minWidth: 14, textAlign: 'center' }}>{f.c}</span>}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: C.muted }}>Sort:</span>
            {[{ k:'name',l:'Name' },{ k:'risk',l:'Risk' },{ k:'attendance',l:'Attendance' }].map(s => (
              <button key={s.k} onClick={() => setSortKey(s.k)} style={{
                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '11px', fontFamily: 'inherit',
                background: sortKey === s.k ? `${C.purple}18` : 'rgba(255,255,255,0.04)',
                color: sortKey === s.k ? C.purple : C.muted,
                border: `1px solid ${sortKey === s.k ? C.purple + '30' : C.border}`,
              }}>{s.l}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <div style={{ ...glass, textAlign: 'center', color: C.red, padding: '24px', marginBottom: '16px' }}>Failed to load students · <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer' }}>Retry</button></div>}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px' }}>
            {[1,2,3,4,5,6].map(i => <Sk key={i} h={180} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && students.length === 0 && (
          <div style={{ ...glass, textAlign: 'center', padding: '48px 24px', color: C.muted }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
            {filter === 'all' && !search ? 'No students assigned to you yet.' : 'No students match the current filter.'}
          </div>
        )}

        {/* Grid / List */}
        {!isLoading && students.length > 0 && (
          <motion.div
            layout
            style={{
              display: view === 'grid'
                ? 'grid'
                : 'flex',
              gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <AnimatePresence>
              {students.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <StudentCard student={s} onBulkToggle={toggleBulk} isBulkSelected={selected.includes(s.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Bulk action bar */}
        <AnimatePresence>
          {selected.length > 0 && (
            <BulkBar selected={selected} onClear={() => setSelected([])} />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
