import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'

// ─── tokens ──────────────────────────────────────────────────────────────────
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
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'rgba(255,255,255,0.05)',
    animation: 'pqPulse 1.6s ease-in-out infinite',
  }} />
)

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return C.teal
  if (score < 60) return C.amber
  if (score < 80) return C.red
  return '#991F1F'
}
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
}
function daysAgo(d) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null }
function getMoodLabel(m) { return { 5:'Great', 4:'Good', 3:'Okay', 2:'Struggling', 1:'Very low' }[m] || '—' }
function getMoodEmoji(m) { return { 5:'😄', 4:'🙂', 3:'😐', 2:'😟', 1:'😞' }[m] || '😐' }

// ─── rating pill ──────────────────────────────────────────────────────────────
function RatingBadge({ subject, rating }) {
  const col = rating >= 4 ? C.teal : rating >= 3 ? C.amber : C.red
  return (
    <span style={{
      display: 'inline-flex', gap: '4px', alignItems: 'center',
      fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
      background: `${col}12`, color: col, border: `1px solid ${col}25`,
    }}>
      {subject} <strong>{rating}/5</strong>
    </span>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, reviewing, onReview, onSkip }) {
  const [expanded, setExpanded] = useState(false)
  const urgencyColor = entry.urgency_score > 80 ? C.red
    : entry.urgency_score > 40 ? C.amber : C.purple
  const riskCol = getRiskColor(entry.ai_risk_score)
  const days = daysAgo(entry.created_at)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 420, height: 0, marginBottom: 0, padding: 0, overflow: 'hidden' }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        ...glass, padding: 0, marginBottom: '14px',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Urgency left stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: urgencyColor }} />

      {/* Main row */}
      <div style={{ display: 'flex', gap: '14px', padding: '16px 18px 16px 22px', alignItems: 'flex-start' }}>
        {/* Avatar & risk ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: `${riskCol}18`, border: `2px solid ${riskCol}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: riskCol,
          }}>{getInitials(entry.student_name || '?')}</div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2, width: 16, height: 16,
            borderRadius: '50%', background: C.void,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px',
          }}>{getMoodEmoji(entry.mood)}</div>
        </div>

        {/* Middle content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{entry.student_name}</span>
            <span style={{ fontSize: '11px', color: C.muted }}>{entry.student_dept}-{entry.student_section} · {entry.student_roll}</span>
            <span style={{ fontSize: '11px', color: C.muted }}>Week {entry.week_number}</span>
          </div>

          {/* Tag row */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
              background: `${riskCol}15`, color: riskCol, border: `1px solid ${riskCol}28`, fontWeight: 600,
            }}>Risk {entry.ai_risk_score ?? '—'}</span>
            {entry.ai_risk_level && <span style={{ fontSize: '10px', color: C.muted, textTransform: 'capitalize' }}>{entry.ai_risk_level}</span>}
            {entry.attendance_pct != null && (
              <span style={{ fontSize: '10px', color: entry.attendance_pct < 75 ? C.amber : C.muted }}>
                {Math.round(entry.attendance_pct)}% att.
              </span>
            )}
            <span style={{ fontSize: '10px', color: C.subtle }}>
              {getMoodLabel(entry.mood)} · {days != null ? `${days}d ago` : ''}
            </span>
            {entry.is_flagged === 1 && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.12)', color: C.red, border: `1px solid rgba(226,75,74,0.25)` }}>🚩 Flagged</span>}
            {entry.urgency_score > 70 && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.08)', color: C.red, border: `1px solid rgba(226,75,74,0.2)` }}>Urgent</span>}
          </div>

          {/* Reflection preview */}
          <div style={{
            fontSize: '12px', color: C.muted, fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
          }}>
            "{entry.reflection || 'No reflection text'}"
          </div>

          {/* Subject ratings */}
          {(entry.subject_ratings || []).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {(entry.subject_ratings || []).map(s => <RatingBadge key={s.subject_name} subject={s.subject_name} rating={s.rating} />)}
            </div>
          )}

          {/* AI summary — expanded only */}
          {expanded && entry.ai_summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                background: `${C.purple}10`, border: `1px solid ${C.purple}20`,
                fontSize: '12px', color: C.muted,
              }}
            >
              <strong style={{ color: C.purple, display: 'block', marginBottom: '4px' }}>AI summary</strong>
              {entry.ai_summary}
            </motion.div>
          )}
        </div>

        {/* Right: urgency score + actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: 900, color: urgencyColor }}>{entry.urgency_score}</div>
            <div style={{ fontSize: '9px', color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>urgency</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setExpanded(x => !x)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px',
                padding: '6px 10px', color: C.muted, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{expanded ? '▲' : '▼'}</button>
            <button
              onClick={() => onReview(entry.id)}
              disabled={reviewing}
              style={{
                background: `linear-gradient(135deg, ${C.purple}, #5B53C0)`,
                border: 'none', borderRadius: '8px', padding: '6px 14px',
                color: '#fff', fontSize: '12px', fontWeight: 700,
                cursor: reviewing ? 'not-allowed' : 'pointer',
                opacity: reviewing ? 0.6 : 1, fontFamily: 'inherit',
              }}
            >Review →</button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── FILTER PILL ──────────────────────────────────────────────────────────────
function Pill({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: '999px', cursor: 'pointer',
      fontSize: '12px', fontFamily: 'inherit', fontWeight: active ? 600 : 400,
      background: active ? 'rgba(127,119,221,0.2)' : 'rgba(255,255,255,0.04)',
      color: active ? C.purple : C.muted,
      border: active ? `1px solid ${C.purple}40` : `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      {label}
      {count != null && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: '999px',
          background: active ? C.purple : 'rgba(255,255,255,0.08)',
          color: active ? '#fff' : C.muted,
          fontSize: '10px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
        }}>{count}</span>
      )}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PriorityQueue() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('urgency')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor', 'priority_queue'],
    queryFn: () => api.get('/mentor/priority-queue').then(r => r.data),
    staleTime: 3 * 60 * 1000,
  })

  const entries = useMemo(() => {
    let list = data?.data || []
    if (filter === 'flagged') list = list.filter(e => e.is_flagged === 1)
    if (filter === 'critical') list = list.filter(e => e.ai_risk_level === 'critical' || e.ai_risk_score >= 80)
    if (filter === 'high') list = list.filter(e => e.ai_risk_level === 'high' || (e.ai_risk_score >= 60 && e.ai_risk_score < 80))
    if (filter === 'low_att') list = list.filter(e => e.attendance_pct != null && e.attendance_pct < 75)
    if (sort === 'urgency') list = [...list].sort((a, b) => b.urgency_score - a.urgency_score)
    else if (sort === 'risk') list = [...list].sort((a, b) => (b.ai_risk_score ?? 0) - (a.ai_risk_score ?? 0))
    else if (sort === 'oldest') list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    else if (sort === 'newest') list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [data, filter, sort])

  const all = data?.data || []
  const counts = {
    flagged: all.filter(e => e.is_flagged === 1).length,
    critical: all.filter(e => e.ai_risk_score >= 80).length,
    high: all.filter(e => e.ai_risk_score >= 60 && e.ai_risk_score < 80).length,
    low_att: all.filter(e => e.attendance_pct != null && e.attendance_pct < 75).length,
  }

  function handleReview(entryId) {
    navigate(`/mentor/review/${entryId}`)
  }

  return (
    <>
      <style>{`@keyframes pqPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '960px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora", system-ui, sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>
              Priority queue
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
              {isLoading ? 'Loading...' : `${all.length} pending entries · sorted by urgency`}
            </p>
          </div>
          <button onClick={() => refetch()} style={{
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
            borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
            color: C.muted, fontSize: '12px', fontFamily: 'inherit',
          }}>↻ Refresh</button>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            { key:'all', label:'All' },
            { key:'critical', label:'Critical', count: counts.critical },
            { key:'flagged', label:'Flagged', count: counts.flagged },
            { key:'high', label:'High risk', count: counts.high },
            { key:'low_att', label:'Low att.', count: counts.low_att },
          ].map(f => (
            <Pill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} count={f.count} />
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: C.muted }}>Sort:</span>
            {[
              { key:'urgency', label:'Urgency' },
              { key:'risk', label:'Risk' },
              { key:'oldest', label:'Oldest first' },
              { key:'newest', label:'Newest' },
            ].map(s => (
              <button key={s.key} onClick={() => setSort(s.key)} style={{
                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '11px', fontFamily: 'inherit',
                background: sort === s.key ? `${C.purple}20` : 'rgba(255,255,255,0.04)',
                color: sort === s.key ? C.purple : C.muted,
                border: `1px solid ${sort === s.key ? C.purple + '40' : C.border}`,
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...glass, borderLeft: `2px solid ${C.red}`, marginBottom: '16px', textAlign: 'center', padding: '28px' }}>
            <div style={{ fontSize: '13px', color: C.red, marginBottom: '10px' }}>Failed to load priority queue</div>
            <button onClick={() => refetch()} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`, borderRadius: '8px', padding: '6px 14px', color: C.red, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>{[1,2,3,4].map(i => <Sk key={i} h={100} />)}</div>}

        {/* Empty state */}
        {!isLoading && !error && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ ...glass, textAlign: 'center', padding: '60px 32px', border: `1px solid rgba(29,158,117,0.2)` }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.teal, marginBottom: '6px' }}>All caught up!</div>
            <div style={{ fontSize: '13px', color: C.muted }}>
              {filter === 'all' ? 'No pending entries to review.' : `No ${filter} entries in the queue.`}
            </div>
          </motion.div>
        )}

        {/* Entry cards */}
        <AnimatePresence>
          {!isLoading && entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              reviewing={false}
              onReview={handleReview}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
