import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, Filter, Eye, AlertTriangle, Download, ChevronLeft, ChevronRight } from 'lucide-react'
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : (parts[0]?.[0] || '?').toUpperCase()
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

function daysAgo(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'Pulse 1.6s ease-in-out infinite' }} />
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

// ─── Filter Pills ─────────────────────────────────────────────────────────────
function PillFilter({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {label && <span style={{ fontSize: '12px', color: C.muted, flexShrink: 0 }}>{label}:</span>}
      {options.map(o => (
        <button key={o.val} onClick={() => onChange(o.val)} style={{
          padding: '5px 14px', borderRadius: '999px', fontSize: '12px',
          fontFamily: 'inherit', cursor: 'pointer',
          background: value === o.val ? C.purple : 'rgba(255,255,255,0.05)',
          border: `1px solid ${value === o.val ? C.purple : C.border}`,
          color: value === o.val ? '#fff' : C.muted,
          transition: 'all 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AllEntries() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const params = useMemo(() => {
    const p = { page, limit: LIMIT }
    if (statusFilter) p.status = statusFilter
    if (search) p.search = search
    if (riskFilter) p.riskLevel = riskFilter
    return p
  }, [page, statusFilter, search, riskFilter])

  // Filtering is applied server-side (across the whole dataset, not just the
  // current page), so reset to page 1 whenever a filter changes — otherwise a
  // stale high page number would sit past the end of the filtered result set.
  useEffect(() => { setPage(1) }, [search, riskFilter, statusFilter])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-entries', params],
    queryFn: () => api.get(`/diary?${new URLSearchParams(params).toString()}`).then(r => r.data),
    staleTime: 30_000, retry: 1, keepPreviousData: true,
  })

  // The server already filtered by search/risk/status across all pages, so use
  // its result directly — re-filtering client-side would drop valid matches it
  // found by email/reflection.
  const entries = data?.data || []
  const pagination = data?.pagination || { total: 0, pages: 1, page: 1 }

  const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: '10px', color: C.muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, background: 'none', border: 'none' }

  async function handleExport() {
    try {
      const res = await api.get('/analytics/export/csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'mentoring_analytics.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <style>{`@keyframes Pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ maxWidth: '1280px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>
              All entries
            </h1>
            <p style={{ fontSize: '13px', color: C.muted, margin: '5px 0 0' }}>
              {pagination.total} entries found
            </p>
          </div>
          <button onClick={handleExport} style={{
            background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.25)`, borderRadius: '10px',
            padding: '9px 18px', color: C.purple, cursor: 'pointer',
            fontSize: '13px', fontFamily: 'inherit', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ ...glass, padding: '16px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 10px', flex: '1', minWidth: '200px' }}>
            <Search size={13} color={C.muted} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search students, reflection content..."
              style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: '12px', fontFamily: 'inherit', width: '100%' }}
            />
          </div>
          <Filter size={14} color={C.muted} />
          <PillFilter
            options={[
              { label: 'All risks', val: '' },
              { label: 'Critical', val: 'critical' },
              { label: 'High', val: 'high' },
              { label: 'Medium', val: 'medium' },
              { label: 'Low', val: 'low' },
            ]}
            value={riskFilter} onChange={(v) => { setRiskFilter(v); setPage(1) }}
          />
          <PillFilter
            options={[
              { label: 'All status', val: '' },
              { label: 'Pending', val: 'submitted' },
              { label: 'Reviewed', val: 'reviewed' },
            ]}
            value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }}
          />
        </div>

        {/* Table */}
        <div style={{ ...glass, padding: '0' }}>
          {isLoading && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3,4,5].map(i => <Sk key={i} h={42} />)}
            </div>
          )}
          {isError && <div style={{ padding: '20px' }}><ErrCard msg="Failed to load entries" onRetry={refetch} /></div>}

          {!isLoading && !isError && (
            <div style={{ overflowX: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Student', 'Sem/Wk', 'Risk', 'Date', 'Status', 'Mentor', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => {
                    const rLvl = e.ai_risk_level || riskLevelFromScore(e.ai_risk_score)
                    const rCol = riskColor(rLvl)
                    const ago = daysAgo(e.created_at)
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '10px', fontWeight: 700, color: C.muted,
                            }}>{getInitials(e.student?.name || '?')}</div>
                            <div>
                              <div style={{ color: C.text, fontWeight: 500 }}>{e.student?.name || 'Unknown'}</div>
                              <div style={{ fontSize: '11px', color: C.muted }}>Roll {e.student?.roll_number}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.muted }}>
                          Sem {e.semester} · Wk {e.week_number}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                            background: `${rCol}15`, color: rCol, border: `1px solid ${rCol}30`,
                            textTransform: 'capitalize', display: 'inline-block',
                          }}>{rLvl}</span>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.muted, fontSize: '12px' }}>
                          {ago != null ? `${ago}d ago` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {e.status === 'reviewed' ? (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(29,158,117,0.1)', color: C.teal, border: `1px solid rgba(29,158,117,0.25)` }}>Reviewed</span>
                          ) : (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(239,159,39,0.1)', color: C.amber, border: `1px solid rgba(239,159,39,0.25)` }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: C.muted }}>
                          {e.mentor?.name || '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => navigate(`/admin/students/${e.student?.id}`)}
                            style={{ background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`, borderRadius: '6px', padding: '4px 8px', color: C.purple, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'inherit' }}
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {entries.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>No entries found</td></tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '4px 8px', color: page === 1 ? C.subtle : C.muted, cursor: page === 1 ? 'default' : 'pointer' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '12px', color: C.muted }}>Page {page} of {pagination.pages}</span>
                  <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '4px 8px', color: page === pagination.pages ? C.subtle : C.muted, cursor: page === pagination.pages ? 'default' : 'pointer' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
