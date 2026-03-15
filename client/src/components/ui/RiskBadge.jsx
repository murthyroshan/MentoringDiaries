export default function RiskBadge({ level, score, showScore = false }) {
    if (!level) return null
    const classes = {
        low: 'risk-low',
        medium: 'risk-medium',
        high: 'risk-high',
        critical: 'risk-critical',
    }
    const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: '⚠ Critical' }

    return (
        <span className={`badge ${classes[level] || classes.low}`}>
            {labels[level] || level}
            {showScore && score !== undefined && ` · ${score}`}
        </span>
    )
}
