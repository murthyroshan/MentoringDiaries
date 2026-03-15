import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, AlertTriangle, Tag, TrendingUp } from 'lucide-react'
import RiskBadge from '../ui/RiskBadge'
import SentimentChip from '../ui/SentimentChip'

function SentimentMeter({ score }) {
    // score is -1 to 1; center at 50%
    const pct = ((score + 1) / 2) * 100
    const color = score > 0.2 ? '#22c55e' : score < -0.2 ? '#ef4444' : '#6366f1'
    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
                <span>Negative</span>
                <span>Sentiment Score</span>
                <span>Positive</span>
            </div>
            <div className="relative h-2 rounded-full" style={{ background: 'rgb(var(--bg-secondary))' }}>
                <motion.div
                    initial={{ width: '50%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-2 rounded-full"
                    style={{ background: `linear-gradient(90deg, #ef4444, ${color})` }}
                />
                <motion.div
                    initial={{ left: '50%' }}
                    animate={{ left: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
                    style={{ background: color }}
                />
            </div>
            <p className="text-center text-xs font-medium mt-1" style={{ color }}>
                {score > 0 ? '+' : ''}{score?.toFixed(2)}
            </p>
        </div>
    )
}

function RiskGauge({ score }) {
    const angle = (score / 100) * 180 - 90 // -90 to 90 degrees
    const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 25 ? '#eab308' : '#22c55e'
    return (
        <div className="flex flex-col items-center mb-3">
            <svg viewBox="0 0 100 60" className="w-28">
                {/* Background arc */}
                <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="rgb(var(--bg-secondary))" strokeWidth="8" strokeLinecap="round" />
                {/* Colored arc */}
                <motion.path
                    d="M10,50 A40,40 0 0,1 90,50"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 125.6} 125.6`}
                    initial={{ strokeDasharray: "0 125.6" }}
                    animate={{ strokeDasharray: `${(score / 100) * 125.6} 125.6` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                {/* Needle */}
                <motion.line
                    x1="50" y1="50" x2="50" y2="18"
                    stroke={color} strokeWidth="2" strokeLinecap="round"
                    initial={{ rotate: -90 }}
                    animate={{ rotate: angle }}
                    style={{ transformOrigin: '50px 50px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <circle cx="50" cy="50" r="3" fill={color} />
            </svg>
            <p className="text-xl font-bold" style={{ color }}>{score}</p>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Risk Score / 100</p>
        </div>
    )
}

export default function AIAnalysisPanel({ analysis, loading }) {
    const [open, setOpen] = useState(true)

    if (loading) {
        return (
            <div className="glass-card p-5">
                <div className="skeleton h-4 w-32 mb-4" />
                <div className="skeleton h-28 w-full mb-3" />
                <div className="skeleton h-4 w-48 mb-2" />
                <div className="skeleton h-4 w-36" />
            </div>
        )
    }

    if (!analysis) return null

    const kwDanger = analysis.keywords?.filter(k => k.severity === 'danger') || []
    const kwWarning = analysis.keywords?.filter(k => k.severity === 'warning') || []
    const kwOther = analysis.keywords?.filter(k => k.severity !== 'danger' && k.severity !== 'warning') || []

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5"
                style={{ borderBottom: open ? '1px solid rgb(var(--border-color))' : 'none' }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                        <Sparkles size={13} color="white" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                        AI Analysis
                    </span>
                    {analysis.analysisVersion && (
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.65rem' }}>
                            {analysis.analysisVersion}
                        </span>
                    )}
                </div>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} />
                </motion.div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 space-y-5">
                            {/* Sentiment */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>Sentiment</p>
                                    <SentimentChip sentiment={analysis.sentiment} />
                                </div>
                                <SentimentMeter score={analysis.sentimentScore || 0} />
                            </div>

                            {/* Risk Gauge */}
                            <div style={{ borderTop: '1px solid rgb(var(--border-color))', paddingTop: '1rem' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>Risk Assessment</p>
                                    <RiskBadge level={analysis.riskLevel} />
                                </div>
                                <RiskGauge score={analysis.riskScore || 0} />
                                {analysis.historicalRiskFactor > 0 && (
                                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgb(var(--bg-secondary))' }}>
                                        <TrendingUp size={14} style={{ color: 'rgb(249,115,22)' }} />
                                        <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                                            Historical: {Math.round(analysis.historicalRiskFactor * 100)}% negative last 4 weeks
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            {analysis.summary && (
                                <div style={{ borderTop: '1px solid rgb(var(--border-color))', paddingTop: '1rem' }}>
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>AI Summary</p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>{analysis.summary}</p>
                                    {analysis.confidence !== undefined && (
                                        <p className="text-[11px] mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
                                            AI confidence: {analysis.confidence >= 0.75 ? 'High' : analysis.confidence >= 0.6 ? 'Medium' : 'Low'} ({Number(analysis.confidence).toFixed(2)})
                                        </p>
                                    )}
                                </div>
                            )}

                            {Array.isArray(analysis.keyConcerns) && analysis.keyConcerns.length > 0 && (
                                <div style={{ borderTop: '1px solid rgb(var(--border-color))', paddingTop: '1rem' }}>
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Key Concerns</p>
                                    <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                                        {analysis.keyConcerns.join(' • ')}
                                    </p>
                                </div>
                            )}

                            {/* Keywords */}
                            {analysis.keywords?.length > 0 && (
                                <div style={{ borderTop: '1px solid rgb(var(--border-color))', paddingTop: '1rem' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag size={13} style={{ color: 'rgb(var(--text-muted))' }} />
                                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>Detected Keywords</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {kwDanger.map((k, i) => (
                                            <span key={i} className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: 'rgb(239,68,68)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                🚨 {k.word}
                                            </span>
                                        ))}
                                        {kwWarning.map((k, i) => (
                                            <span key={i} className="badge" style={{ background: 'rgba(249,115,22,0.12)', color: 'rgb(249,115,22)', border: '1px solid rgba(249,115,22,0.3)' }}>
                                                ⚠️ {k.word}
                                            </span>
                                        ))}
                                        {kwOther.map((k, i) => (
                                            <span key={i} className="badge" style={{ background: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-secondary))', border: '1px solid rgb(var(--border-color))' }}>
                                                {k.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flagged warning */}
                            {analysis.flagged && (
                                <div className="flex items-center gap-2 p-3 rounded-xl"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    <AlertTriangle size={16} style={{ color: 'rgb(239,68,68)' }} />
                                    <p className="text-xs font-medium" style={{ color: 'rgb(239,68,68)' }}>
                                        This entry has been flagged for mentor/admin attention.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
