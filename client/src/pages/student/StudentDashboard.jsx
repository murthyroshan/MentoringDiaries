import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
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
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { format } from 'date-fns'
import { ArrowRight, TrendingDown, Sparkles, Info } from 'lucide-react'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler)

// ─── Demo / Fallback Data ────────────────────────────────────────────────────

const DEMO_RISK_HISTORY = [45, 38, 52, 41, 35, 28, 32, 23]

const DEMO_ENTRIES = [
  {
    _id: '1',
    week: 14,
    mood: '😊',
    riskScore: 23,
    riskLevel: 'low',
    reflection:
      'Had a productive week overall. Managed to complete all assignments on time and attended all classes.',
    subjectCount: 4,
    createdAt: new Date().toISOString(),
    reviewStatus: 'reviewed',
  },
  {
    _id: '2',
    week: 13,
    mood: '🙂',
    riskScore: 31,
    riskLevel: 'low',
    reflection:
      'Struggled a bit with the advanced topics in CS but got help from peers.',
    subjectCount: 4,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewStatus: 'reviewed',
  },
  {
    _id: '3',
    week: 12,
    mood: '😐',
    riskScore: 48,
    riskLevel: 'medium',
    reflection:
      'Missed two classes due to illness. Need to catch up on the material.',
    subjectCount: 3,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    reviewStatus: 'pending',
  },
]

const DEMO_SESSION = {
  date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  mentorName: 'Dr. Reema',
  time: '3:00 PM',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getRiskColor(score) {
  if (score < 40) return '#3DD68C'
  if (score < 70) return '#F59E0B'
  return '#EF4444'
}

function getRiskLabel(score) {
  if (score < 40) return 'Low Risk'
  if (score < 70) return 'Medium Risk'
  return 'High Risk'
}

function getInitials(name = '') {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0]?.[0] || 'S'
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SkeletonBox = ({ h = 20, w = '100%', r = 8 }) => (
  <div
    style={{
      height: h,
      width: w,
      borderRadius: r,
      background: 'rgba(255,255,255,0.04)',
      animation: 'sdPulse 1.5s ease-in-out infinite',
    }}
  />
)

// ─── Card base style ─────────────────────────────────────────────────────────

const cardStyle = {
  background: '#111118',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  padding: '20px',
  cursor: 'default',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const firstName = user?.name?.split(' ')[0] || 'there'

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['student-overview'],
    queryFn: () => api.get('/analytics/student-overview').then((r) => r.data.data),
    retry: false,
  })

  const { data: growth } = useQuery({
    queryKey: ['student-growth'],
    queryFn: () => api.get('/analytics/student-growth').then((r) => r.data.data),
    retry: false,
  })

  const { data: sessionsData } = useQuery({
    queryKey: ['student-sessions-dashboard'],
    queryFn: () => api.get('/sessions?limit=3').then((r) => r.data),
    retry: false,
  })

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['student-entries-recent'],
    queryFn: () => api.get('/diary?limit=3').then((r) => r.data?.data || r.data?.entries || []),
    retry: false,
  })

  // ── Derived Data with Fallbacks ────────────────────────────────────────────

  const riskScore = overview?.currentRiskScore ?? 23
  const entriesCount = overview?.entriesThisMonth ?? 6
  const streak = overview?.streak ?? 4
  const riskHistory = growth?.riskHistory ?? DEMO_RISK_HISTORY

  const entries = Array.isArray(entriesData) && entriesData.length > 0 ? entriesData : DEMO_ENTRIES

  const sessions = sessionsData?.sessions ?? (Array.isArray(sessionsData) ? sessionsData : [])
  const nextSessionRaw = sessions.find((s) => new Date(s.date || s.scheduledAt) > new Date()) || null
  const nextSession = nextSessionRaw
    ? {
        date: nextSessionRaw.date || nextSessionRaw.scheduledAt,
        mentorName: nextSessionRaw.mentorName || nextSessionRaw.mentor?.name || 'Dr. Reema',
        time: nextSessionRaw.time || '3:00 PM',
      }
    : DEMO_SESSION

  const mentorName = user?.mentorName || overview?.mentorName || 'Dr. Reema'
  const mentorInitials = getInitials(mentorName).toUpperCase()

  const isLoading = overviewLoading || entriesLoading

  // ── Chart Config ───────────────────────────────────────────────────────────

  const chartData = {
    labels: ['Wk 7', 'Wk 8', 'Wk 9', 'Wk 10', 'Wk 11', 'Wk 12', 'Wk 13', 'Wk 14'],
    datasets: [
      {
        data: riskHistory,
        borderColor: '#E8B84B',
        backgroundColor: 'rgba(232,184,75,0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#E8B84B',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.5,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(11,11,17,0.9)',
        borderColor: 'rgba(232,184,75,0.2)',
        borderWidth: 1,
        titleColor: 'rgba(242,240,232,0.5)',
        bodyColor: '#E8B84B',
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(242,240,232,0.25)', font: { size: 10 } },
        border: { color: 'transparent' },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(242,240,232,0.25)', font: { size: 10 } },
        border: { color: 'transparent' },
        min: 0,
        max: 100,
      },
    },
  }

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes sdPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? {} : { opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* ── Greeting Banner ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontFamily: '"Sora",system-ui,sans-serif',
                fontSize: 'clamp(22px,3vw,30px)',
                fontWeight: 700,
                color: '#F2F0E8',
                margin: 0,
              }}
            >
              {getGreeting()}, {firstName} 👋
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '6px 0 0' }}>
              Week 14 · You're on track this semester
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(242,240,232,0.2)', marginTop: '4px' }}>
            {format(new Date(), 'EEEE, MMM d')}
          </span>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '32px',
          }}
        >
          {/* Card 1 — Risk Score */}
          <motion.div
            style={cardStyle}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(242,240,232,0.4)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Risk Score <Info size={12} style={{ opacity: 0.5 }} />
            </div>
            {isLoading ? (
              <>
                <SkeletonBox h={48} r={6} />
                <div style={{ marginTop: '10px' }} />
                <SkeletonBox h={14} w="70%" r={6} />
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: getRiskColor(riskScore),
                    lineHeight: 1,
                  }}
                >
                  {riskScore}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: `${getRiskColor(riskScore)}15`,
                      color: getRiskColor(riskScore),
                      border: `1px solid ${getRiskColor(riskScore)}30`,
                    }}
                  >
                    {getRiskLabel(riskScore)}
                  </span>
                  <TrendingDown size={13} style={{ color: '#3DD68C' }} />
                  <span style={{ fontSize: '11px', color: '#3DD68C' }}>Improving</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '3px',
                    marginTop: '12px',
                    height: '24px',
                  }}
                >
                  {DEMO_RISK_HISTORY.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        borderRadius: '2px',
                        height: `${(v / 100) * 24}px`,
                        background: i === 7 ? getRiskColor(v) : `${getRiskColor(v)}40`,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Card 2 — Entries This Month */}
          <motion.div
            style={cardStyle}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(242,240,232,0.4)',
                marginBottom: '8px',
              }}
            >
              Entries This Month
            </div>
            {isLoading ? (
              <>
                <SkeletonBox h={48} r={6} />
                <div style={{ marginTop: '10px' }} />
                <SkeletonBox h={4} r={999} />
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: '#F2F0E8',
                    lineHeight: 1,
                  }}
                >
                  {entriesCount}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.4)', marginTop: '6px' }}>
                  entries this month
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    height: '4px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '999px',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min((entriesCount / 8) * 100, 100)}%`,
                      height: '100%',
                      background: '#E8B84B',
                      borderRadius: '999px',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(242,240,232,0.3)',
                    marginTop: '6px',
                  }}
                >
                  {Math.max(0, 8 - entriesCount)} more to complete the month
                </div>
              </>
            )}
          </motion.div>

          {/* Card 3 — Streak */}
          <motion.div
            style={cardStyle}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(242,240,232,0.4)',
                marginBottom: '8px',
              }}
            >
              Streak
            </div>
            {isLoading ? (
              <>
                <SkeletonBox h={48} r={6} />
                <div style={{ marginTop: '10px' }} />
                <SkeletonBox h={20} r={999} />
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: '#E8B84B',
                    lineHeight: 1,
                  }}
                >
                  🔥 {streak}
                </div>
                <div
                  style={{ fontSize: '12px', color: 'rgba(242,240,232,0.4)', marginTop: '8px' }}
                >
                  week streak
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background:
                          i < streak
                            ? 'rgba(232,184,75,0.2)'
                            : 'rgba(255,255,255,0.04)',
                        border:
                          i < streak
                            ? '1px solid rgba(232,184,75,0.4)'
                            : '1px solid rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Card 4 — Next Session */}
          <motion.div
            style={cardStyle}
            whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.1)', y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(242,240,232,0.4)',
                marginBottom: '8px',
              }}
            >
              Next session
            </div>
            {isLoading ? (
              <>
                <SkeletonBox h={22} w="80%" r={6} />
                <div style={{ marginTop: '8px' }} />
                <SkeletonBox h={14} w="50%" r={6} />
                <div style={{ marginTop: '10px' }} />
                <SkeletonBox h={28} w="60%" r={8} />
              </>
            ) : nextSession ? (
              <>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#F2F0E8' }}>
                  {format(new Date(nextSession.date), 'EEE, MMM d')}
                </div>
                <div
                  style={{ fontSize: '13px', color: 'rgba(242,240,232,0.5)', marginTop: '2px' }}
                >
                  {nextSession.time || '3:00 PM'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(232,184,75,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#E8B84B',
                    }}
                  >
                    {nextSession.mentorName?.[0] || 'M'}
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.4)' }}>
                    {nextSession.mentorName || 'Dr. Reema'}
                  </span>
                </div>
                <button
                  style={{
                    marginTop: '10px',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    background: 'rgba(232,184,75,0.1)',
                    color: '#E8B84B',
                    border: '1px solid rgba(232,184,75,0.2)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  View details
                </button>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'rgba(242,240,232,0.25)' }}>
                No upcoming sessions
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Main 2-col Grid ───────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {/* ── Left Column ─────────────────────────────────────────────────── */}
          <div>
            {/* Recent Entries header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#F2F0E8' }}>
                Recent Entries
              </span>
              <button
                onClick={() => navigate('/my-entries')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#E8B84B',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'inherit',
                }}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {/* Entry cards */}
            {entriesLoading ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '12px',
                  }}
                >
                  <SkeletonBox h={14} w="55%" r={6} />
                  <div style={{ marginTop: '12px' }} />
                  <SkeletonBox h={12} r={6} />
                  <div style={{ marginTop: '6px' }} />
                  <SkeletonBox h={12} w="80%" r={6} />
                </div>
              ))
            ) : (
              entries.slice(0, 3).map((entry, i) => (
                <motion.div
                  key={entry._id}
                  initial={reduced ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  whileHover={reduced ? {} : { borderColor: 'rgba(255,255,255,0.1)' }}
                  style={{
                    background: '#111118',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/my-entries')}
                >
                  {/* Top row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        background: 'rgba(232,184,75,0.1)',
                        color: '#E8B84B',
                        border: '1px solid rgba(232,184,75,0.2)',
                        fontWeight: 500,
                      }}
                    >
                      Week {entry.week}
                    </span>
                    <span style={{ fontSize: '24px' }}>{entry.mood || '🙂'}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: 'rgba(242,240,232,0.3)',
                      }}
                    >
                      {format(new Date(entry.createdAt), 'MMM d')}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: `${getRiskColor(entry.riskScore)}15`,
                        color: getRiskColor(entry.riskScore),
                        border: `1px solid ${getRiskColor(entry.riskScore)}25`,
                      }}
                    >
                      {getRiskLabel(entry.riskScore)}
                    </span>
                  </div>

                  {/* Reflection preview */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'rgba(242,240,232,0.5)',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                    }}
                  >
                    {entry.reflection}
                  </p>

                  {/* Bottom row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.3)' }}>
                      {entry.subjectCount || 4} subjects rated
                    </span>
                    <span style={{ fontSize: '11px', color: '#E8B84B' }}>View entry →</span>
                  </div>
                </motion.div>
              ))
            )}

            {/* AI Insights */}
            <div style={{ marginTop: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#F2F0E8' }}>
                  AI Insights
                </span>
                <Sparkles size={14} style={{ color: '#E8B84B' }} />
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(242,240,232,0.4)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  This week
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                }}
              >
                {[
                  { icon: '📈', text: 'Risk improved 8 points since last week' },
                  { icon: '✅', text: 'Attendance consistent — great work' },
                  { icon: '💬', text: 'Mentor responded to your last entry' },
                ].map((chip, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{chip.icon}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'rgba(242,240,232,0.6)',
                        lineHeight: 1.4,
                      }}
                    >
                      {chip.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column ─────────────────────────────────────────────────── */}
          <div>
            {/* Risk Trend Chart */}
            <div
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(242,240,232,0.7)',
                  marginBottom: '14px',
                }}
              >
                Risk Trend
              </div>
              <Line data={chartData} options={chartOptions} />
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <TrendingDown size={13} style={{ color: '#3DD68C' }} />
                <span style={{ fontSize: '11px', color: '#3DD68C' }}>
                  23% lower than last month
                </span>
              </div>
            </div>

            {/* Mentor Card */}
            <div
              style={{
                background: '#111118',
                border: '1px solid rgba(232,184,75,0.08)',
                borderRadius: '16px',
                padding: '20px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(242,240,232,0.7)',
                  marginBottom: '14px',
                }}
              >
                Your Mentor
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: 'rgba(232,184,75,0.12)',
                    border: '1.5px solid rgba(232,184,75,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#E8B84B',
                  }}
                >
                  {mentorInitials}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#F2F0E8' }}>
                    {mentorName}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 8px',
                      borderRadius: '999px',
                      background: 'rgba(232,184,75,0.1)',
                      color: '#E8B84B',
                    }}
                  >
                    Mentor
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '12px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(242,240,232,0.5)',
                    margin: 0,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  Great work this week! Your consistency has improved significantly. Keep up the
                  effort with attendance.
                </p>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(242,240,232,0.25)',
                  marginTop: '6px',
                }}
              >
                3 days ago
              </div>
              <button
                onClick={() => navigate('/my-entries')}
                style={{
                  marginTop: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#E8B84B',
                  fontFamily: 'inherit',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                View feedback <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
