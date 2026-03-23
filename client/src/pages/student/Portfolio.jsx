import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Legend,
} from 'chart.js'
import { Download, ExternalLink, Award, TrendingUp, Flame } from 'lucide-react'
import { format } from 'date-fns'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler, Legend)

function SkeletonBox({ h = 20, w = '100%', r = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'rgba(255,255,255,0.04)',
      animation: 'pfPulse 1.5s ease-in-out infinite',
    }} />
  )
}

function getRiskColor(score) {
  if (score < 40) return '#3DD68C'
  if (score < 70) return '#F59E0B'
  return '#EF4444'
}

const MOOD_EMOJI = {
  amazing: '🤩', great: '😊', good: '🙂',
  okay: '😐', tough: '😔',
  5: '🤩', 4: '😊', 3: '🙂', 2: '😐', 1: '😔',
}
function getMoodEmoji(mood) {
  return MOOD_EMOJI[mood] ?? (mood && String(mood).length <= 2 ? mood : '😐')
}

function getRiskLabel(score) {
  if (score < 40) return 'Low'
  if (score < 70) return 'Medium'
  return 'High'
}

function getInitials(name = '') {
  const p = name.trim().split(' ')
  return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0]?.[0] || 'S'
}

const CHART_OPTIONS = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { color: 'rgba(242,240,232,0.4)', font: { size: 11 }, boxWidth: 20, padding: 16 } },
    tooltip: { backgroundColor: 'rgba(11,11,17,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: 'rgba(242,240,232,0.5)', bodyColor: 'rgba(242,240,232,0.8)', padding: 10 },
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(242,240,232,0.2)', font: { size: 10 } }, border: { color: 'transparent' } },
    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(242,240,232,0.2)', font: { size: 10 } }, border: { color: 'transparent' }, min: 0, max: 100 },
  },
}

export default function Portfolio() {
  const { user } = useAuthStore()
  const reduced = useReducedMotion()

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/analytics/portfolio').then(r => r.data),
  })

  const portfolio = response?.data ?? null

  const chartData = portfolio ? {
    labels: portfolio.riskTrend.map(p => p.weekLabel),
    datasets: [
      {
        label: 'Risk Score',
        data: portfolio.riskTrend.map(p => p.riskScore),
        borderColor: '#E8B84B', backgroundColor: 'rgba(232,184,75,0.05)',
        tension: 0.4, fill: false, pointBackgroundColor: '#E8B84B', pointRadius: 3, borderWidth: 1.5,
      },
      {
        label: 'Sentiment Score',
        data: portfolio.riskTrend.map(p => p.sentimentScore),
        borderColor: '#3DD68C', backgroundColor: 'rgba(61,214,140,0.05)',
        tension: 0.4, fill: false, pointBackgroundColor: '#3DD68C', pointRadius: 3, borderWidth: 1.5,
      },
    ],
  } : null

  const avgRisk = portfolio?.summary?.averageRiskScore ?? 0

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <style>{`@keyframes pfPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: '"Sora",system-ui', fontSize: '24px', fontWeight: 700, color: '#F2F0E8', margin: 0 }}>Portfolio</h1>
          <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '6px 0 0' }}>
            {portfolio ? `${portfolio.summary.academicYear} · ${portfolio.summary.totalEntries} entries` : 'Your semester journey'}
          </p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
          borderRadius: '12px', fontSize: '12px', background: 'rgba(232,184,75,0.1)',
          color: '#E8B84B', border: '1px solid rgba(232,184,75,0.2)', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px',
        }}>
          <p style={{ color: 'rgba(239,68,68,0.8)', fontSize: '14px', margin: '0 0 12px' }}>Failed to load portfolio data.</p>
          <button onClick={() => refetch()} style={{
            padding: '8px 20px', borderRadius: '10px', fontSize: '13px',
            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontFamily: 'inherit',
          }}>Retry</button>
        </div>
      )}

      {/* Summary hero card */}
      <div style={{
        background: 'linear-gradient(135deg,#111118 0%,#16161F 100%)',
        border: '1px solid rgba(232,184,75,0.08)', borderRadius: '24px',
        padding: '32px', marginBottom: '24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Award size={16} style={{ color: '#E8B84B' }} />
              <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entries</span>
            </div>
            {isLoading ? <SkeletonBox h={42} r={6} /> : (
              <>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#F2F0E8', lineHeight: 1 }}>{portfolio?.summary?.totalEntries ?? 0}</div>
                <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.35)', marginTop: '4px' }}>this semester</div>
              </>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={16} style={{ color: getRiskColor(avgRisk) }} />
              <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Risk</span>
            </div>
            {isLoading ? <SkeletonBox h={42} r={6} /> : (
              <>
                <div style={{ fontSize: '36px', fontWeight: 900, color: getRiskColor(avgRisk), lineHeight: 1 }}>{avgRisk}</div>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '999px', marginTop: '4px', display: 'inline-block',
                  background: `${getRiskColor(avgRisk)}15`, color: getRiskColor(avgRisk), border: `1px solid ${getRiskColor(avgRisk)}25`,
                }}>{getRiskLabel(avgRisk)} Risk</span>
              </>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Flame size={16} style={{ color: '#E8B84B' }} />
              <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Streak</span>
            </div>
            {isLoading ? <SkeletonBox h={42} r={6} /> : (
              <>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#E8B84B', lineHeight: 1 }}>🔥 {portfolio?.summary?.currentStreak ?? 0}</div>
                <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.35)', marginTop: '4px' }}>weeks</div>
              </>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0 20px' }} />

        <div style={{ borderLeft: '3px solid rgba(232,184,75,0.4)', paddingLeft: '16px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(232,184,75,0.6)', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Summary</div>
          {isLoading
            ? <><SkeletonBox h={13} r={4} /><div style={{ marginTop: 6 }} /><SkeletonBox h={13} w="80%" r={4} /></>
            : <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.55)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>{portfolio?.aiSummary}</p>
          }
        </div>
      </div>

      {/* Growth chart */}
      {(isLoading || chartData) && (
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', marginBottom: '16px' }}>Growth Chart</div>
          {isLoading
            ? <SkeletonBox h={120} r={8} />
            : chartData && <Line height={50} data={chartData} options={CHART_OPTIONS} />
          }
        </div>
      )}

      {/* Subject performance */}
      {!isLoading && portfolio?.subjectPerformance?.length > 0 && (
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', marginBottom: '14px' }}>Subject Performance</div>
          {portfolio.subjectPerformance.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(242,240,232,0.7)', flex: 1 }}>{s.subject}</span>
              <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px' }}>
                <div style={{ width: `${(s.avgRating / 5) * 100}%`, height: '100%', background: '#E8B84B', borderRadius: '999px' }} />
              </div>
              <span style={{ fontSize: '12px', color: '#E8B84B', width: '28px', textAlign: 'right' }}>{s.avgRating}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent entries grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', marginBottom: '14px' }}>Recent Entries</div>
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px' }}>
            {[...Array(6)].map((_, i) => <SkeletonBox key={i} h={100} r={14} />)}
          </div>
        ) : (portfolio?.recentEntries ?? []).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(242,240,232,0.25)', fontSize: '13px' }}>
            No entries yet. Submit your first diary entry to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px' }}>
            {(portfolio?.recentEntries ?? []).map((entry, i) => (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.1)' }}
                style={{ background: '#0C0C12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px', cursor: 'pointer', transition: 'border-color 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{getMoodEmoji(entry.mood)}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(232,184,75,0.8)' }}>Wk {entry.week}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: `${getRiskColor(entry.riskScore)}15`, color: getRiskColor(entry.riskScore) }}>{entry.riskScore}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(242,240,232,0.45)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {entry.reflection}
                </p>
                <div style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)', marginTop: '8px' }}>
                  {format(new Date(entry.createdAt), 'MMM d')}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Export section */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#F2F0E8', marginBottom: '6px' }}>Share your journey</div>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '0 0 20px' }}>Export your portfolio for academic records or share with your institution</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', fontSize: '13px', background: 'linear-gradient(135deg,#E8B84B,#F5D380)', color: '#06060A', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={16} /> Export as PDF
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', fontSize: '13px', background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,232,0.6)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'inherit' }}>
            <ExternalLink size={16} /> Copy shareable link
          </button>
        </div>
        <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '64px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '8px', color: 'rgba(242,240,232,0.2)', textAlign: 'center', lineHeight: 1.3 }}>PDF<br />Preview</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.5)' }}>MentoringDiaries Portfolio</div>
            <div style={{ fontSize: '11px', color: 'rgba(242,240,232,0.25)', marginTop: '2px' }}>
              {user?.name || 'Student'} · {portfolio?.summary?.academicYear ?? '—'} · {portfolio?.summary?.totalEntries ?? 0} entries
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
