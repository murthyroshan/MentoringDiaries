import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Video, Clock, CalendarDays, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { format, formatDistanceToNow, isPast, differenceInHours, differenceInMinutes } from 'date-fns'
import api from '../../services/api'

function normalizeSession(s) {
  const date = s.scheduledAt || s.date
  return {
    ...s,
    date,
    time: date ? new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
    mentorName: s.mentor?.name || s.mentorName || 'Your Mentor',
    type: s.type || '1:1 Mentoring Session',
    duration: s.duration || '45 min',
    mode: s.mode || 'Online',
    notes: s.mentorNotes || s.notes,
    actionItems: s.actionItems || [],
  }
}

function Countdown({ date }) {
  const hours = differenceInHours(new Date(date), new Date())
  const minutes = differenceInMinutes(new Date(date), new Date()) % 60
  if (hours > 24) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
      padding: '8px 14px', borderRadius: '10px', background: 'rgba(232,184,75,0.08)',
      border: '1px solid rgba(232,184,75,0.15)', width: 'fit-content',
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%', background: '#E8B84B',
        animation: 'live-pulse 1.5s ease-in-out infinite',
      }} />
      <span style={{ fontSize: '12px', color: '#E8B84B', fontWeight: 500 }}>
        Starting in {hours}h {minutes}m
      </span>
      <style>{`@keyframes live-pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}`}</style>
    </div>
  )
}

function UpcomingSessionCard({ session }) {
  const sessionDate = new Date(session.date || session.scheduledAt)
  const isWithin24h = differenceInHours(sessionDate, new Date()) <= 24

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        background: 'linear-gradient(135deg,#111118 0%,#16161F 100%)',
        border: '1px solid rgba(232,184,75,0.1)',
        borderRadius: '24px', padding: '28px',
        display: 'flex', gap: '24px', alignItems: 'flex-start',
        marginBottom: '16px',
      }}
    >
      {/* Date block */}
      <div style={{
        flexShrink: 0, textAlign: 'center', minWidth: '70px',
        background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.12)',
        borderRadius: '16px', padding: '14px 18px',
      }}>
        <div style={{
          fontSize: '10px', color: '#E8B84B', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px',
        }}>
          {format(sessionDate, 'MMM')}
        </div>
        <div style={{ fontSize: '36px', fontWeight: 900, color: '#F2F0E8', lineHeight: 1 }}>
          {format(sessionDate, 'd')}
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(242,240,232,0.35)', marginTop: '4px' }}>
          {format(sessionDate, 'EEE')}
        </div>
      </div>

      {/* Session details */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#F2F0E8', marginBottom: '10px' }}>
          {session.type}
        </div>

        {/* Mentor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(232,184,75,0.15)', border: '1.5px solid rgba(232,184,75,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, color: '#E8B84B',
          }}>
            {session.mentorInitials || session.mentorName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(242,240,232,0.6)' }}>{session.mentorName}</span>
          <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.3)', marginLeft: '4px' }}>your mentor</span>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(242,240,232,0.4)' }}>
            <Clock size={12} /> {session.time} · {session.duration}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(242,240,232,0.4)' }}>
            <Video size={12} /> {session.mode || 'Online'}
          </span>
        </div>

        {/* Agenda */}
        {session.agenda && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px',
          }}>
            <div style={{
              fontSize: '10px', color: 'rgba(242,240,232,0.3)', marginBottom: '4px',
              fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>Agenda</div>
            <p style={{ fontSize: '12px', color: 'rgba(242,240,232,0.55)', margin: 0, lineHeight: 1.5 }}>
              {session.agenda}
            </p>
          </div>
        )}

        {isWithin24h && <Countdown date={session.date} />}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <button style={{
          padding: '10px 20px', borderRadius: '12px', fontSize: '13px',
          background: 'linear-gradient(135deg,#E8B84B,#F5D380)', color: '#06060A',
          fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}>Join session</button>
        <button style={{
          padding: '10px 20px', borderRadius: '12px', fontSize: '13px',
          background: 'transparent', color: 'rgba(242,240,232,0.5)',
          border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}>Reschedule</button>
      </div>
    </motion.div>
  )
}

function PastSessionRow({ session, isExpanded, onToggle }) {
  return (
    <motion.div layout style={{ marginBottom: '8px' }}>
      {/* Row header (always visible) */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
          padding: '14px 18px', cursor: 'pointer',
          transition: 'border-color 0.2s, border-radius 0.2s',
        }}
      >
        {/* Date */}
        <div style={{ flexShrink: 0, width: '60px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#F2F0E8' }}>
            {format(new Date(session.date), 'MMM d')}
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(242,240,232,0.3)' }}>
            {format(new Date(session.date), 'yyyy')}
          </div>
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: 'rgba(242,240,232,0.7)' }}>{session.type}</div>
          <div style={{ fontSize: '11px', color: 'rgba(242,240,232,0.35)', marginTop: '2px' }}>
            {session.mentorName} · {session.duration}
          </div>
        </div>

        {/* Expand button */}
        <div style={{ color: 'rgba(242,240,232,0.3)' }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(17,17,24,0.7)', border: '1px solid rgba(255,255,255,0.06)',
              borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '16px 18px',
            }}>
              {/* Notes */}
              {session.notes && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '11px', color: 'rgba(242,240,232,0.3)', marginBottom: '6px',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>Session Notes</div>
                  <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.6)', margin: 0, lineHeight: 1.6 }}>
                    {session.notes}
                  </p>
                </div>
              )}

              {/* Action items */}
              {session.actionItems?.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '11px', color: 'rgba(242,240,232,0.3)', marginBottom: '8px',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>Action Items</div>
                  {session.actionItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#E8B84B', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'rgba(242,240,232,0.55)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function StudentSessions() {
  const reduced = useReducedMotion()
  const [expandedPastId, setExpandedPastId] = useState(null)

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['student-sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
  })

  const allSessions = (
    sessionsData?.data || sessionsData?.sessions || sessionsData?.upcoming
      ? [...(sessionsData?.upcoming || []), ...(sessionsData?.past || [])]
      : Array.isArray(sessionsData)
      ? sessionsData
      : []
  ).map(normalizeSession)

  const rawAll = sessionsData?.data || sessionsData?.sessions
  const normalizedAll = Array.isArray(rawAll)
    ? rawAll.map(normalizeSession)
    : allSessions

  const upcoming = sessionsData?.upcoming
    ? sessionsData.upcoming.map(normalizeSession)
    : normalizedAll.filter(s => s.date && !isPast(new Date(s.date)))

  const past = sessionsData?.past
    ? sessionsData.past.map(normalizeSession)
    : normalizedAll.filter(s => s.date && isPast(new Date(s.date)))

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: '"Sora",system-ui', fontSize: '24px', fontWeight: 700,
          color: '#F2F0E8', margin: 0,
        }}>Sessions</h1>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '6px 0 0' }}>
          Your mentoring sessions
        </p>
      </div>

      {/* Upcoming */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          fontSize: '16px', fontWeight: 600, color: 'rgba(242,240,232,0.7)',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          Upcoming Sessions
          {upcoming.length > 0 && (
            <span style={{
              fontSize: '12px', padding: '1px 8px', borderRadius: '999px',
              background: 'rgba(232,184,75,0.1)', color: '#E8B84B',
              border: '1px solid rgba(232,184,75,0.2)',
            }}>{upcoming.length}</span>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div style={{
            padding: '40px', textAlign: 'center', background: '#111118',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px',
          }}>
            <div style={{ fontSize: '14px', color: 'rgba(242,240,232,0.3)' }}>
              No upcoming sessions scheduled
            </div>
          </div>
        ) : (
          upcoming.map(s => <UpcomingSessionCard key={s._id} session={s} />)
        )}
      </div>

      {/* Past sessions */}
      <div>
        <div style={{
          fontSize: '16px', fontWeight: 600, color: 'rgba(242,240,232,0.7)',
          marginBottom: '16px',
        }}>
          Past Sessions
        </div>
        {past.map(s => (
          <PastSessionRow
            key={s._id}
            session={s}
            isExpanded={expandedPastId === s._id}
            onToggle={() => setExpandedPastId(expandedPastId === s._id ? null : s._id)}
          />
        ))}
      </div>
    </motion.div>
  )
}
