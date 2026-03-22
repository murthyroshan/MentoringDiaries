import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Download, X, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'

// ── Demo fallback data ─────────────────────────────────────────────────────────
const DEMO_ENTRIES = [
  { _id:'1', week:14, mood:'😊', riskScore:23, riskLevel:'low', reflection:'Had a productive week overall. Managed to complete all assignments on time and attended all classes. Feeling good about the upcoming exams.', subjectCount:4, createdAt:new Date().toISOString(), reviewStatus:'reviewed' },
  { _id:'2', week:13, mood:'🙂', riskScore:31, riskLevel:'low', reflection:'Struggled a bit with the advanced topics in Computer Science but got help from peers. Attendance was consistent.', subjectCount:4, createdAt:new Date(Date.now()-7*86400000).toISOString(), reviewStatus:'reviewed' },
  { _id:'3', week:12, mood:'😐', riskScore:48, riskLevel:'medium', reflection:'Missed two classes due to illness. Need to catch up on the material covered. Feeling slightly behind.', subjectCount:3, createdAt:new Date(Date.now()-14*86400000).toISOString(), reviewStatus:'pending' },
  { _id:'4', week:11, mood:'😊', riskScore:25, riskLevel:'low', reflection:'Great week! Submitted all assignments early and had a productive mentoring session with Dr. Reema.', subjectCount:5, createdAt:new Date(Date.now()-21*86400000).toISOString(), reviewStatus:'reviewed' },
  { _id:'5', week:10, mood:'😔', riskScore:72, riskLevel:'high', reflection:'Very difficult week. Multiple deadlines coincided and I felt overwhelmed. Need better time management.', subjectCount:4, createdAt:new Date(Date.now()-28*86400000).toISOString(), reviewStatus:'flagged' },
  { _id:'6', week:9, mood:'🙂', riskScore:38, riskLevel:'low', reflection:'Steady week with no major issues. Completed lab reports and attended all sessions.', subjectCount:4, createdAt:new Date(Date.now()-35*86400000).toISOString(), reviewStatus:'reviewed' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function getRiskColor(score) {
  if (score < 40) return '#3DD68C'
  if (score < 70) return '#F59E0B'
  return '#EF4444'
}

function getRiskLabel(score) {
  if (score < 40) return 'Low'
  if (score < 70) return 'Medium'
  return 'High'
}

// ── Skeleton Grid ──────────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'16px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            background:'#111118',
            border:'1px solid rgba(255,255,255,0.06)',
            borderRadius:'18px',
            padding:'20px',
            height:'180px',
            animation:'pulse 1.5s ease-in-out infinite',
            opacity: 1 - i * 0.1,
          }}
        />
      ))}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate()
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'80px 20px', textAlign:'center',
    }}>
      <div style={{ position:'relative', width:'80px', height:'80px', marginBottom:'24px' }}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'20px',
          border:'1.5px solid rgba(232,184,75,0.15)', transform:'rotate(12deg)',
        }} />
        <div style={{
          position:'absolute', inset:'8px', borderRadius:'16px',
          border:'1.5px solid rgba(232,184,75,0.1)', transform:'rotate(6deg)',
        }} />
        <div style={{
          position:'absolute', inset:'16px', borderRadius:'12px',
          border:'1.5px solid rgba(232,184,75,0.25)',
        }} />
      </div>
      <div style={{ fontSize:'20px', color:'rgba(242,240,232,0.3)', marginBottom:'8px' }}>
        No entries yet
      </div>
      <div style={{ fontSize:'13px', color:'rgba(242,240,232,0.2)', marginBottom:'24px' }}>
        Start documenting your journey
      </div>
      <button
        onClick={() => navigate('/submit')}
        style={{
          padding:'10px 24px', borderRadius:'12px', fontSize:'13px',
          background:'linear-gradient(135deg,#E8B84B,#F5D380)', color:'#06060A',
          fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit',
        }}
      >
        Start your journey →
      </button>
    </div>
  )
}

// ── Entry Card ─────────────────────────────────────────────────────────────────
function EntryCard({ entry, delay, onClick }) {
  const statusColors = { reviewed:'#3DD68C', pending:'#F59E0B', flagged:'#EF4444' }
  const statusColor = statusColors[entry.reviewStatus] || '#F59E0B'

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.95 }}
      transition={{ delay, duration:0.3 }}
      whileHover={{ y:-3, borderColor:'rgba(255,255,255,0.12)', boxShadow:'0 20px 40px rgba(0,0,0,0.4)' }}
      onClick={onClick}
      style={{
        background:'#111118',
        border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:'18px',
        padding:'20px',
        cursor:'pointer',
        transition:'border-color 0.25s, box-shadow 0.25s',
      }}
    >
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{
          padding:'2px 10px', borderRadius:'999px', fontSize:'11px',
          background:'rgba(232,184,75,0.1)', color:'#E8B84B',
          border:'1px solid rgba(232,184,75,0.2)', fontWeight:500,
        }}>
          Week {entry.week}
        </span>
        <span style={{ fontSize:'22px' }}>{entry.mood}</span>
        <span style={{
          marginLeft:'auto', fontSize:'10px', padding:'2px 8px', borderRadius:'999px',
          background:`${getRiskColor(entry.riskScore)}15`,
          color:getRiskColor(entry.riskScore),
          border:`1px solid ${getRiskColor(entry.riskScore)}25`,
        }}>
          {getRiskLabel(entry.riskScore)} Risk
        </span>
      </div>

      {/* Date */}
      <div style={{ fontSize:'11px', color:'rgba(242,240,232,0.3)', marginTop:'6px' }}>
        {format(new Date(entry.createdAt), 'MMMM d, yyyy')}
      </div>

      {/* Divider */}
      <div style={{ height:'1px', background:'rgba(255,255,255,0.05)', margin:'12px 0' }} />

      {/* Reflection preview */}
      <p style={{
        fontSize:'13px', color:'rgba(242,240,232,0.5)', margin:0, lineHeight:1.6,
        display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden',
      }}>
        {entry.reflection}
      </p>

      {/* Bottom row */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'14px' }}>
        <span style={{ fontSize:'11px', color:'rgba(242,240,232,0.3)', flex:1 }}>
          {entry.subjectCount} subjects
        </span>
        <span style={{
          fontSize:'10px', padding:'2px 8px', borderRadius:'999px',
          background:`${statusColor}12`,
          color:statusColor,
          border:`1px solid ${statusColor}25`,
          animation: entry.reviewStatus === 'flagged' ? 'flag-pulse 2s ease-in-out infinite' : 'none',
        }}>
          {entry.reviewStatus === 'reviewed'
            ? 'Reviewed'
            : entry.reviewStatus === 'flagged'
            ? '⚠ Flagged'
            : 'Pending'}
        </span>
      </div>
    </motion.div>
  )
}

// ── Slide-Over Panel ───────────────────────────────────────────────────────────
function SlideOverPanel({ entry, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        onClick={onClose}
        style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.5)',
          zIndex:40,
          backdropFilter:'blur(4px)',
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x:'100%' }}
        animate={{ x:0 }}
        exit={{ x:'100%' }}
        transition={{ type:'spring', stiffness:300, damping:30 }}
        style={{
          position:'fixed', right:0, top:0, bottom:0,
          width:'420px', maxWidth:'95vw',
          background:'#111118',
          borderLeft:'1px solid rgba(232,184,75,0.08)',
          zIndex:50,
          overflowY:'auto',
          padding:'28px',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position:'absolute', top:'20px', right:'20px',
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'8px', padding:'6px',
            cursor:'pointer', color:'rgba(242,240,232,0.5)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          <X size={16} />
        </button>

        {/* Week + mood header */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px',
          marginBottom:'20px', paddingRight:'40px',
        }}>
          <span style={{ fontSize:'32px' }}>{entry.mood}</span>
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#F2F0E8' }}>
              Week {entry.week}
            </div>
            <div style={{ fontSize:'12px', color:'rgba(242,240,232,0.35)' }}>
              {format(new Date(entry.createdAt), 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
          <span style={{
            marginLeft:'auto', padding:'3px 10px', borderRadius:'999px', fontSize:'12px',
            background:`${getRiskColor(entry.riskScore)}15`,
            color:getRiskColor(entry.riskScore),
            border:`1px solid ${getRiskColor(entry.riskScore)}25`,
          }}>
            {entry.riskScore} Risk
          </span>
        </div>

        <div style={{ height:'1px', background:'rgba(255,255,255,0.05)', marginBottom:'20px' }} />

        {/* Reflection */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{
            fontSize:'11px', color:'rgba(242,240,232,0.35)', marginBottom:'8px',
            fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase',
          }}>
            Reflection
          </div>
          <p style={{ fontSize:'13px', color:'rgba(242,240,232,0.7)', lineHeight:1.7, margin:0 }}>
            {entry.reflection}
          </p>
        </div>

        {/* Subject ratings — only if present */}
        {entry.subjects?.length > 0 && (
          <div style={{ marginBottom:'20px' }}>
            <div style={{
              fontSize:'11px', color:'rgba(242,240,232,0.35)', marginBottom:'10px',
              fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase',
            }}>
              Subjects
            </div>
            {entry.subjects.map((s, i) => (
              <div
                key={i}
                style={{
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:'8px',
                }}
              >
                <span style={{ fontSize:'13px', color:'rgba(242,240,232,0.6)' }}>{s.name}</span>
                <span style={{ color:'#E8B84B', fontSize:'14px' }}>
                  {'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mentor feedback */}
        <div style={{
          background:'rgba(232,184,75,0.04)',
          border:'1px solid rgba(232,184,75,0.1)',
          borderRadius:'12px',
          padding:'14px',
        }}>
          <div style={{
            fontSize:'11px', color:'rgba(232,184,75,0.6)', marginBottom:'6px',
            fontWeight:500, letterSpacing:'0.04em', textTransform:'uppercase',
          }}>
            Mentor Feedback
          </div>
          <p style={{ fontSize:'12px', color:'rgba(242,240,232,0.5)', margin:0, lineHeight:1.6 }}>
            {entry.mentorComment || 'Your mentor has been notified and will review this entry soon.'}
          </p>
        </div>
      </motion.div>
    </>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function MyEntries() {
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState('all')
  const [selectedEntry, setSelectedEntry] = useState(null)

  const { data: rawEntries, isLoading } = useQuery({
    queryKey: ['my-entries'],
    queryFn: () =>
      api.get('/diary')
        .then(r => r.data?.entries || r.data)
        .catch(() => DEMO_ENTRIES),
  })

  const entries = rawEntries || DEMO_ENTRIES

  const filtered = entries.filter(e => {
    if (filter === 'this-month') {
      const now = new Date()
      const d = new Date(e.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    if (filter === 'high-risk') return e.riskScore >= 70
    if (filter === 'pending') return e.reviewStatus === 'pending'
    return true
  })

  return (
    <motion.div
      initial={reduced ? {} : { opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      exit={reduced ? {} : { opacity:0 }}
      transition={{ duration:0.35, ease:[0.25,0.1,0.25,1] }}
    >
      {/* Global keyframes */}
      <style>{`
        @keyframes flag-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50%       { opacity: 0.8; box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
      `}</style>

      {/* Header row */}
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:'24px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <h1 style={{
            fontFamily:'"Sora",system-ui', fontSize:'24px',
            fontWeight:700, color:'#F2F0E8', margin:0,
          }}>
            My Entries
          </h1>
          <span style={{
            padding:'2px 10px', borderRadius:'999px', fontSize:'12px',
            background:'rgba(232,184,75,0.1)', color:'#E8B84B',
            border:'1px solid rgba(232,184,75,0.2)',
          }}>
            {entries.length}
          </span>
        </div>
        <button style={{
          display:'flex', alignItems:'center', gap:'6px',
          padding:'8px 16px', borderRadius:'12px', fontSize:'12px',
          background:'rgba(232,184,75,0.08)', color:'#E8B84B',
          border:'1px solid rgba(232,184,75,0.2)',
          cursor:'pointer', fontFamily:'inherit',
        }}>
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Filter bar */}
      <div style={{
        display:'flex', gap:'8px', flexWrap:'wrap',
        position:'sticky', top:'60px', zIndex:20,
        background:'rgba(6,6,10,0.9)', backdropFilter:'blur(16px)',
        padding:'10px 0', margin:'-10px 0 24px',
      }}>
        {[
          ['all',          'All'],
          ['this-month',   'This Month'],
          ['high-risk',    'High Risk'],
          ['pending',      'Pending Review'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding:'6px 14px', borderRadius:'999px', fontSize:'12px',
              cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
              background: filter === val ? 'rgba(232,184,75,0.12)' : 'transparent',
              border: `1px solid ${filter === val ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === val ? '#E8B84B' : 'rgba(242,240,232,0.4)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Entries grid */}
      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',
          gap:'16px',
        }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((entry, i) => (
              <EntryCard
                key={entry._id}
                entry={entry}
                delay={i * 0.05}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Slide-over panel */}
      <AnimatePresence>
        {selectedEntry && (
          <SlideOverPanel
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
