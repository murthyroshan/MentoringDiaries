export default function SentimentChip({ sentiment }) {
    if (!sentiment) return null
    const config = {
        positive: { label: '😊 Positive', bg: 'rgba(34,197,94,0.12)', color: 'rgb(22,163,74)', border: 'rgba(34,197,94,0.3)' },
        neutral: { label: '😐 Neutral', bg: 'rgba(99,102,241,0.12)', color: 'rgb(99,102,241)', border: 'rgba(99,102,241,0.3)' },
        negative: { label: '😔 Negative', bg: 'rgba(239,68,68,0.12)', color: 'rgb(239,68,68)', border: 'rgba(239,68,68,0.3)' },
    }
    const c = config[sentiment] || config.neutral
    return (
        <span
            className="badge"
            style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
        >
            {c.label}
        </span>
    )
}
