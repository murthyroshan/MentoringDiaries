import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  border:  'rgba(255,255,255,0.06)',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  green:   '#3DD68C',
  amber:   '#F59E0B',
  red:     '#EF4444',
  teal:    '#2DD4BF',
  purple:  '#A78BFA',
}

const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '20px',
}

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase()
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCountdown(scheduledAt) {
  const now = Date.now()
  const then = new Date(scheduledAt).getTime()
  const diffMs = then - now
  if (diffMs <= 0) return null
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return `Today at ${formatTime(scheduledAt)}`
  if (diffDays === 1) return 'Tomorrow'
  return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
}

function buildICS(session) {
  const mentor = session.mentor?.name || 'Mentor'
  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + (session.duration_mins || 60) * 60 * 1000)

  function pad(n) { return String(n).padStart(2, '0') }
  function toICSDate(d) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MentoringDiaries//EN',
    'BEGIN:VEVENT',
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Mentoring Session with ${mentor}`,
    `LOCATION:${session.location || 'TBD'}`,
    `DESCRIPTION:Mentoring session scheduled via MentoringDiaries`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mentoring-session-${start.toISOString().slice(0, 10)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

const Skel = ({ h = 16, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'ssPulse 1.5s ease-in-out infinite' }} />
)

// ─── Upcoming Session Card ────────────────────────────────────────────────────
function UpcomingSession({ session }) {
  const countdown = getCountdown(session.scheduled_at)
  const mentorName = session.mentor?.name || 'Your Mentor'
  const mentorInitials = getInitials(mentorName)

  return (
    <div style={{ ...glass, borderLeft: `2px solid ${C.teal}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: `${C.teal}22`, border: `1px solid ${C.teal}55`, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upcoming session</span>
        </div>
        {countdown && (
          <span style={{ fontSize: '13px', fontWeight: 600, color: C.teal }}>{countdown}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${C.purple}66, ${C.teal}44)`, border: `2px solid ${C.purple}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {mentorInitials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{mentorName}</div>
          {session.mentor?.department && <div style={{ fontSize: '12px', color: C.muted }}>{session.mentor.department}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginTop: '16px' }}>
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Date</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{formatDate(session.scheduled_at)}</div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Time</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{formatTime(session.scheduled_at)}</div>
        </div>
        {session.duration_mins && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Duration</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{session.duration_mins} minutes</div>
          </div>
        )}
        {session.location && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>Location</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{session.location}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px' }}>
        <button onClick={() => buildICS(session)}
          style={{ padding: '8px 18px', borderRadius: '10px', background: 'rgba(45,212,191,0.12)', border: `1px solid ${C.teal}44`, color: C.teal, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>
          📅 Add to calendar
        </button>
      </div>
    </div>
  )
}

// ─── Timeline Node ────────────────────────────────────────────────────────────
function TimelineNode({ session, index }) {
  const [notesExpanded, setNotesExpanded] = useState(false)
  const statusColor = session.status === 'completed' ? C.teal : C.red
  // The API already returns action_items as a parsed array; JSON.parse on it would throw.
  const actionItems = useMemo(() => {
    return Array.isArray(session.action_items) ? session.action_items : []
  }, [session.action_items])

  const notesLong = (session.notes || '').length > 200

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
    >
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor, border: `2px solid ${statusColor}44`, flexShrink: 0, marginTop: '16px' }} />
        <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${statusColor}44, transparent)`, minHeight: '40px' }} />
      </div>

      {/* Card */}
      <div style={{ ...glass, flex: 1, marginBottom: '8px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{formatDate(session.scheduled_at)}</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{formatTime(session.scheduled_at)}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {session.duration_mins && (
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted }}>
                {session.duration_mins} min
              </span>
            )}
            {session.location && (
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.muted }}>
                📍 {session.location}
              </span>
            )}
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: `${statusColor}22`, border: `1px solid ${statusColor}55`, color: statusColor }}>
              {session.status === 'completed' ? 'Completed' : 'Cancelled'}
            </span>
          </div>
        </div>

        {/* Notes */}
        {session.notes && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Session notes</div>
            <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>
              {notesLong && !notesExpanded ? `${session.notes.slice(0, 200)}...` : session.notes}
            </div>
            {notesLong && (
              <button onClick={() => setNotesExpanded(v => !v)} style={{ background: 'transparent', border: 'none', color: C.purple, cursor: 'pointer', fontSize: '12px', padding: '4px 0', fontFamily: 'inherit' }}>
                {notesExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Action items */}
        {actionItems.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agreed action items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {actionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                  <div style={{ width: 16, height: 16, borderRadius: '4px', border: `2px solid ${C.teal}66`, background: `${C.teal}22`, flexShrink: 0, marginTop: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '2px', background: C.teal }} />
                  </div>
                  <span style={{ fontSize: '13px', color: C.text }}>{typeof item === 'string' ? item : item.text || item.item || JSON.stringify(item)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentSessions() {
  const { user } = useAuthStore()
  const academicYear = currentAcademicYear()

  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', 'student'],
    queryFn: () => api.get('/sessions', { params: { limit: 100 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const allSessions = useMemo(() => sessionsData?.data || [], [sessionsData])

  const now = Date.now()

  const upcoming = useMemo(() =>
    allSessions
      .filter(s => s.status === 'scheduled' && new Date(s.scheduled_at).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
  , [allSessions, now])

  const past = useMemo(() =>
    allSessions
      .filter(s => s.status === 'completed' || s.status === 'cancelled' || new Date(s.scheduled_at).getTime() <= now)
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
  , [allSessions, now])

  // Stats
  const totalThisSem = useMemo(() => {
    const semStart = user?.current_semester % 2 === 1
      ? new Date(new Date().getFullYear(), 5, 1)   // June
      : new Date(new Date().getFullYear(), 0, 1)    // Jan
    return allSessions.filter(s => new Date(s.scheduled_at) >= semStart).length
  }, [allSessions, user])

  const completedSessions = useMemo(() => past.filter(s => s.status === 'completed'), [past])

  const avgDuration = useMemo(() => {
    const withDuration = completedSessions.filter(s => s.duration_mins)
    if (!withDuration.length) return null
    return Math.round(withDuration.reduce((sum, s) => sum + s.duration_mins, 0) / withDuration.length)
  }, [completedSessions])

  const daysSinceLast = useMemo(() => {
    if (!completedSessions.length) return null
    const last = completedSessions[0]
    return Math.floor((now - new Date(last.scheduled_at).getTime()) / (1000 * 60 * 60 * 24))
  }, [completedSessions, now])

  // All action items from past sessions
  const allActionItems = useMemo(() => {
    const items = []
    past.forEach(s => {
      // action_items is already a parsed array from the API — use it directly.
      const parsed = Array.isArray(s.action_items) ? s.action_items : []
      parsed.forEach(item => items.push({ item, sessionDate: s.scheduled_at }))
    })
    return items
  }, [past])

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes ssPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
        <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Skel h={32} w="180px" />
          <div style={glass}><Skel h={160} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {[1,2,3].map(i => <div key={i} style={glass}><Skel h={60} /></div>)}
          </div>
          {[1,2,3].map(i => <div key={i} style={glass}><Skel h={100} /></div>)}
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <style>{`@keyframes ssPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
        <div style={{ ...glass, border: '1px solid rgba(239,68,68,0.25)', textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '13px', color: C.muted, marginBottom: '12px' }}>Failed to load sessions</div>
          <button onClick={() => refetch()} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '7px 18px', color: C.red, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Retry</button>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes ssPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>Sessions</h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '6px 0 0' }}>Your mentoring sessions with {user?.name?.split(' ')[0] || 'your mentor'}</p>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 ? (
          <UpcomingSession session={upcoming[0]} />
        ) : (
          <div style={{ ...glass, border: `2px dashed ${C.border}`, textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📅</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '6px' }}>No sessions scheduled yet</div>
            <div style={{ fontSize: '13px', color: C.muted }}>Your mentor will schedule a session with you</div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Total sessions this semester', value: String(totalThisSem), color: C.purple },
            { label: 'Average duration', value: avgDuration != null ? `${avgDuration} min` : '—', color: C.teal },
            { label: 'Days since last session', value: daysSinceLast != null ? `${daysSinceLast} day${daysSinceLast !== 1 ? 's' : ''} ago` : 'No sessions yet', color: C.amber },
          ].map(stat => (
            <div key={stat.label} style={{ ...glass, padding: '16px' }}>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Past sessions timeline */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>Past sessions</div>
          {past.length === 0 ? (
            <div style={{ ...glass, textAlign: 'center', padding: '32px', fontSize: '13px', color: C.muted }}>
              No past sessions yet. Your first session will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {past.map((session, i) => (
                <TimelineNode key={session.id} session={session} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Action items tracker */}
        <div style={glass}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>Open action items</div>
          {allActionItems.length === 0 ? (
            <div style={{ padding: '16px', borderRadius: '10px', background: `${C.teal}11`, border: `1px solid ${C.teal}33`, fontSize: '13px', color: C.teal, textAlign: 'center' }}>
              ✓ All caught up — no open action items
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allActionItems.map((ai, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                  <div style={{ width: 16, height: 16, borderRadius: '4px', border: `2px solid ${C.teal}66`, flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '2px', background: `${C.teal}88` }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: C.text }}>
                      {typeof ai.item === 'string' ? ai.item : ai.item?.text || ai.item?.item || JSON.stringify(ai.item)}
                    </div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>from session on {formatShortDate(ai.sessionDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
