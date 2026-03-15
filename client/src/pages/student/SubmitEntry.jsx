import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookOpen, Star, AlertTriangle, Heart, Paperclip, Trophy, Zap,
    ChevronRight, ChevronLeft, CheckCircle2, Brain, Calendar, GraduationCap
} from 'lucide-react'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { getSubjectsForSemester, SKILL_CATEGORIES, SKILL_SOURCES, EVENT_TYPES, ACHIEVEMENTS, EXAM_TYPES } from '../../constants/subjects'

// ─── Entry Type Definitions ───────────────────────────────────────────────────
const ENTRY_TYPES = [
    { id: 'weekly', label: 'Weekly Report', icon: BookOpen, description: 'Your weekly academic reflection', color: '#8b5cf6' },
    { id: 'academic', label: 'Academic Record', icon: GraduationCap, description: 'Exam marks and performance', color: '#06b6d4' },
    { id: 'event', label: 'Event / Achievement', icon: Trophy, description: 'Add to your portfolio', color: '#f59e0b' },
    { id: 'skill', label: 'Skill Update', icon: Zap, description: 'Track skill growth', color: '#10b981' },
]

const END_SEMESTER_GRADES = ['F', 'C', 'B', 'B+', 'A', 'A+', 'O']

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, label }) {
    return (
        <div className="flex items-center gap-2">
            {label && <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</span>}
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => onChange(n)}
                        className="transition-transform hover:scale-110">
                        <Star size={18} fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : 'rgb(var(--text-muted))'} />
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── AI Analysis Panel ────────────────────────────────────────────────────────
function AIPanel({ analysis, onClose }) {
    const riskColors = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }
    const color = riskColors[analysis?.riskLevel] || '#8b5cf6'

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="glass-card p-5 border-l-4"
            style={{ borderColor: color }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain size={18} style={{ color }} />
                    <span className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>AI Analysis</span>
                </div>
                <span className="badge px-3 py-1 text-xs font-bold" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                    {(analysis?.riskLevel || 'low').toUpperCase()}
                </span>
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    <span>Risk Score</span><span>{analysis?.riskScore ?? 0}/100</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgb(var(--bg-secondary))' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${analysis?.riskScore ?? 0}%`, background: color }} />
                </div>
            </div>

            {analysis?.riskFactors && (
                <div className="mb-4 space-y-1">
                    {Object.entries(analysis.riskFactors).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                            <span>{key.replace(/([A-Z])/g, ' $1').replace('Factor', '').trim()}</span>
                            <span className="font-medium">{Math.round(val)}</span>
                        </div>
                    ))}
                </div>
            )}

            {analysis?.summary && (
                <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {analysis.summary}
                </div>
            )}

            <button onClick={onClose} className="btn btn-ghost text-xs mt-3 w-full">Close</button>
        </motion.div>
    )
}

// ─── Weekly Report Form ───────────────────────────────────────────────────────
function WeeklyForm({ user, onSuccess }) {
    const semester = user?.semester || 1
    const department = user?.department || 'DEFAULT'
    const subjects = useMemo(() => getSubjectsForSemester(department, semester), [department, semester])

    const today = new Date()
    const weekStart = format(addDays(today, -6), 'yyyy-MM-dd')
    const weekEnd = format(today, 'yyyy-MM-dd')

    const [step, setStep] = useState(1)
    const [subjectRatings, setSubjectRatings] = useState(subjects.map(name => ({ name, rating: 3, comment: '' })))
    const [emotionalRating, setEmotionalRating] = useState(3)
    const [formData, setFormData] = useState({
        startDate: weekStart,
        endDate: weekEnd,
        content: '',
        problemsFacedAcademic: '',
        problemsFacedPersonal: '',
        problemsFacedOther: '',
        attendancePercentage: '',
        attendanceExplanation: '',
    })
    const [file, setFile] = useState(null)
    const [aiResult, setAiResult] = useState(null)

    // ── Date Validation State ─────────────────────────────────────────────
    const [dateError, setDateError] = useState('')
    const [dateChecking, setDateChecking] = useState(false)
    const [dateValid, setDateValid] = useState(true)

    const validateDates = useCallback(async (start, end) => {
        if (!start || !end) { setDateError(''); setDateValid(true); return }
        const s = new Date(start), e = new Date(end)
        if (e <= s) {
            setDateError('End date must be after start date.')
            setDateValid(false); return
        }
        const diff = differenceInCalendarDays(e, s)
        if (diff > 7) {
            setDateError(`Range is ${diff} days — must be ≤ 7 days.`)
            setDateValid(false); return
        }
        // Call backend overlap check
        setDateChecking(true)
        setDateError('')
        try {
            const res = await api.get(`/diary/check-range?startDate=${start}&endDate=${end}`)
            if (res.data.rangeError) {
                setDateError(res.data.message)
                setDateValid(false)
            } else if (res.data.overlap) {
                setDateError(res.data.message)
                setDateValid(false)
            } else {
                setDateError('')
                setDateValid(true)
            }
        } catch {
            setDateError('Could not verify date range. Please try again.')
            setDateValid(false)
        } finally {
            setDateChecking(false)
        }
    }, [])

    // Debounced date validation on change
    useEffect(() => {
        const timer = setTimeout(() => {
            validateDates(formData.startDate, formData.endDate)
        }, 600)
        return () => clearTimeout(timer)
    }, [formData.startDate, formData.endDate, validateDates])

    const mutation = useMutation({
        mutationFn: (fd) => api.post('/diary', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: (res) => {
            setAiResult(res.data?.data?.aiAnalysis)
            onSuccess?.()
        },
    })

    const totalSteps = 5
    const progress = (step / totalSteps) * 100

    const handleSubmit = async () => {
        if (!dateValid) return
        const fd = new FormData()
        fd.append('startDate', formData.startDate)
        fd.append('endDate', formData.endDate)
        fd.append('semester', semester)
        fd.append('content', formData.content)
        fd.append('subjectRatings', JSON.stringify(subjectRatings))
        fd.append('problemsFaced', JSON.stringify({
            academic: formData.problemsFacedAcademic,
            personal: formData.problemsFacedPersonal,
            other: formData.problemsFacedOther,
        }))
        fd.append('attendancePercentage', formData.attendancePercentage)
        if (formData.attendancePercentage && Number(formData.attendancePercentage) < 75) {
            fd.append('attendanceExplanation', formData.attendanceExplanation)
        }
        fd.append('emotionalRating', emotionalRating)
        if (file) fd.append('attachment', file)
        mutation.mutate(fd)
    }

    const stepTitles = ['Date Range', 'Section A — Reflection', 'Section B — Subjects', 'Section C & D — Problems & Attendance', 'Section E — Wellbeing']
    const canProceedStep1 = dateValid && !dateChecking && formData.startDate && formData.endDate

    return (
        <div className="space-y-6">
            {/* Progress bar */}
            <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    <span>Step {step} of {totalSteps}: {stepTitles[step - 1]}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgb(var(--bg-secondary))' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #8b5cf6, #6366f1)' }} />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Week Start Date</label>
                                    <input type="date" className={`form-input ${!dateValid ? 'border-red-400' : ''}`} value={formData.startDate}
                                        onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="form-label">Week End Date</label>
                                    <input type="date" className={`form-input ${!dateValid ? 'border-red-400' : ''}`} value={formData.endDate}
                                        onChange={e => setFormData(f => ({ ...f, endDate: e.target.value }))} />
                                </div>
                            </div>

                            {/* Validation feedback */}
                            {dateChecking && (
                                <p className="text-xs flex items-center gap-2" style={{ color: 'rgb(var(--text-muted))' }}>
                                    <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                    Checking availability…
                                </p>
                            )}
                            {!dateChecking && dateError && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertTriangle size={13} /> {dateError}
                                </p>
                            )}
                            {!dateChecking && !dateError && formData.startDate && formData.endDate && (
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                    <CheckCircle2 size={13} /> Date range looks good!
                                </p>
                            )}
                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                📅 Range must be ≤ 7 days. One entry per period.
                            </p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                                Share your reflections, highlights, and overall experience this week.
                            </p>
                            <textarea className="form-input" rows={6} placeholder="Write about what you learned, achieved, and experienced this week (min 50 characters)..."
                                value={formData.content} onChange={e => setFormData(f => ({ ...f, content: e.target.value }))} />
                            <div>
                                <label className="form-label">Attachment (optional)</label>
                                <input type="file" className="form-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                    onChange={e => setFile(e.target.files[0])} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                                Rate your understanding in each subject this week (1 = struggling, 5 = excellent).
                            </p>
                            <div className="space-y-3">
                                {subjectRatings.map((sr, i) => (
                                    <div key={sr.name} className="glass-card p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>{sr.name}</span>
                                            <StarRating value={sr.rating} onChange={r => setSubjectRatings(prev => prev.map((s, j) => j === i ? { ...s, rating: r } : s))} />
                                        </div>
                                        <input className="form-input text-xs" placeholder="Optional comment..." value={sr.comment}
                                            onChange={e => setSubjectRatings(prev => prev.map((s, j) => j === i ? { ...s, comment: e.target.value } : s))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Academic Problems / Challenges</label>
                                <textarea className="form-input" rows={2} placeholder="Any academic difficulties, backlogs, subjects of concern..."
                                    value={formData.problemsFacedAcademic} onChange={e => setFormData(f => ({ ...f, problemsFacedAcademic: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Personal Problems (optional)</label>
                                <textarea className="form-input" rows={2} placeholder="Health, family, personal concerns..."
                                    value={formData.problemsFacedPersonal} onChange={e => setFormData(f => ({ ...f, problemsFacedPersonal: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Other (optional)</label>
                                <textarea className="form-input" rows={2} placeholder="College life, hostel, transport, etc..."
                                    value={formData.problemsFacedOther} onChange={e => setFormData(f => ({ ...f, problemsFacedOther: e.target.value }))} />
                            </div>
                            <hr style={{ borderColor: 'rgb(var(--border-color))' }} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Attendance % this week</label>
                                    <input type="number" className="form-input" min={0} max={100} placeholder="e.g. 85"
                                        value={formData.attendancePercentage} onChange={e => setFormData(f => ({ ...f, attendancePercentage: e.target.value }))} />
                                </div>
                                {Number(formData.attendancePercentage) < 75 && formData.attendancePercentage !== '' && (
                                    <div>
                                        <label className="form-label text-red-500">Explanation (required — below 75%)</label>
                                        <textarea className="form-input border-red-300" rows={2} placeholder="Reason for low attendance..."
                                            value={formData.attendanceExplanation} onChange={e => setFormData(f => ({ ...f, attendanceExplanation: e.target.value }))} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <label className="form-label mb-3 block">How are you feeling this week? (1 = Very Stressed, 5 = Great)</label>
                                <div className="flex items-center justify-center gap-4 py-4">
                                    {['😖', '😟', '😐', '😊', '😄'].map((emoji, i) => (
                                        <button key={i} type="button" onClick={() => setEmotionalRating(i + 1)}
                                            className="text-3xl transition-transform hover:scale-110"
                                            style={{ opacity: emotionalRating === i + 1 ? 1 : 0.4, transform: emotionalRating === i + 1 ? 'scale(1.3)' : 'scale(1)' }}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                                    {['Very Stressed', 'Stressed', 'Neutral', 'Good', 'Excellent'][emotionalRating - 1]}
                                </p>
                            </div>

                            {!aiResult && (
                                <div className="glass-card p-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>🤖 Ready for AI Analysis</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                                        Our multi-factor AI engine will analyze your entry across 6 dimensions: sentiment, attendance, subject understanding, academic performance, emotional state, and historical patterns.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between gap-3 pt-2">
                {step > 1 && (
                    <button className="btn btn-secondary flex items-center gap-2" onClick={() => setStep(s => s - 1)}>
                        <ChevronLeft size={16} /> Back
                    </button>
                )}
                <div className="flex-1" />
                {step < totalSteps ? (
                    <button className="btn btn-primary flex items-center gap-2"
                        onClick={() => setStep(s => s + 1)}
                        disabled={
                            (step === 1 && (!canProceedStep1)) ||
                            (step === 2 && formData.content.length < 50)
                        }>
                        Next <ChevronRight size={16} />
                    </button>
                ) : (
                    <button className="btn btn-primary flex items-center gap-2"
                        onClick={handleSubmit} disabled={mutation.isPending || !dateValid}>
                        {mutation.isPending ? 'Submitting...' : <><CheckCircle2 size={16} /> Submit Entry</>}
                    </button>
                )}
            </div>

            {mutation.isError && (
                <p className="text-sm text-red-500">{mutation.error?.response?.data?.message || 'Submission failed'}</p>
            )}

            <AnimatePresence>
                {aiResult && <AIPanel analysis={aiResult} onClose={() => setAiResult(null)} />}
            </AnimatePresence>
        </div>
    )
}

// ─── Academic Record Form ─────────────────────────────────────────────────────
function AcademicForm({ user, onSuccess }) {
    const [semester, setSemester] = useState(user?.semester || 1)
    const [examType, setExamType] = useState('mid1')
    const subjects = useMemo(() => getSubjectsForSemester(user?.department, semester), [user?.department, semester])

    // Midterm marks state (0–40, maxMarks fixed)
    const [marks, setMarks] = useState(() => subjects.map(name => ({ name, marks: '' })))
    // End-semester grades state
    const [grades, setGrades] = useState(() => subjects.map(name => ({ name, grade: 'B' })))
    const [finalCgpa, setFinalCgpa] = useState('')

    const isEndsem = examType === 'endsem'

    // Reset when semester or examType changes
    useEffect(() => {
        setMarks(subjects.map(name => ({ name, marks: '' })))
        setGrades(subjects.map(name => ({ name, grade: 'B' })))
        setFinalCgpa('')
    }, [subjects, examType])

    const mutation = useMutation({
        mutationFn: (data) => api.post('/academic', data),
        onSuccess,
    })

    const handleSubmit = () => {
        if (isEndsem) {
            mutation.mutate({
                semester,
                examType,
                endsemSubjects: grades,
                finalCgpa: Number(finalCgpa),
            })
        } else {
            mutation.mutate({
                semester,
                examType,
                subjects: marks.map(m => ({ name: m.name, marks: Number(m.marks), maxMarks: 40 })),
            })
        }
    }

    // Midterm marks validation per row
    const marksError = (val) => {
        const n = Number(val)
        if (val === '') return null
        if (n < 0 || n > 40) return 'Must be 0–40'
        return null
    }

    const cgpaError = finalCgpa !== '' && (Number(finalCgpa) < 0 || Number(finalCgpa) > 10)

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Semester</label>
                    <select className="form-input" value={semester} onChange={e => setSemester(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Exam Type</label>
                    <select className="form-input" value={examType} onChange={e => setExamType(e.target.value)}>
                        {EXAM_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Midterm form */}
            {!isEndsem && (
                <>
                    <p className="text-xs px-1" style={{ color: 'rgb(var(--text-muted))' }}>
                        Midterm marks are out of <strong>40</strong>. Enter marks between 0 and 40.
                    </p>
                    <div className="space-y-2">
                        {subjects.map((name, i) => {
                            const err = marksError(marks[i]?.marks)
                            return (
                                <div key={name} className="glass-card p-3 flex items-center gap-3">
                                    <span className="flex-1 text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{name}</span>
                                    <input type="number" className={`form-input w-24 ${err ? 'border-red-400' : ''}`}
                                        placeholder="0–40" min={0} max={40}
                                        value={marks[i]?.marks || ''}
                                        onChange={e => setMarks(prev => prev.map((m, j) => j === i ? { ...m, marks: e.target.value } : m))} />
                                    <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-muted))' }}>/ 40</span>
                                    {err && <span className="text-xs text-red-500">{err}</span>}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* End semester form */}
            {isEndsem && (
                <>
                    <p className="text-xs px-1" style={{ color: 'rgb(var(--text-muted))' }}>
                        Select a grade for each subject. Grade points: F=0, C=5, B=6, B+=7, A=8, A+=9, O=10.
                    </p>
                    <div className="space-y-2">
                        {subjects.map((name, i) => (
                            <div key={name} className="glass-card p-3 flex items-center gap-3">
                                <span className="flex-1 text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{name}</span>
                                <select className="form-input w-28"
                                    value={grades[i]?.grade || 'B'}
                                    onChange={e => setGrades(prev => prev.map((g, j) => j === i ? { ...g, grade: e.target.value } : g))}>
                                    {END_SEMESTER_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="form-label">Final CGPA (0.0 – 10.0)</label>
                        <input type="number" step="0.01" min={0} max={10}
                            className={`form-input w-40 ${cgpaError ? 'border-red-400' : ''}`}
                            placeholder="e.g. 8.5"
                            value={finalCgpa}
                            onChange={e => setFinalCgpa(e.target.value)} />
                        {cgpaError && <p className="text-xs text-red-500 mt-1">CGPA must be between 0 and 10.</p>}
                    </div>
                </>
            )}

            <button className="btn btn-primary w-full" onClick={handleSubmit}
                disabled={mutation.isPending || cgpaError}>
                {mutation.isPending ? 'Saving...' : 'Save Academic Record'}
            </button>
            {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.response?.data?.message}</p>}
        </div>
    )
}

// ─── Event Form ───────────────────────────────────────────────────────────────
function EventForm({ user, onSuccess }) {
    const [form, setForm] = useState({ eventName: '', organizedBy: '', eventType: 'technical', achievement: 'participated', date: '', description: '' })
    const [cert, setCert] = useState(null)

    const mutation = useMutation({
        mutationFn: (fd) => api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess,
    })

    const handleSubmit = () => {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('semester', user?.semester || 1)
        if (cert) fd.append('certificate', cert)
        mutation.mutate(fd)
    }

    const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Event Name</label><input className="form-input" placeholder="e.g. Hackathon 2025" {...f('eventName')} /></div>
                <div><label className="form-label">Organized By</label><input className="form-input" placeholder="e.g. IEEE GCET" {...f('organizedBy')} /></div>
                <div>
                    <label className="form-label">Event Type</label>
                    <select className="form-input" {...f('eventType')}>{EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select>
                </div>
                <div>
                    <label className="form-label">Achievement</label>
                    <select className="form-input" {...f('achievement')}>{ACHIEVEMENTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}</select>
                </div>
                <div><label className="form-label">Event Date</label><input type="date" className="form-input" {...f('date')} /></div>
                <div>
                    <label className="form-label">Certificate (optional)</label>
                    <input type="file" className="form-input" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCert(e.target.files[0])} />
                </div>
            </div>
            <div><label className="form-label">Description</label><textarea className="form-input" rows={3} placeholder="Brief description of the event and your role..." {...f('description')} /></div>
            <button className="btn btn-primary w-full" onClick={handleSubmit} disabled={mutation.isPending}>
                {mutation.isPending ? 'Adding...' : '+ Add to Portfolio'}
            </button>
            {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.response?.data?.message}</p>}
        </div>
    )
}

// ─── Skill Form ───────────────────────────────────────────────────────────────
function SkillForm({ user, onSuccess }) {
    const [form, setForm] = useState({ skillName: '', skillCategory: 'Technical', ratingBefore: 1, ratingAfter: 3, description: '', source: 'college' })

    const mutation = useMutation({
        mutationFn: (data) => api.post('/skills', data),
        onSuccess,
    })

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Skill Name</label>
                    <input className="form-input" placeholder="e.g. React.js, Public Speaking..."
                        value={form.skillName} onChange={e => setForm(p => ({ ...p, skillName: e.target.value }))} />
                </div>
                <div>
                    <label className="form-label">Category</label>
                    <select className="form-input" value={form.skillCategory} onChange={e => setForm(p => ({ ...p, skillCategory: e.target.value }))}>
                        {SKILL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="glass-card p-4 space-y-3">
                <StarRating label="Proficiency Before" value={form.ratingBefore} onChange={v => setForm(p => ({ ...p, ratingBefore: v }))} />
                <StarRating label="Proficiency After" value={form.ratingAfter} onChange={v => setForm(p => ({ ...p, ratingAfter: v }))} />
                {form.ratingAfter > form.ratingBefore && (
                    <p className="text-xs text-green-500">▲ Improved by {form.ratingAfter - form.ratingBefore} level{form.ratingAfter - form.ratingBefore > 1 ? 's' : ''}!</p>
                )}
            </div>
            <div>
                <label className="form-label">Source of Learning</label>
                <select className="form-input" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                    {SKILL_SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
            </div>
            <div>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input" rows={2} placeholder="What specifically improved? How did you practice?"
                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <button className="btn btn-primary w-full" onClick={() => mutation.mutate({ ...form, semester: user?.semester || 1 })}
                disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Record Skill Progress'}
            </button>
            {mutation.isError && <p className="text-sm text-red-500">{mutation.error?.response?.data?.message}</p>}
        </div>
    )
}

// ─── Main SubmitEntry Page ────────────────────────────────────────────────────
export default function SubmitEntry() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user } = useAuthStore()
    const { addToast } = useUIStore()
    const defaultType = searchParams.get('type')
    const [entryType, setEntryType] = useState(
        ENTRY_TYPES.some((t) => t.id === defaultType) ? defaultType : 'weekly'
    )
    const selected = ENTRY_TYPES.find(t => t.id === entryType)

    const handleSuccess = () => {
        addToast('Entry submitted successfully! 🎉', 'success')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>New Entry</h2>
                <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    Select entry type and fill in the details below.
                </p>
            </motion.div>

            {/* Entry Type Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ENTRY_TYPES.map(t => (
                    <button key={t.id} onClick={() => setEntryType(t.id)}
                        className="glass-card p-4 text-left transition-all cursor-pointer"
                        style={{
                            border: `2px solid ${entryType === t.id ? t.color : 'rgb(var(--border-color))'}`,
                            background: entryType === t.id ? `${t.color}10` : undefined,
                        }}>
                        <t.icon size={20} style={{ color: t.color }} className="mb-2" />
                        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{t.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{t.description}</p>
                    </button>
                ))}
            </div>

            {/* Form Container */}
            <AnimatePresence mode="wait">
                <motion.div key={entryType}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                    className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <selected.icon size={20} style={{ color: selected.color }} />
                        <h3 className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{selected.label}</h3>
                    </div>

                    {entryType === 'weekly' && <WeeklyForm user={user} onSuccess={handleSuccess} />}
                    {entryType === 'academic' && <AcademicForm user={user} onSuccess={handleSuccess} />}
                    {entryType === 'event' && <EventForm user={user} onSuccess={handleSuccess} />}
                    {entryType === 'skill' && <SkillForm user={user} onSuccess={handleSuccess} />}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
