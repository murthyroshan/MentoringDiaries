import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import api from '../../services/api'

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
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'mePulse 1.6s ease-in-out infinite' }} />
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
function fmt(d) { return d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }

// Filter pill
function Pill({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: '999px', cursor: 'pointer',
      fontSize: '12px', fontFamily: 'inherit',
      background: active ? 'rgba(127,119,221,0.18)' : 'rgba(255,255,255,0.04)',
      color: active ? C.purple : C.muted,
      border: `1px solid ${active ? C.purple + '35' : C.border}`,
      display: 'flex', alignItems: 'center', gap: '5px',
      fontWeight: active ? 600 : 400,
    }}>
      {label}
      {count != null && (
        <span style={{
          minWidth: 16, height: 16, borderRadius: '999px',
          background: active ? C.purple : 'rgba(255,255,255,0.08)',
          color: active ? '#fff' : C.muted,
          fontSize: '10px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
        }}>{count}</span>
      )}
    </button>
  )
}

// Entry card
function EntryCard({ entry, navigate, delay }) {
  const riskCol = getRiskColor(entry.ai_risk_score)
  const subjectRatings = entry.subject_ratings || []
  const lowSubs = subjectRatings.filter(s => s.rating <= 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.24 }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.09)' }}
      style={{
        ...glass, padding: 0, overflow: 'hidden',
        borderLeft: `3px solid ${entry.is_flagged ? C.red : riskCol}`,
        cursor: 'pointer',
      }}
      onClick={() => navigate(`/mentor/review/${entry.id}`)}
    >
      <div style={{ display: 'flex', gap: '12px', padding: '14px 16px 14px 18px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `${riskCol}15`, border: `1.5px solid ${riskCol}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: riskCol,
        }}>{getInitials(entry.student_name || '?')}</div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{entry.student_name}</span>
            <span style={{ fontSize: '11px', color: C.muted }}>{entry.student_dept || entry.student_department}-{entry.student_section} · Wk {entry.week_number}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px' }}>{getMoodEmoji(entry.mood)}</span>
            <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '999px', background: `${riskCol}12`, color: riskCol, border: `1px solid ${riskCol}25` }}>
              {entry.ai_risk_score ?? '—'}
            </span>
            {entry.ai_sentiment && <span style={{ fontSize: '10px', color: C.muted, textTransform: 'capitalize' }}>{entry.ai_sentiment}</span>}
            <span style={{ fontSize: '10px', color: C.subtle }}>{fmt(entry.created_at)}</span>
            {entry.is_flagged === 1 && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.1)', color: C.red, border: `1px solid rgba(226,75,74,0.2)` }}>🚩 Flagged</span>}
            {!entry.mentor_response && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: 'rgba(239,159,39,0.1)', color: C.amber }}>Pending</span>}
            {entry.mentor_response && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '999px', background: `${C.teal}10`, color: C.teal }}>Reviewed</span>}
          </div>
          {entry.reflection && (
            <div style={{ fontSize: '12px', color: C.muted, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{entry.reflection.slice(0, 110)}{entry.reflection.length > 110 ? '…' : ''}"
            </div>
          )}
          {lowSubs.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              {lowSubs.map(s => (
                <span key={s.subject_name} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(226,75,74,0.08)', color: C.red }}>
                  {s.subject_name} {s.rating}/5
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ fontSize: '11px', color: C.subtle }}>Sem {entry.semester}</div>
          <div style={{
            fontSize: '11px', padding: '4px 10px', borderRadius: '8px',
            background: `${C.purple}12`, color: C.purple, fontWeight: 500,
          }}>Review →</div>
        </div>
      </div>
    </motion.div>
  )
}

// Main
export default function MentorEntries() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor', 'entries', filter, sort, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter === 'pending') params.append('status', 'submitted')
      if (filter === 'flagged') params.append('is_flagged', '1')
      if (filter === 'reviewed') params.append('status', 'reviewed')
      params.append('page', page)
      params.append('limit', limit)
      return api.get(`/diary?${params}`).then(r => r.data)
    },
    staleTime: 3 * 60 * 1000,
  })

  const entries = useMemo(() => {
    let list = data?.data || []
    if (search) list = list.filter(e => (e.student_name || '').toLowerCase().includes(search.toLowerCase()))
    if (sort === 'newest') list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    if (sort === 'oldest') list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (sort === 'risk') list = [...list].sort((a, b) => (b.ai_risk_score ?? 0) - (a.ai_risk_score ?? 0))
    return list
  }, [data, search, sort])

  const pagination = data?.pagination
  const totalPages = pagination?.pages || 1

  const filterCounts = useMemo(() => {
    const all = data?.data || []
    return {
      pending: all.filter(e => !e.mentor_response).length,
      flagged: all.filter(e => e.is_flagged === 1).length,
      reviewed: all.filter(e => !!e.mentor_response).length,
    }
  }, [data])

  return (
    <>
      <style>{`@keyframes mePulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '960px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>All entries</h1>
            <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
              {isLoading ? 'Loading…' : `${pagination?.total ?? entries.length} entries across all students`}
            </p>
          </div>
          <button onClick={() => refetch()} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', color: C.muted, fontSize: '12px', fontFamily: 'inherit' }}>↻ Refresh</button>
        </div>

        {/* Filters + search */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by student…"
              style={{ width: '100%', padding: '7px 10px 7px 30px', boxSizing: 'border-box', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.text, fontSize: '12px', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { k:'all', l:'All' },
              { k:'pending', l:'Pending', c: filterCounts.pending },
              { k:'flagged', l:'Flagged', c: filterCounts.flagged },
              { k:'reviewed', l:'Reviewed', c: filterCounts.reviewed },
            ].map(f => <Pill key={f.k} label={f.l} active={filter === f.k} onClick={() => { setFilter(f.k); setPage(1) }} count={f.c} />)}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: C.muted }}>Sort:</span>
            {[{ k:'newest',l:'Newest' },{ k:'oldest',l:'Oldest' },{ k:'risk',l:'Risk ↓' }].map(s => (
              <button key={s.k} onClick={() => setSort(s.k)} style={{
                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '11px', fontFamily: 'inherit',
                background: sort === s.k ? `${C.purple}18` : 'rgba(255,255,255,0.04)',
                color: sort === s.k ? C.purple : C.muted, border: `1px solid ${sort === s.k ? C.purple + '30' : C.border}`,
              }}>{s.l}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...glass, borderLeft: `2px solid ${C.red}`, textAlign: 'center', padding: '24px', marginBottom: '14px' }}>
            <div style={{ color: C.red, fontSize: '13px', marginBottom: '8px' }}>Failed to load entries</div>
            <button onClick={() => refetch()} style={{ background: 'rgba(226,75,74,0.1)', border: `1px solid rgba(226,75,74,0.25)`, borderRadius: '8px', padding: '5px 14px', color: C.red, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Retry</button>
          </div>
        )}

        {/* Loading */}
        {isLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{[1,2,3,4].map(i => <Sk key={i} h={90} />)}</div>}

        {/* Empty */}
        {!isLoading && !error && entries.length === 0 && (
          <div style={{ ...glass, textAlign: 'center', padding: '48px', color: C.muted }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
            No entries found
          </div>
        )}

        {/* Cards */}
        <AnimatePresence>
          {!isLoading && entries.map((e, i) => (
            <EntryCard key={e.id} entry={e} navigate={navigate} delay={i * 0.04} />
          ))}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 14px', color: page === 1 ? C.subtle : C.muted, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>← Prev</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pg = Math.min(Math.max(page - 2 + i, 1), totalPages)
              return (
                <button key={pg} onClick={() => setPage(pg)} style={{ minWidth: 32, height: 32, borderRadius: '8px', border: `1px solid ${pg === page ? C.purple + '40' : C.border}`, background: pg === page ? `${C.purple}18` : 'rgba(255,255,255,0.04)', color: pg === page ? C.purple : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>{pg}</button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 14px', color: page === totalPages ? C.subtle : C.muted, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Next →</button>
          </div>
        )}
      </motion.div>
    </>
  )
}
