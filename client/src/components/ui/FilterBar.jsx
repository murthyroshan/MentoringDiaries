import { Search, Filter, X } from 'lucide-react'

/**
 * Reusable FilterBar — replaces the inline filter logic that was duplicated
 * across MyEntries, AllEntries, FlaggedEntries, etc.
 *
 * Props:
 *   search        (string)   - current search value
 *   onSearch      (fn)       - callback(value)
 *   filters       (array)    - [{ key, label, options: [{value, label}] }]
 *   values        (object)   - current selected filter values keyed by filter.key
 *   onChange      (fn)       - callback(key, value)
 *   onReset       (fn)       - optional: called when "Clear all" is clicked
 *   className     (string)   - additional class
 */
export default function FilterBar({ search, onSearch, filters = [], values = {}, onChange, onReset, className = '' }) {
    const hasActiveFilters = search || filters.some(f => values[f.key])

    return (
        <div className={`glass-card p-4 flex flex-wrap gap-3 items-center ${className}`}>
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-48">
                <Search size={14} style={{ color: 'rgb(var(--text-muted))' }} />
                <input
                    value={search || ''}
                    onChange={e => onSearch?.(e.target.value)}
                    className="form-input py-2 text-sm"
                    placeholder="Search..."
                />
            </div>

            {/* Select filters */}
            {filters.map(f => (
                <select
                    key={f.key}
                    value={values[f.key] || ''}
                    onChange={e => onChange?.(f.key, e.target.value)}
                    className="form-input py-2 text-sm w-auto"
                >
                    <option value="">{f.label}</option>
                    {f.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ))}

            {/* Clear all */}
            {hasActiveFilters && onReset && (
                <button
                    onClick={onReset}
                    className="btn btn-ghost text-xs flex items-center gap-1 py-2 px-3"
                    style={{ color: 'rgb(var(--text-muted))' }}
                >
                    <X size={13} /> Clear
                </button>
            )}
        </div>
    )
}
