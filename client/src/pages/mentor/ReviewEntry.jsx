import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  border: `1px solid ${C.border}`, borderRadius: '16px', padding: '22px',
}
const Sk = ({ h = 20, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'rePulse 1.6s ease-in-out infinite' }} />
)

function getRiskColor(s) {
  if (s == null) return C.subtle
  if (s < 30) return C.teal
  if (s < 60) return C.amber
  if (s < 80) return C.red
  return '#991F1F'
}
function getMoodLabel(m) { return { 5:'Great', 4:'Good', 3:'Okay', 2:'Struggling', 1:'Very low' }[m] || '—' }
function getMoodEmoji(m) { return { 5:'😄', 4:'🙂', 3:'😐', 2:'😟', 1:'😞' }[m] || '😐' }
function fmt(d) { return d ? new Date(d).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—' }
function getInitials(n = '') {
  const p = n.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase()
}

// ─── Risk ring ────────────────────────────────────────────────────────────────
function RiskRing({ score, label, size = 80 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * Math.min(score ?? 0, 100)) / 100
  const col = getRiskColor(score)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={col} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill={col} fontSize="16" fontWeight="900" fontFamily="system-ui">{score ?? '—'}</text>
      </svg>
      <span style={{ fontSize: '11px', color: C.muted }}>{label}</span>
    </div>
  )
}

// ─── Quick-insert chip ────────────────────────────────────────────────────────
function Chip({ text, onInsert }) {
  return (
    <button onClick={() => onInsert(text)} style={{
      padding: '4px 10px', borderRadius: '999px', cursor: 'pointer',
      background: 'rgba(127,119,221,0.08)', border: `1px solid rgba(127,119,221,0.2)`,
      color: C.purple, fontSize: '11px', fontFamily: 'inherit', fontWeight: 500,
    }}>{text}</button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReviewEntry() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const reduced = useReducedMotion()
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)

  // ── Entry query ──────────────────────────────────────────────────────────
  const { data: entryData, isLoading: entryLoading, error: entryError } = useQuery({
    queryKey: ['entry', entryId],
    queryFn: () => api.get(`/diary/${entryId}`).then(r => r.data),
    staleTime: 2 * 60 * 1000, enabled: !!entryId,
  })

  // ── AI suggestion query ──────────────────────────────────────────────────
  const { data: suggData, isLoading: suggLoading, refetch: fetchSugg } = useQuery({
    queryKey: ['mentor', 'ai_suggestion', entryId],
    queryFn: () => api.get(`/mentor/ai-suggestion/${entryId}`).then(r => r.data),
    staleTime: 10 * 60 * 1000, enabled: false, // manual trigger only
    retry: 1,
  })

  // ── Previous entries by same student ─────────────────────────────────────
  const entry = entryData?.data || entryData
  const studentId = entry?.student_id

  const { data: prevData } = useQuery({
    queryKey: ['diary', 'student', studentId],
    queryFn: () => api.get(`/diary?student_id=${studentId}&limit=3`).then(r => r.data),
    staleTime: 5 * 60 * 1000, enabled: !!studentId,
  })

  const prevEntries = (prevData?.data || []).filter(e => String(e.id) !== String(entryId)).slice(0, 3)

  // ── Submit mutation ───────────────────────────────────────────────────────
  const submitMut = useMutation({
    mutationFn: (body) => api.patch(`/diary/${entryId}/response`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mentor', 'priority_queue'] })
      qc.invalidateQueries({ queryKey: ['mentor', 'dashboard_summary'] })
      qc.invalidateQueries({ queryKey: ['entry', entryId] })
      setSubmitted(true)
    },
    onError: (e) => addToast(e?.response?.data?.message || 'Failed to submit response', 'error'),
  })

  // ── Ctrl+Enter shortcut ───────────────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      // Guard on isPending as well as submitted, otherwise key auto-repeat or a
      // second keypress during the in-flight request fires duplicate PATCHes.
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && response.trim() && !submitted && !submitMut.isPending) {
        submitMut.mutate({ response })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [response, submitted, submitMut])

  function insertChip(text) {
    setResponse(r => r ? `${r} ${text}` : text)
  }

  function handleLoadSugg() {
    fetchSugg()
    setAiExpanded(true)
  }

  // ── After submission — success animation then redirect ────────────────────
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => navigate(-1), 2200)
      return () => clearTimeout(t)
    }
  }, [submitted, navigate])

  const subjectRatings = entry?.subject_ratings || []
  const aiFlagsArr = (() => { try { return JSON.parse(entry?.ai_flags || '[]') } catch { return [] } })()
  const keyConcerns = (() => { try { return JSON.parse(entry?.ai_key_concerns || '[]') } catch { return [] } })()
  const riskCol = getRiskColor(entry?.ai_risk_score)

  if (entryLoading) return (
    <div style={{ maxWidth: 1100 }}>
      <Sk h={40} w="60%" /><div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}><Sk h={400} /><Sk h={400} /></div>
    </div>
  )

  if (entryError) return (
    <div style={{ ...glass, maxWidth: 500, textAlign: 'center' }}>
      <div style={{ fontSize: '14px', color: C.red, marginBottom: '10px' }}>Failed to load entry</div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontFamily: 'inherit' }}>← Go back</button>
    </div>
  )

  if (!entry) return null

  const alreadyReviewed = !!entry.mentor_response

  return (
    <>
      <style>{`@keyframes rePulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>

      {/* Success state */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(6,6,10,0.9)', backdropFilter: 'blur(12px)',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.teal}, #157a5a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', marginBottom: '20px',
              }}
            >✓</motion.div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Response submitted!</div>
            <div style={{ fontSize: '13px', color: C.muted }}>Returning to queue…</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{ maxWidth: '1100px' }}
      >
        {/* Back + header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '13px', fontFamily: 'inherit', padding: 0 }}>← Back</button>
            <div>
              <h1 style={{ fontFamily: '"Sora",system-ui,sans-serif', fontSize: '18px', fontWeight: 700, color: C.text, margin: 0 }}>
                Review — {entry.student_name || 'Student'} · Week {entry.week_number}
              </h1>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px' }}>{fmt(entry.created_at)}</div>
            </div>
          </div>
          {alreadyReviewed && (
            <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '999px', background: `${C.teal}12`, color: C.teal, border: `1px solid ${C.teal}25` }}>
              ✓ Already reviewed
            </span>
          )}
        </div>

        {/* 60/40 layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: '16px', alignItems: 'start' }}>

          {/* ── LEFT: Entry detail ────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Student info + risk ring */}
            <div style={{ ...glass, display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                background: `${riskCol}18`, border: `2px solid ${riskCol}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: riskCol,
              }}>{getInitials(entry.student_name || '?')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{entry.student_name}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                  {entry.student_dept || entry.student_department}-{entry.student_section} · {entry.student_roll_number}
                </div>
                <div style={{ fontSize: '11px', color: C.muted }}>
                  {entry.start_date ? `${fmt(entry.start_date)} — ${fmt(entry.end_date)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <RiskRing score={entry.ai_risk_score} label="Risk" size={72} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px' }}>{getMoodEmoji(entry.mood)}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{getMoodLabel(entry.mood)}</div>
                </div>
              </div>
            </div>

            {/* Reflection */}
            <div style={{ ...glass }}>
              <div style={{ fontSize: '12px', color: C.purple, fontWeight: 600, marginBottom: '8px' }}>Reflection</div>
              <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{entry.reflection || '—'}</div>
            </div>

            {/* Challenges */}
            {entry.challenges && (
              <div style={{ ...glass }}>
                <div style={{ fontSize: '12px', color: C.amber, fontWeight: 600, marginBottom: '8px' }}>Challenges</div>
                <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.65 }}>{entry.challenges}</div>
              </div>
            )}

            {/* Subject ratings */}
            {subjectRatings.length > 0 && (
              <div style={{ ...glass }}>
                <div style={{ fontSize: '12px', color: C.muted, fontWeight: 600, marginBottom: '10px' }}>Subject ratings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subjectRatings.map(s => (
                    <div key={s.subject_name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: C.muted, flex: 1, minWidth: 0 }}>{s.subject_name}</span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            width: 14, height: 14, borderRadius: '50%',
                            background: i <= s.rating
                              ? s.rating <= 2 ? C.red : s.rating <= 3 ? C.amber : C.teal
                              : 'rgba(255,255,255,0.08)',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '11px', color: C.muted, minWidth: 28, textAlign: 'right' }}>{s.rating}/5</span>
                      {s.note && <span style={{ fontSize: '10px', color: C.subtle, fontStyle: 'italic' }}>"{s.note}"</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance */}
            {entry.attendance_pct != null && (
              <div style={{ ...glass, padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: C.muted }}>Self-reported attendance</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: entry.attendance_pct < 75 ? C.amber : C.teal }}>
                    {entry.attendance_pct}%
                  </span>
                </div>
                {entry.attendance_explanation && <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', fontStyle: 'italic' }}>{entry.attendance_explanation}</div>}
              </div>
            )}

            {/* Previous entries */}
            {prevEntries.length > 0 && (
              <div style={{ ...glass }}>
                <div style={{ fontSize: '12px', color: C.muted, fontWeight: 600, marginBottom: '10px' }}>Previous entries</div>
                {prevEntries.map(pe => (
                  <div key={pe.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontSize: '11px', color: C.muted }}>Wk {pe.week_number}</span>
                    <span style={{ fontSize: '16px' }}>{getMoodEmoji(pe.mood)}</span>
                    <span style={{
                      fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                      background: `${getRiskColor(pe.ai_risk_score)}12`,
                      color: getRiskColor(pe.ai_risk_score),
                    }}>Risk {pe.ai_risk_score ?? '—'}</span>
                    <span style={{ fontSize: '11px', color: pe.mentor_response ? C.teal : C.amber }}>
                      {pe.mentor_response ? '✓ Reviewed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: AI analysis + response ─────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '24px' }}>

            {/* AI analysis */}
            <div style={{ ...glass }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.purple, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✦ AI analysis
                <span style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                  background: `${riskCol}12`, color: riskCol, border: `1px solid ${riskCol}25`,
                }}>{entry.ai_risk_level || '—'}</span>
                <span style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                  background: 'rgba(255,255,255,0.05)', color: C.muted, textTransform: 'capitalize',
                }}>{entry.ai_sentiment}</span>
              </div>

              {entry.ai_summary && (
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px', lineHeight: 1.6 }}>{entry.ai_summary}</div>
              )}

              {keyConcerns.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: C.muted, marginBottom: '6px' }}>KEY CONCERNS</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {keyConcerns.map(c => (
                      <span key={c} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(226,75,74,0.08)', color: C.red, border: `1px solid rgba(226,75,74,0.2)` }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {aiFlagsArr.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: C.muted, marginBottom: '6px' }}>FLAGS</div>
                  {aiFlagsArr.map(f => (
                    <div key={f.word || JSON.stringify(f)} style={{ fontSize: '11px', color: C.amber, marginBottom: '2px' }}>
                      ⚑ {f.word}
                    </div>
                  ))}
                </div>
              )}

              {entry.ai_confidence != null && (
                <div style={{ marginTop: '10px', fontSize: '10px', color: C.subtle }}>
                  AI confidence: {(entry.ai_confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>

            {/* AI suggestion */}
            <div style={{ ...glass }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>Mentor suggestion</span>
                {!aiExpanded && (
                  <button onClick={handleLoadSugg} disabled={suggLoading} style={{
                    background: `${C.purple}12`, border: `1px solid ${C.purple}25`,
                    borderRadius: '7px', padding: '4px 10px',
                    color: C.purple, fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>{suggLoading ? '⟳ Loading...' : '✦ Load AI suggestion'}</button>
                )}
              </div>

              <AnimatePresence>
                {aiExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {suggLoading && <Sk h={80} />}
                    {suggData?.data && (
                      <>
                        <div style={{
                          padding: '10px 12px', borderRadius: '10px',
                          background: `${C.purple}08`, border: `1px solid ${C.purple}15`,
                          fontSize: '12px', color: C.muted, marginBottom: '10px', lineHeight: 1.6,
                        }}>{suggData.data.supportiveResponse}</div>
                        {(suggData.data.suggestedGuidance || []).length > 0 && (
                          <div>
                            <div style={{ fontSize: '10px', color: C.muted, marginBottom: '6px' }}>SUGGESTED ACTIONS</div>
                            {suggData.data.suggestedGuidance.map((g, i) => (
                              <div key={i} style={{ fontSize: '11px', color: C.muted, marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                <span style={{ color: C.purple, flexShrink: 0 }}>→</span>
                                <span>{g}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setResponse(suggData.data.supportiveResponse)}
                          style={{
                            marginTop: '10px', background: 'rgba(127,119,221,0.1)', border: `1px solid ${C.purple}25`,
                            borderRadius: '7px', padding: '5px 12px',
                            color: C.purple, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                          }}>Use this as response →</button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Response box */}
            <div style={{ ...glass }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.text, marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Your response</span>
                <span style={{ fontSize: '10px', color: C.subtle }}>Ctrl+Enter to submit</span>
              </div>

              {alreadyReviewed ? (
                <div style={{
                  padding: '12px', borderRadius: '10px',
                  background: `${C.teal}08`, border: `1px solid ${C.teal}20`,
                  fontSize: '13px', color: C.muted, lineHeight: 1.6,
                }}>
                  <strong style={{ color: C.teal, display: 'block', marginBottom: '6px' }}>Previous response:</strong>
                  {entry.mentor_response}
                </div>
              ) : (
                <>
                  <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Write a supportive, constructive response to this student…"
                    rows={6}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                      borderRadius: '10px', color: C.text, fontSize: '13px',
                      fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.55,
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {['Well done on your reflection!', 'Let\'s discuss this further.', 'Consider seeking support.', 'Keep up the great work!', 'I appreciate your honesty.'].map(c => (
                      <Chip key={c} text={c} onInsert={insertChip} />
                    ))}
                  </div>
                  <button
                    onClick={() => submitMut.mutate({ response })}
                    disabled={!response.trim() || submitMut.isPending}
                    style={{
                      width: '100%', marginTop: '12px', padding: '11px',
                      borderRadius: '10px',
                      background: response.trim() ? `linear-gradient(135deg, ${C.purple}, #5B53C0)` : 'rgba(255,255,255,0.05)',
                      border: 'none', color: response.trim() ? '#fff' : C.subtle,
                      fontSize: '13px', fontWeight: 700, cursor: response.trim() ? 'pointer' : 'not-allowed',
                      opacity: submitMut.isPending ? 0.7 : 1, fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >{submitMut.isPending ? 'Submitting…' : `Submit response (${response.length} chars)`}</button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
