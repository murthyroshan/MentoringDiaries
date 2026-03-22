import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { format } from 'date-fns'
import api from '../../services/api'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler)

// ── Demo fallback data ─────────────────────────────────────────────────────────
const DEMO_ENTRIES = [
  { _id:'1', week:14, mood:'😊', riskScore:23, reflection:'Productive week. All assignments submitted on time. Feeling great about progress.', createdAt:new Date().toISOString(), mentorComment:'Excellent work this week!' },
  { _id:'2', week:13, mood:'🙂', riskScore:31, reflection:'Good week overall. Some challenges in CS but managed to resolve them.', createdAt:new Date(Date.now()-7*86400000).toISOString() },
  { _id:'3', week:12, mood:'😐', riskScore:48, reflection:'Missed classes due to illness. Catching up on material.', createdAt:new Date(Date.now()-14*86400000).toISOString(), mentorComment:'Hope you feel better! Remember to rest.' },
  { _id:'4', week:11, mood:'😊', riskScore:25, reflection:'Productive session with Dr. Reema. Submitted everything on time.', createdAt:new Date(Date.now()-21*86400000).toISOString() },
  { _id:'5', week:10, mood:'😔', riskScore:72, reflection:'Difficult week with multiple overlapping deadlines.', createdAt:new Date(Date.now()-28*86400000).toISOString(), mentorComment:"Let's discuss time management in our next session." },
  { _id:'6', week:9, mood:'🙂', riskScore:38, reflection:'Steady week, consistent attendance, completed lab reports.', createdAt:new Date(Date.now()-35*86400000).toISOString() },
]

const RISK_HISTORY  = [45,38,52,41,35,28,32,23,48,31,25,72,38,23]
const WEEK_LABELS   = ['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7','Wk 8','Wk 9','Wk 10','Wk 11','Wk 12','Wk 13','Wk 14']

// ── Helpers ────────────────────────────────────────────────────────────────────
function getRiskColor(score) {
  if (score < 40) return '#3DD68C'
  if (score < 70) return '#F59E0B'
  return '#EF4444'
}

// ── Timeline Node ──────────────────────────────────────────────────────────────
function TimelineNode({ entry, isLatest }) {
  return (
    <div style={{ position:'relative', zIndex:2, flexShrink:0 }}>
      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(61,214,140,0.3), 0 0 12px rgba(61,214,140,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(61,214,140,0.1), 0 0 20px rgba(61,214,140,0.2); }
        }
      `}</style>
      <div style={{
        width:'14px', height:'14px', borderRadius:'50%',
        background: getRiskColor(entry.riskScore),
        border:'2px solid #06060A',
        boxShadow: isLatest
          ? `0 0 0 3px ${getRiskColor(entry.riskScore)}30, 0 0 12px ${getRiskColor(entry.riskScore)}40`
          : 'none',
        animation: isLatest ? 'node-pulse 2s ease-in-out infinite' : 'none',
      }} />
    </div>
  )
}

// ── Timeline Card ──────────────────────────────────────────────────────────────
function TimelineCard({ entry, isExpanded, onToggle }) {
  return (
    <motion.div
      layout
      onClick={onToggle}
      style={{
        width:'280px',
        background:'#111118',
        border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:'16px',
        padding:'16px',
        cursor:'pointer',
        transition:'border-color 0.2s',
      }}
      whileHover={{ borderColor:'rgba(255,255,255,0.1)' }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
        <span style={{ fontSize:'14px', fontWeight:600, color:'#F2F0E8' }}>
          Week {entry.week}
        </span>
        <span style={{ fontSize:'18px' }}>{entry.mood}</span>
        <span style={{
          marginLeft:'auto', padding:'1px 7px', borderRadius:'999px', fontSize:'10px',
          background:`${getRiskColor(entry.riskScore)}15`,
          color:getRiskColor(entry.riskScore),
          border:`1px solid ${getRiskColor(entry.riskScore)}25`,
        }}>
          {entry.riskScore}
        </span>
      </div>

      {/* Date */}
      <div style={{ fontSize:'10px', color:'rgba(242,240,232,0.3)', marginBottom:'10px' }}>
        {format(new Date(entry.createdAt), 'MMMM d, yyyy')}
      </div>

      {/* Reflection — clipped or full */}
      <p style={{
        fontSize:'12px', color:'rgba(242,240,232,0.5)', margin:0, lineHeight:1.5,
        display: isExpanded ? 'block' : '-webkit-box',
        WebkitLineClamp: isExpanded ? undefined : 2,
        WebkitBoxOrient: isExpanded ? undefined : 'vertical',
        overflow: isExpanded ? 'visible' : 'hidden',
      }}>
        {entry.reflection}
      </p>

      {/* Expanded mentor comment */}
      <AnimatePresence>
        {isExpanded && entry.mentorComment && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden' }}
          >
            <div style={{
              marginTop:'12px', padding:'10px',
              background:'rgba(232,184,75,0.04)',
              borderRadius:'8px',
              borderLeft:'2px solid rgba(232,184,75,0.3)',
            }}>
              <div style={{
                fontSize:'10px', color:'rgba(232,184,75,0.6)',
                marginBottom:'4px', fontWeight:500,
              }}>
                Mentor Comment
              </div>
              <p style={{
                fontSize:'11px', color:'rgba(242,240,232,0.55)',
                margin:0, lineHeight:1.5,
              }}>
                {entry.mentorComment}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Risk Chart ─────────────────────────────────────────────────────────────────
function RiskChart() {
  return (
    <div style={{
      background:'#111118',
      border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:'16px',
      padding:'20px',
      marginBottom:'32px',
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:'14px',
      }}>
        <span style={{ fontSize:'14px', fontWeight:500, color:'rgba(242,240,232,0.7)' }}>
          Risk Score — Last 14 Weeks
        </span>
        <span style={{ fontSize:'12px', color:'#3DD68C' }}>↓ Trending down</span>
      </div>
      <Line
        height={60}
        data={{
          labels: WEEK_LABELS,
          datasets: [{
            data: RISK_HISTORY,
            borderColor: '#E8B84B',
            backgroundColor: 'rgba(232,184,75,0.06)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: RISK_HISTORY.map(v => getRiskColor(v)),
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 1.5,
          }],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(11,11,17,0.95)',
              borderColor: 'rgba(232,184,75,0.2)',
              borderWidth: 1,
              titleColor: 'rgba(242,240,232,0.5)',
              bodyColor: '#E8B84B',
              padding: 10,
              callbacks: {
                title:  (items) => `Week ${items[0].dataIndex + 1}`,
                label:  (item)  => `Risk Score: ${item.raw}`,
              },
            },
          },
          scales: {
            x: {
              grid:   { color:'rgba(255,255,255,0.03)' },
              ticks:  { color:'rgba(242,240,232,0.2)', font:{ size:9 } },
              border: { color:'transparent' },
            },
            y: {
              grid:   { color:'rgba(255,255,255,0.03)' },
              ticks:  { color:'rgba(242,240,232,0.2)', font:{ size:9 } },
              border: { color:'transparent' },
              min: 0,
              max: 100,
            },
          },
        }}
      />
    </div>
  )
}

// ── Vertical Timeline ──────────────────────────────────────────────────────────
function VerticalTimeline({ entries, expandedId, setExpandedId }) {
  return (
    <div style={{ position:'relative' }}>
      {/* Center spine */}
      <div style={{
        position:'absolute', left:'50%', top:0, bottom:0,
        width:'2px', background:'rgba(255,255,255,0.05)',
        transform:'translateX(-50%)',
      }} />

      {entries.map((entry, i) => {
        const isLeft    = i % 2 === 0
        const isExpanded = expandedId === entry._id
        const isLatest  = i === 0

        return (
          <div
            key={entry._id}
            style={{
              display:'flex', alignItems:'flex-start',
              marginBottom:'32px', position:'relative',
            }}
          >
            {isLeft ? (
              <>
                <div style={{ flex:1, display:'flex', justifyContent:'flex-end', paddingRight:'32px' }}>
                  <TimelineCard
                    entry={entry}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : entry._id)}
                    isLeft={true}
                  />
                </div>
                <TimelineNode entry={entry} isLatest={isLatest} />
                <div style={{ flex:1 }} />
              </>
            ) : (
              <>
                <div style={{ flex:1 }} />
                <TimelineNode entry={entry} isLatest={isLatest} />
                <div style={{ flex:1, display:'flex', justifyContent:'flex-start', paddingLeft:'32px' }}>
                  <TimelineCard
                    entry={entry}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : entry._id)}
                    isLeft={false}
                  />
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function StudentTimeline() {
  const reduced = useReducedMotion()
  const [expandedId, setExpandedId] = useState(null)

  const { data: rawEntries } = useQuery({
    queryKey: ['timeline-entries'],
    queryFn: () =>
      api.get('/diary')
        .then(r => r.data?.entries || r.data)
        .catch(() => DEMO_ENTRIES),
  })

  const entries = rawEntries || DEMO_ENTRIES

  return (
    <motion.div
      initial={reduced ? {} : { opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      exit={reduced ? {} : { opacity:0 }}
      transition={{ duration:0.35, ease:[0.25,0.1,0.25,1] }}
    >
      {/* Page header */}
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{
          fontFamily:'"Sora",system-ui', fontSize:'24px',
          fontWeight:700, color:'#F2F0E8', margin:0,
        }}>
          Timeline
        </h1>
        <p style={{ fontSize:'13px', color:'rgba(242,240,232,0.4)', margin:'6px 0 0' }}>
          Your journey, visualized
        </p>
      </div>

      {/* Risk chart */}
      <RiskChart />

      {/* Vertical timeline */}
      <VerticalTimeline
        entries={entries}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
      />
    </motion.div>
  )
}
