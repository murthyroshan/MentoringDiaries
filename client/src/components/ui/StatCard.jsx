import { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { SkeletonCard } from './Skeletons/SkeletonCard'

function AnimatedNumber({ target, duration = 1.5 }) {
    const spring = useSpring(0, { duration: duration * 1000 })
    const [display, setDisplay] = useState('0')

    useEffect(() => {
        const unsubscribe = spring.on('change', (v) => {
            if (target >= 1000) setDisplay(Math.round(v).toLocaleString())
            else if (target < 1) setDisplay(v.toFixed(1))
            else setDisplay(Math.round(v).toString())
        })
        return unsubscribe
    }, [spring, target])

    useEffect(() => {
        spring.set(target)
    }, [target, spring])

    return <motion.span>{display}</motion.span>
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'violet', trend, trendValue, loading }) {
    const colorMap = {
        violet: { bg: 'rgba(139,92,246,0.1)', text: 'rgb(139,92,246)', border: 'rgba(139,92,246,0.2)' },
        indigo: { bg: 'rgba(99,102,241,0.1)', text: 'rgb(99,102,241)', border: 'rgba(99,102,241,0.2)' },
        pink: { bg: 'rgba(236,72,153,0.1)', text: 'rgb(236,72,153)', border: 'rgba(236,72,153,0.2)' },
        green: { bg: 'rgba(34,197,94,0.1)', text: 'rgb(34,197,94)', border: 'rgba(34,197,94,0.2)' },
        orange: { bg: 'rgba(249,115,22,0.1)', text: 'rgb(249,115,22)', border: 'rgba(249,115,22,0.2)' },
        red: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)', border: 'rgba(239,68,68,0.2)' },
    }
    const c = colorMap[color] || colorMap.violet

    if (loading) {
        return <SkeletonCard />
    }

    return (
        <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="glass-card p-5 cursor-default"
        >
            <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>{title}</p>
                {Icon && (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                        <Icon size={18} style={{ color: c.text }} />
                    </div>
                )}
            </div>
            <p className="text-3xl font-bold mb-1" style={{ color: 'rgb(var(--text-primary))' }}>
                {typeof value === 'number' ? <AnimatedNumber target={value} /> : value}
            </p>
            {(subtitle || trend) && (
                <div className="flex items-center justify-between">
                    {subtitle && (
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{subtitle}</p>
                    )}
                    {trend && trendValue !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trendValue}%
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    )
}
