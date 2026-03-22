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

const DEMO_PORTFOLIO = {
  semester: 'Spring 2025',
  entries: 14,
  avgRisk: 32,
  streak: 14,
  riskTrend: [45, 38, 52, 41, 35, 28, 32, 23, 48, 31, 25, 38, 35, 32],
  sentimentTrend: [55, 62, 48, 70, 75, 80, 72, 85, 65, 78, 82, 70, 75, 80],
  weekLabels: Array.from({ length: 14 }, (_, i) => `Wk ${i + 1}`),
  aiSummary:
    'This semester, you have shown consistent growth and dedication. Your risk scores have improved significantly over the past 6 weeks, reflecting better time management and academic engagement. Your attendance has been strong, and your mentor feedback has been predominantly positive. Keep up this momentum into the final weeks.',
  recentEntries: [
    {
      _id: '1',
      week: 14,
      mood: '😊',
      riskScore: 23,
      reflection: 'Productive week with strong academic performance.',
      createdAt: new Date().toISOString(),
    },
    {
      _id: '2',
      week: 13,
      mood: '🙂',
      riskScore: 31,
      reflection: 'Good week with consistent effort across all subjects.',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      _id: '3',
      week: 12,
      mood: '😐',
      riskScore: 48,
      reflection: 'Challenging week due to health issues.',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      _id: '4',
      week: 11,
      mood: '😊',
      riskScore: 25,
      reflection: 'Great session with mentor. Progress on track.',
      createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    },
    {
      _id: '5',
      week: 10,
      mood: '😔',
      riskScore: 72,
      reflection: 'Difficult week with deadline overlaps.',
      createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
    {
      _id: '6',
      week: 9,
      mood: '🙂',
      riskScore: 38,
      reflection: 'Steady and consistent week.',
      createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    },
  ],
}

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

function getInitials(name = '') {
  const p = name.trim().split(' ')
  return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0]?.[0] || 'S'
}

export default function Portfolio() {
  const { user } = useAuthStore()
  const reduced = useReducedMotion()

  const { data: portfolioData } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () =>
      api.get('/analytics/portfolio').then(r => r.data?.data).catch(() => DEMO_PORTFOLIO),
  })

  const data = portfolioData || DEMO_PORTFOLIO

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Page header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '28px',
      }}>
        <div>
          <h1 style={{
            fontFamily: '"Sora",system-ui', fontSize: '24px', fontWeight: 700,
            color: '#F2F0E8', margin: 0,
          }}>Portfolio</h1>
          <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '6px 0 0' }}>
            Your semester journey
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px', padding: '8px 14px', fontSize: '12px',
            color: 'rgba(242,240,232,0.6)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            <option>Spring 2025</option>
            <option>Fall 2024</option>
          </select>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '12px', fontSize: '12px', background: 'rgba(232,184,75,0.1)',
            color: '#E8B84B', border: '1px solid rgba(232,184,75,0.2)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary hero card */}
      <div style={{
        background: 'linear-gradient(135deg,#111118 0%,#16161F 100%)',
        border: '1px solid rgba(232,184,75,0.08)', borderRadius: '24px',
        padding: '32px', marginBottom: '24px',
      }}>
        {/* 3-col stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: '24px', marginBottom: '24px',
        }}>
          {/* Entries stat */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Award size={16} style={{ color: '#E8B84B' }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Entries</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#F2F0E8', lineHeight: 1 }}>
              {data.entries}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.35)', marginTop: '4px' }}>
              this semester
            </div>
          </div>

          {/* Avg Risk stat */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={16} style={{ color: getRiskColor(data.avgRisk) }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Avg Risk</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: getRiskColor(data.avgRisk), lineHeight: 1 }}>
              {data.avgRisk}
            </div>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
              marginTop: '4px', display: 'inline-block',
              background: `${getRiskColor(data.avgRisk)}15`, color: getRiskColor(data.avgRisk),
              border: `1px solid ${getRiskColor(data.avgRisk)}25`,
            }}>{getRiskLabel(data.avgRisk)} Risk</span>
          </div>

          {/* Streak stat */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Flame size={16} style={{ color: '#E8B84B' }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,240,232,0.4)', fontWeight: 500,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Streak</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#E8B84B', lineHeight: 1 }}>
              🔥 {data.streak}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.35)', marginTop: '4px' }}>
              weeks
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0 20px' }} />

        {/* AI summary */}
        <div style={{ borderLeft: '3px solid rgba(232,184,75,0.4)', paddingLeft: '16px' }}>
          <div style={{
            fontSize: '11px', color: 'rgba(232,184,75,0.6)', marginBottom: '8px',
            fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            AI Summary
          </div>
          <p style={{
            fontSize: '13px', color: 'rgba(242,240,232,0.55)',
            lineHeight: 1.7, margin: 0, fontStyle: 'italic',
          }}>
            {data.aiSummary}
          </p>
        </div>
      </div>

      {/* Growth chart */}
      <div style={{
        background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', marginBottom: '16px' }}>
          Growth Chart
        </div>
        <Line
          height={50}
          data={{
            labels: data.weekLabels,
            datasets: [
              {
                label: 'Risk Score',
                data: data.riskTrend,
                borderColor: '#E8B84B',
                backgroundColor: 'rgba(232,184,75,0.05)',
                tension: 0.4,
                fill: false,
                pointBackgroundColor: '#E8B84B',
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 1.5,
              },
              {
                label: 'Sentiment Score',
                data: data.sentimentTrend,
                borderColor: '#3DD68C',
                backgroundColor: 'rgba(61,214,140,0.05)',
                tension: 0.4,
                fill: false,
                pointBackgroundColor: '#3DD68C',
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 1.5,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  color: 'rgba(242,240,232,0.4)',
                  font: { size: 11 },
                  boxWidth: 20,
                  padding: 16,
                },
              },
              tooltip: {
                backgroundColor: 'rgba(11,11,17,0.95)',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                titleColor: 'rgba(242,240,232,0.5)',
                bodyColor: 'rgba(242,240,232,0.8)',
                padding: 10,
              },
            },
            scales: {
              x: {
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: { color: 'rgba(242,240,232,0.2)', font: { size: 10 } },
                border: { color: 'transparent' },
              },
              y: {
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: { color: 'rgba(242,240,232,0.2)', font: { size: 10 } },
                border: { color: 'transparent' },
                min: 0,
                max: 100,
              },
            },
          }}
        />
      </div>

      {/* Mini entry grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', marginBottom: '14px' }}>
          All Entries
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
          gap: '12px',
        }}>
          {(data.recentEntries ?? []).map((entry, i) => (
            <motion.div
              key={entry._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.1)' }}
              style={{
                background: '#0C0C12', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px', padding: '14px', cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>{entry.mood}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(232,184,75,0.8)' }}>
                  Wk {entry.week}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: '10px', padding: '1px 6px', borderRadius: '999px',
                  background: `${getRiskColor(entry.riskScore)}15`, color: getRiskColor(entry.riskScore),
                }}>{entry.riskScore}</span>
              </div>
              <p style={{
                fontSize: '11px', color: 'rgba(242,240,232,0.45)', margin: 0, lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {entry.reflection}
              </p>
              <div style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)', marginTop: '8px' }}>
                {format(new Date(entry.createdAt), 'MMM d')}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Export section */}
      <div style={{
        background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px', padding: '28px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#F2F0E8', marginBottom: '6px' }}>
          Share your journey
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', margin: '0 0 20px' }}>
          Export your portfolio for academic records or share with your institution
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '14px', fontSize: '13px',
            background: 'linear-gradient(135deg,#E8B84B,#F5D380)', color: '#06060A',
            fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Download size={16} /> Export as PDF
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '14px', fontSize: '13px',
            background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,232,0.6)',
            border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <ExternalLink size={16} /> Copy shareable link
          </button>
        </div>

        {/* PDF preview mockup */}
        <div style={{
          marginTop: '20px', background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px',
          padding: '16px', display: 'flex', gap: '12px', alignItems: 'center',
        }}>
          <div style={{
            width: '48px', height: '64px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ fontSize: '8px', color: 'rgba(242,240,232,0.2)', textAlign: 'center', lineHeight: 1.3 }}>
              PDF<br />Preview
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.5)' }}>
              MentoringDiaries Portfolio
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(242,240,232,0.25)', marginTop: '2px' }}>
              {user?.name || 'Student'} · {data.semester} · {data.entries} entries
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
