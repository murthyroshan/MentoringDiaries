import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useSpring } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import api from '../../services/api'
import { getWeekDateRange, getCurrentISOWeek } from '../../utils/weekDates'

// ─── Design tokens (match StudentDashboard) ────────────────────────────────────
const C = {
  void:    '#06060A',
  dark:    '#0C0C12',
  surface: '#111118',
  elevated:'#16161F',
  border:  'rgba(255,255,255,0.06)',
  gold:    '#E8B84B',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.45)',
  subtle:  'rgba(242,240,232,0.18)',
  green:   '#3DD68C',
  amber:   '#F59E0B',
  red:     '#EF4444',
  teal:    '#2DD4BF',
  purple:  '#A78BFA',
}

const glass = {
  background: 'rgba(17,17,24,0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px',
}

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`
}

function formatDateRange(startDate, endDate) {
  const opts = { day: 'numeric', month: 'short' }
  const s = startDate.toLocaleDateString(undefined, opts)
  const e = endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function getRiskColor(score) {
  if (score == null) return C.subtle
  if (score < 30) return C.green
  if (score < 60) return C.amber
  if (score < 80) return C.red
  return '#991F1F'
}

function getRiskLabel(score) {
  if (score == null) return 'Unknown'
  if (score < 30) return 'Low'
  if (score < 60) return 'Medium'
  if (score < 80) return 'High'
  return 'Critical'
}

const Skel = ({ h = 16, w = '100%', r = 8 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'rgba(255,255,255,0.05)', animation: 'sePulse 1.5s ease-in-out infinite' }} />
)

function AnimatedNumber({ value, fontSize = '36px', color = C.text }) {
  const [count, setCount] = useState(0)
  const spring = useSpring(0, { stiffness: 55, damping: 18 })
  useEffect(() => spring.on('change', v => setCount(Math.round(v))), [spring])
  useEffect(() => { if (value != null) spring.set(value) }, [value]) // eslint-disable-line
  return <span style={{ fontSize, fontWeight: 900, color, lineHeight: 1 }}>{count}</span>
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  padding: '10px 14px',
  color: C.text,
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '80px',
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, labels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' }}>
      {labels.map((label, i) => {
        const idx = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < labels.length ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                background: done ? C.teal : active ? C.purple : 'transparent',
                border: done ? `2px solid ${C.teal}` : active ? `2px solid ${C.purple}` : `2px solid ${C.border}`,
                color: (done || active) ? '#fff' : C.muted,
                boxShadow: active ? `0 0 0 4px ${C.purple}33` : 'none',
                transition: 'all 0.3s', flexShrink: 0,
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{ fontSize: '12px', color: active ? C.text : C.muted, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {idx < labels.length && (
              <div style={{ flex: 1, height: 1, background: done ? C.teal : C.border, margin: '0 12px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Type Chooser ─────────────────────────────────────────────────────────────
function TypeChooser({ onSelect, currentSemMarks, achievementsCount, marksLoading, achievementsLoading }) {
  const submissionCount = currentSemMarks?.submission_count ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.text, margin: 0 }}>What would you like to submit?</h1>
        <p style={{ fontSize: '14px', color: C.muted, margin: '8px 0 0' }}>Choose the type of entry to get started</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Card 1: General diary */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect('diary')}
          style={{ ...glass, cursor: 'pointer', border: `1px solid rgba(167,139,250,0.25)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>✏️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '17px', fontWeight: 700, color: C.text }}>Weekly diary</span>
            <span style={{ fontSize: '11px', background: 'rgba(167,139,250,0.15)', border: `1px solid rgba(167,139,250,0.3)`, borderRadius: '999px', padding: '2px 10px', color: C.purple }}>Unlimited</span>
          </div>
          <p style={{ fontSize: '13px', color: C.muted, margin: 0, lineHeight: 1.6 }}>Reflect on your week — mood, attendance, subjects, and what's on your mind</p>
        </motion.div>

        {/* Card 2: Marks */}
        {marksLoading ? (
          <div style={{ ...glass }}><Skel h={140} r={12} /></div>
        ) : (
          <motion.div
            whileHover={submissionCount < 2 ? { scale: 1.02 } : {}}
            whileTap={submissionCount < 2 ? { scale: 0.98 } : {}}
            onClick={submissionCount < 2 ? () => onSelect('marks') : undefined}
            style={{ ...glass, cursor: submissionCount < 2 ? 'pointer' : 'not-allowed', border: `1px solid rgba(61,214,140,0.2)`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎓</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: submissionCount >= 2 ? C.muted : C.text }}>Marks entry</span>
              <span style={{ fontSize: '11px', background: submissionCount >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(61,214,140,0.15)', border: `1px solid ${submissionCount >= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(61,214,140,0.3)'}`, borderRadius: '999px', padding: '2px 10px', color: submissionCount >= 2 ? C.red : C.green }}>
                {submissionCount >= 2 ? 'Limit reached — 2 of 2 used' : `${2 - submissionCount} submission${2 - submissionCount !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: C.muted, margin: 0, lineHeight: 1.6 }}>Submit your subject grades and semester CGPA</p>
            {submissionCount >= 2 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                <span style={{ fontSize: '13px', color: C.red, fontWeight: 600 }}>Limit reached — 2 of 2 used</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Card 3: Achievement */}
        {achievementsLoading ? (
          <div style={{ ...glass }}><Skel h={140} r={12} /></div>
        ) : (
          <motion.div
            whileHover={achievementsCount < 3 ? { scale: 1.02 } : {}}
            whileTap={achievementsCount < 3 ? { scale: 0.98 } : {}}
            onClick={achievementsCount < 3 ? () => onSelect('achievement') : undefined}
            style={{ ...glass, cursor: achievementsCount < 3 ? 'pointer' : 'not-allowed', border: `1px solid rgba(245,158,11,0.2)`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏆</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '17px', fontWeight: 700, color: achievementsCount >= 3 ? C.muted : C.text }}>Achievement</span>
              <span style={{ fontSize: '11px', background: achievementsCount >= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${achievementsCount >= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '999px', padding: '2px 10px', color: achievementsCount >= 3 ? C.red : C.amber }}>
                {achievementsCount >= 3 ? 'Limit reached — 3 of 3 used' : `${3 - achievementsCount} submission${3 - achievementsCount !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: C.muted, margin: 0, lineHeight: 1.6 }}>Log an event, course, competition, or milestone</p>
            {achievementsCount >= 3 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                <span style={{ fontSize: '13px', color: C.red, fontWeight: 600 }}>Limit reached — 3 of 3 used</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Progress Overlay ─────────────────────────────────────────────────────────
function ProgressOverlay({ progressPct, progressLabel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,6,10,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...glass, textAlign: 'center', width: '380px', maxWidth: '90vw' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚙️</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>{progressLabel}</div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${C.purple}, ${C.teal})`, width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '8px' }}>{Math.round(progressPct)}%</div>
      </div>
    </div>
  )
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({ successData, weekNumber, mentorId, onViewEntries, onDashboard }) {
  const riskScore = successData?.ai_risk_score ?? 0
  const riskColor = getRiskColor(riskScore)
  const riskLabel = getRiskLabel(riskScore)

  useEffect(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,6,10,0.92)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ ...glass, textAlign: 'center', width: '420px', maxWidth: '90vw' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ margin: '0 auto 16px', display: 'block' }}>
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(61,214,140,0.2)" strokeWidth="3" />
          <motion.path d="M 20 32 L 28 40 L 44 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }} />
        </svg>
        <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Week {weekNumber} diary submitted</div>
        <div style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>
          {mentorId ? 'Your mentor will review your entry soon' : 'Your entry is saved. An admin will ensure it gets reviewed.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: C.muted }}>AI Risk Score</span>
          <AnimatedNumber value={riskScore} fontSize="28px" color={riskColor} />
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', background: `${riskColor}22`, border: `1px solid ${riskColor}55`, color: riskColor }}>{riskLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onViewEntries} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '9px 20px', color: C.text, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>View my entries</button>
          <button onClick={onDashboard} style={{ background: `linear-gradient(135deg, ${C.purple}33, ${C.teal}33)`, border: `1px solid ${C.purple}55`, borderRadius: '10px', padding: '9px 20px', color: C.text, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>Back to dashboard</button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Diary Flow ───────────────────────────────────────────────────────────────
function DiaryFlow({ onCancel, editEntry, initialWeek, user, semester, academicYear, addToast }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)

  const currentYear = new Date().getFullYear()
  const currentWeek = getCurrentISOWeek()

  const [selectedWeek, setSelectedWeek] = useState(initialWeek || (editEntry?.week_number) || currentWeek)
  const [mood, setMood] = useState(editEntry?.mood || null)
  const [difficulty, setDifficulty] = useState(editEntry?.weekly_difficulty || 5)
  const [attendanceExplanation, setAttendanceExplanation] = useState(editEntry?.attendance_explanation || '')
  const [shakeField, setShakeField] = useState(null)
  const [subjectRatings, setSubjectRatings] = useState({})
  const [expandedNotes, setExpandedNotes] = useState({})
  const [subjectNotes, setSubjectNotes] = useState({})
  const [reflection, setReflection] = useState(editEntry?.reflection || '')
  const [challenges, setChallenges] = useState(editEntry?.challenges || '')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progressPct, setProgressPct] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [successData, setSuccessData] = useState(null)

  const { data: diaryListData } = useQuery({
    queryKey: ['diary', 'list', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/diary', { params: { semester, academic_year: academicYear, limit: 50 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })
  const submittedWeeks = useMemo(() => {
    const arr = diaryListData?.data || []
    return new Set(arr.filter(e => !editEntry || e.id !== editEntry.id).map(e => e.week_number))
  }, [diaryListData, editEntry])

  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'week', { week: selectedWeek, semester, year: academicYear }],
    queryFn: () => api.get('/attendance/me', { params: { week: selectedWeek, semester, year: academicYear } }).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })
  const attendanceRecord = attData?.data

  const { data: subjectsData } = useQuery({
    queryKey: ['marks', 'subjects'],
    queryFn: () => api.get('/marks/subjects').then(r => r.data),
    staleTime: 60 * 60 * 1000, retry: 1,
  })
  const subjects = useMemo(() => subjectsData?.data || ['Mathematics', 'Physics', 'Chemistry', 'Core Subject I', 'Core Subject II', 'English'], [subjectsData])

  useEffect(() => {
    if (editEntry?.subject_ratings) {
      const ratings = {}
      const notes = {}
      editEntry.subject_ratings.forEach(r => {
        ratings[r.subject_name] = r.rating
        if (r.note) notes[r.subject_name] = r.note
      })
      setSubjectRatings(ratings)
      setSubjectNotes(notes)
    }
  }, [editEntry])

  const { startDate, endDate } = getWeekDateRange(selectedWeek, currentYear)
  const weekOptions = Array.from({ length: currentWeek }, (_, i) => i + 1)

  function triggerShake(field) {
    setShakeField(field)
    setTimeout(() => setShakeField(null), 500)
  }

  function goNext() {
    if (step === 1) {
      if (!mood) { triggerShake('mood'); return }
      if (attendanceRecord && attendanceRecord.cumulative_pct < 75 && attendanceExplanation.trim().length < 20) {
        triggerShake('attendance_explanation'); return
      }
    }
    if (step === 2) {
      const unrated = subjects.filter(s => !subjectRatings[s])
      if (unrated.length > 0) { triggerShake('subjects'); return }
    }
    setDirection(1)
    setStep(s => s + 1)
  }

  function goBack() {
    setDirection(-1)
    setStep(s => s - 1)
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setFileError('File must be under 5 MB'); return }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
    if (!allowed.includes(f.type)) { setFileError('Allowed types: PDF, DOCX, JPG, PNG'); return }
    setFileError(''); setFile(f)
  }

  async function handleSubmit() {
    if (reflection.trim().length < 50) { triggerShake('reflection'); return }
    setIsSubmitting(true)
    setProgressPct(20)
    setProgressLabel('Submitting your entry...')
    const t1 = setTimeout(() => { setProgressPct(50); setProgressLabel('Analysing mood and attendance...') }, 800)
    const t2 = setTimeout(() => { setProgressPct(80); setProgressLabel('Running AI risk assessment...') }, 1400)
    const t3 = setTimeout(() => { setProgressPct(95); setProgressLabel('Generating insights...') }, 2000)
    const t4 = setTimeout(() => { setProgressPct(99); setProgressLabel('Almost done...') }, 2600)
    try {
      const fd = new FormData()
      fd.append('week_number', String(selectedWeek))
      fd.append('start_date', startDate.toISOString())
      fd.append('end_date', endDate.toISOString())
      fd.append('mood', String(mood))
      fd.append('weekly_difficulty', String(difficulty))
      fd.append('semester', String(semester))
      fd.append('academic_year', academicYear)
      if (attendanceRecord && attendanceRecord.cumulative_pct < 75) fd.append('attendance_explanation', attendanceExplanation)
      fd.append('reflection', reflection)
      if (challenges.trim()) fd.append('challenges', challenges)
      fd.append('subjectRatings', JSON.stringify(subjects.map(s => ({ subject_name: s, rating: subjectRatings[s] || 3, note: subjectNotes[s] || '' }))))
      if (file) fd.append('attachment', file)
      let res
      if (editEntry) {
        res = await api.patch(`/diary/${editEntry.id}`, fd, { headers: { 'Content-Type': undefined } })
      } else {
        res = await api.post('/diary', fd, { headers: { 'Content-Type': undefined } })
      }
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      setProgressPct(100)
      queryClient.invalidateQueries({ queryKey: ['diary'] })
      setTimeout(() => { setSuccessData(res.data.data); setIsSubmitting(false) }, 300)
    } catch (err) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      setIsSubmitting(false)
      addToast(err?.response?.data?.message || 'Submission failed. Please try again.', 'error')
    }
  }

  const difficultyColors = ['', C.teal, C.teal, C.teal, C.amber, C.amber, C.amber, C.red, C.red, '#dc2626', '#dc2626']
  const difficultyLabels = ['', 'Easy week', 'Easy week', 'Easy week', 'Moderate', 'Moderate', 'Moderate', 'Challenging', 'Challenging', 'Very tough', 'Very tough']
  const diffColor = difficultyColors[difficulty] || C.amber
  const diffLabel = difficultyLabels[difficulty] || 'Moderate'

  if (successData) {
    return (
      <SuccessOverlay
        successData={successData}
        weekNumber={selectedWeek}
        mentorId={user?.mentor_id}
        onViewEntries={() => navigate('/student/entries')}
        onDashboard={() => navigate('/student/dashboard')}
      />
    )
  }

  return (
    <>
      {isSubmitting && <ProgressOverlay progressPct={progressPct} progressLabel={progressLabel} />}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>{editEntry ? 'Edit diary entry' : 'Weekly diary'}</h1>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Back</button>
        </div>
        <StepIndicator step={step} labels={['Week & Mood', 'Subject Ratings', 'Reflection']} />
        <div style={glass}>
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -40 }} transition={{ duration: 0.25 }}>
                {/* Week selector */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Week</label>
                  <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))} disabled={!!editEntry}
                    style={{ ...inputStyle, appearance: 'none', cursor: editEntry ? 'not-allowed' : 'pointer', background: 'rgba(15, 15, 25, 0.95)', color: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '10px 14px' }}>
                    {weekOptions.map(w => {
                      const { startDate: sd, endDate: ed } = getWeekDateRange(w, currentYear)
                      const isCurrent = w === currentWeek
                      const isSubmitted = submittedWeeks.has(w)
                      return (
                        <option key={w} value={w} disabled={isSubmitted} style={{ background: '#0f0f19', color: 'rgba(255, 255, 255, 0.9)' }}>
                          {`Week ${w} · ${formatDateRange(sd, ed)}${isCurrent ? ' (current)' : ''}${isSubmitted ? ' · already submitted' : ''}`}
                        </option>
                      )
                    })}
                  </select>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>{formatDateRange(startDate, endDate)}</div>
                  {selectedWeek !== currentWeek && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: `1px solid rgba(245,158,11,0.25)`, fontSize: '12px', color: C.amber }}>
                      Late submission — Week {selectedWeek}
                    </div>
                  )}
                </div>

                {/* Mood */}
                <motion.div style={{ marginBottom: '24px' }} animate={shakeField === 'mood' ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '10px' }}>How are you feeling?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {[['😔','Tough'],['😟','Struggling'],['😐','Okay'],['🙂','Good'],['😄','Great']].map(([emoji, label], i) => (
                      <motion.div key={i} whileTap={{ scale: 0.97 }} onClick={() => setMood(i + 1)}
                        style={{ padding: '14px 6px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: mood === i + 1 ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', border: mood === i + 1 ? `2px solid ${C.purple}` : `1px solid ${C.border}`, boxShadow: mood === i + 1 ? `0 0 0 2px ${C.purple}44` : 'none', transform: mood === i + 1 ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: '22px' }}>{emoji}</div>
                        <div style={{ fontSize: '11px', color: mood === i + 1 ? C.purple : C.muted, marginTop: '4px', fontWeight: mood === i + 1 ? 600 : 400 }}>{label}</div>
                      </motion.div>
                    ))}
                  </div>
                  {!mood && shakeField === 'mood' && <div style={{ fontSize: '11px', color: C.red, marginTop: '6px' }}>Select your mood to continue</div>}
                </motion.div>

                {/* Attendance */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '10px' }}>Attendance</label>
                  {attLoading ? <Skel h={72} r={12} /> : attendanceRecord ? (
                    <>
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '32px', fontWeight: 900, color: attendanceRecord.cumulative_pct >= 75 ? C.green : C.red }}>{Math.round(attendanceRecord.cumulative_pct)}%</span>
                          <span style={{ fontSize: '12px', color: C.muted }}>Cumulative · Semester {semester} · Up to Week {selectedWeek}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: C.muted }}>This week: {Math.round(attendanceRecord.weekly_pct)}%</div>
                        {attendanceRecord.cumulative_pct < 75 ? (
                          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.25)`, fontSize: '12px', color: C.amber }}>
                            Your attendance is {Math.round(attendanceRecord.cumulative_pct)}% — below the 75% threshold
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', fontSize: '12px', color: C.green }}>✓ Attendance is on track</div>
                        )}
                      </div>
                      {attendanceRecord.cumulative_pct < 75 && (
                        <motion.div animate={shakeField === 'attendance_explanation' ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }} style={{ marginTop: '10px' }}>
                          <textarea value={attendanceExplanation} onChange={e => setAttendanceExplanation(e.target.value)} placeholder="Please explain your attendance this semester..."
                            style={{ ...textareaStyle, border: shakeField === 'attendance_explanation' ? `1px solid ${C.amber}` : `1px solid ${C.border}` }} />
                          {attendanceExplanation.trim().length < 20 && <div style={{ fontSize: '11px', color: C.amber, marginTop: '4px' }}>Minimum 20 characters required ({attendanceExplanation.trim().length}/20)</div>}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, fontSize: '13px', color: C.muted }}>Attendance data not available for this week</div>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '10px' }}>Weekly difficulty</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input type="range" min={1} max={10} step={1} value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} style={{ flex: 1, accentColor: diffColor }} />
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 900, color: diffColor }}>{difficulty}</span>
                      <div style={{ fontSize: '11px', color: diffColor, fontWeight: 600 }}>{diffLabel}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -40 }} transition={{ duration: 0.25 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '16px' }}>How were your subjects this week?</div>
                <motion.div animate={shakeField === 'subjects' ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {subjects.map(subject => {
                      const r = subjectRatings[subject]
                      const starLabels = ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent']
                      return (
                        <div key={subject} style={{ ...glass, padding: '14px', borderLeft: r && r <= 2 ? `3px solid ${C.amber}` : `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{subject}</span>
                            {r && r <= 2 && <span style={{ fontSize: '11px', color: C.amber }}>Consider discussing with mentor</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {[1,2,3,4,5].map(star => (
                              <button key={star} onClick={() => setSubjectRatings(prev => ({ ...prev, [subject]: star }))}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '22px', color: r >= star ? C.purple : C.border, transition: 'color 0.15s' }}>
                                {r >= star ? '★' : '☆'}
                              </button>
                            ))}
                            {r && <span style={{ fontSize: '12px', color: C.muted, marginLeft: '4px' }}>{starLabels[r]}</span>}
                          </div>
                          {!expandedNotes[subject] ? (
                            <button onClick={() => setExpandedNotes(prev => ({ ...prev, [subject]: true }))}
                              style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '12px', padding: '4px 0', marginTop: '4px', fontFamily: 'inherit' }}>Add a note →</button>
                          ) : (
                            <textarea value={subjectNotes[subject] || ''} onChange={e => setSubjectNotes(prev => ({ ...prev, [subject]: e.target.value }))}
                              placeholder="Any specific challenge or comment?" style={{ ...textareaStyle, marginTop: '8px', minHeight: '56px' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -40 }} transition={{ duration: 0.25 }}>
                {/* Reflection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>What's on your mind this week? <span style={{ color: C.red }}>*</span></label>
                  <motion.div animate={shakeField === 'reflection' ? { x: [0, -8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)}
                      placeholder="Share anything — academic stress, personal challenges, what went well, how you're feeling overall..."
                      style={{ ...textareaStyle, minHeight: '120px', border: shakeField === 'reflection' ? `1px solid ${C.red}` : `1px solid ${C.border}` }} />
                  </motion.div>
                  <div style={{ fontSize: '11px', color: reflection.length < 50 ? C.amber : C.muted, marginTop: '4px' }}>
                    {reflection.length} chars{reflection.length < 50 ? ` — ${50 - reflection.length} more needed` : ' ✓'}
                  </div>
                </div>
                {/* Challenges */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Challenges faced (optional)</label>
                  <textarea value={challenges} onChange={e => setChallenges(e.target.value)} placeholder="What specific challenges did you face this week?" style={textareaStyle} />
                </div>
                {/* File */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Attachment (optional)</label>
                  {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '13px', color: C.text, flex: 1 }}>{file.name} — {file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`}</span>
                      <button onClick={() => setFile(null)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: '18px' }}>×</button>
                    </div>
                  ) : (
                    <div onClick={() => fileRef.current?.click()} style={{ padding: '24px', borderRadius: '10px', border: `2px dashed ${C.border}`, textAlign: 'center', cursor: 'pointer', color: C.muted, fontSize: '13px' }}>
                      Drag and drop or <span style={{ color: C.purple }}>click to upload</span>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>PDF, DOCX, JPG, PNG · max 5 MB</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />
                  {fileError && <div style={{ fontSize: '11px', color: C.red, marginTop: '6px' }}>{fileError}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
            <button onClick={step === 1 ? onCancel : goBack} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 20px', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              {step === 1 ? 'Cancel' : '← Back'}
            </button>
            {step < 3 ? (
              <button onClick={goNext} style={{ background: `rgba(167,139,250,0.15)`, border: `1px solid ${C.purple}55`, borderRadius: '10px', padding: '10px 24px', color: C.text, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.teal}88)`, border: 'none', borderRadius: '10px', padding: '10px 28px', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}>
                {editEntry ? 'Update entry →' : 'Submit diary entry →'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─── Marks Flow ───────────────────────────────────────────────────────────────
function MarksFlow({ onCancel, semester, academicYear, addToast }) {
  const queryClient = useQueryClient()
  const [grades, setGrades] = useState({})
  const [cgpa, setCgpa] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: marksData } = useQuery({
    queryKey: ['marks', 'all'],
    queryFn: () => api.get('/marks').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
  })
  const existingEntry = useMemo(() => {
    const all = marksData?.data || []
    return all.find(m => m.semester === semester) || null
  }, [marksData, semester])

  const { data: subjectsData } = useQuery({
    queryKey: ['marks', 'subjects'],
    queryFn: () => api.get('/marks/subjects').then(r => r.data),
    staleTime: 60 * 60 * 1000, retry: 1,
  })
  const subjects = useMemo(() => subjectsData?.data || [], [subjectsData])

  useEffect(() => {
    if (existingEntry) {
      setCgpa(existingEntry.cgpa != null ? String(existingEntry.cgpa) : '')
      const g = {}
      ;(existingEntry.subjects || []).forEach(s => { g[s.subject_name] = s.grade })
      setGrades(g)
    }
  }, [existingEntry])

  const gradeOptions = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F']

  async function handleSubmit() {
    const allGraded = subjects.every(s => grades[s])
    if (!allGraded) { addToast('Please grade all subjects', 'error'); return }
    setIsSubmitting(true)
    try {
      const payload = { semester, academic_year: academicYear, cgpa: cgpa ? Number(cgpa) : null, subjects: subjects.map(s => ({ subject_name: s, grade: grades[s] })) }
      if (existingEntry) { await api.put(`/marks/${existingEntry.id}`, payload) }
      else { await api.post('/marks', payload) }
      queryClient.invalidateQueries({ queryKey: ['marks'] })
      addToast(existingEntry ? 'Marks updated' : 'Marks submitted', 'success')
      onCancel()
    } catch (err) {
      addToast(err?.response?.data?.message || 'Submission failed', 'error')
    } finally { setIsSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>{existingEntry ? `Edit marks · Semester ${semester}` : `Marks entry · Semester ${semester}`}</h1>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Back</button>
      </div>
      <div style={glass}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {subjects.map(subject => (
            <div key={subject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: C.text, fontWeight: 500 }}>{subject}</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {gradeOptions.map(g => (
                  <button key={g} onClick={() => setGrades(prev => ({ ...prev, [subject]: g }))}
                    style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: grades[subject] === g ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${grades[subject] === g ? C.purple : C.border}`, color: grades[subject] === g ? '#fff' : C.muted }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Previous semester CGPA (Semester {semester - 1} result) — optional</label>
          <input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={e => setCgpa(e.target.value)} placeholder="e.g. 8.75" style={{ ...inputStyle, maxWidth: '200px' }} />
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>Enter your CGPA as shown on your result card</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 20px', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.teal}88)`, border: 'none', borderRadius: '10px', padding: '10px 24px', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Submitting...' : existingEntry ? 'Update marks →' : 'Submit marks →'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Achievement Flow ─────────────────────────────────────────────────────────
function AchievementFlow({ onCancel, achievementsCount, semester, academicYear, addToast }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [type, setType] = useState('event')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useFileUpload, setUseFileUpload] = useState(false)
  const [proofFile, setProofFile] = useState(null)
  const fileRef = useRef(null)
  const [organizer, setOrganizer] = useState('')
  const [role, setRole] = useState('Participant')
  const [platform, setPlatform] = useState('Coursera')
  const [customPlatform, setCustomPlatform] = useState('')
  const [certUrl, setCertUrl] = useState('')
  const [level, setLevel] = useState('College')
  const [position, setPosition] = useState('')
  const [category, setCategory] = useState('')

  async function handleSubmit() {
    if (!title.trim()) { addToast('Title is required', 'error'); return }
    if (!date) { addToast('Date is required', 'error'); return }
    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('title', title)
      fd.append('semester', String(semester))
      fd.append('academic_year', academicYear)
      if (description) fd.append('description', description)
      if (date) fd.append('date', date)
      if (!useFileUpload && proofUrl) fd.append('proof_url', proofUrl)
      if (useFileUpload && proofFile) fd.append('attachment', proofFile)
      await api.post('/achievements', fd, { headers: { 'Content-Type': undefined } })
      queryClient.invalidateQueries({ queryKey: ['achievements'] })
      addToast('Achievement logged successfully', 'success')
      navigate('/student/portfolio')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Submission failed', 'error')
    } finally { setIsSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>Log an achievement</h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: '4px 0 0' }}>{achievementsCount} of 3 submissions used this semester</p>
        </div>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>← Back</button>
      </div>
      <div style={glass}>
        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[['event','Event','📅'],['course','Course','📚'],['competition','Competition','🏆'],['other','Other','⭐']].map(([k,label,icon]) => (
            <motion.div key={k} whileTap={{ scale: 0.97 }} onClick={() => setType(k)}
              style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', background: type === k ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', border: type === k ? `2px solid ${C.purple}` : `1px solid ${C.border}`, transform: type === k ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }}>
              <div style={{ fontSize: '22px' }}>{icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: type === k ? C.purple : C.muted, marginTop: '4px' }}>{label}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Title <span style={{ color: C.red }}>*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Won inter-college hackathon" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." style={textareaStyle} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Date <span style={{ color: C.red }}>*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>

          {type === 'event' && (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Organizer</label>
                <input value={organizer} onChange={e => setOrganizer(e.target.value)} placeholder="e.g. IEEE Chapter" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Your role</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Participant','Volunteer','Organizer','Speaker'].map(r => (
                    <button key={r} onClick={() => setRole(r)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: role === r ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${role === r ? C.purple : C.border}`, color: role === r ? '#fff' : C.muted }}>{r}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {type === 'course' && (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Platform</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Coursera','NPTEL','Udemy','edX','Other'].map(p => (
                    <button key={p} onClick={() => setPlatform(p)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: platform === p ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${platform === p ? C.purple : C.border}`, color: platform === p ? '#fff' : C.muted }}>{p}</button>
                  ))}
                </div>
                {platform === 'Other' && <input value={customPlatform} onChange={e => setCustomPlatform(e.target.value)} placeholder="Platform name" style={{ ...inputStyle, marginTop: '8px' }} />}
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Certificate URL (optional)</label>
                <input value={certUrl} onChange={e => setCertUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
            </>
          )}
          {type === 'competition' && (
            <>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Level</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['College','State','National','International'].map(l => (
                    <button key={l} onClick={() => setLevel(l)} style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: level === l ? C.purple : 'rgba(255,255,255,0.06)', border: `1px solid ${level === l ? C.purple : C.border}`, color: level === l ? '#fff' : C.muted }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Position / Prize</label>
                <input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. 1st place, Runner up" style={inputStyle} />
              </div>
            </>
          )}
          {type === 'other' && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '6px' }}>Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Research, Internship" style={inputStyle} />
            </div>
          )}

          {/* Proof */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'block', marginBottom: '8px' }}>Proof (optional)</label>
            {!useFileUpload ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => setUseFileUpload(true)} style={{ background: 'transparent', border: 'none', color: C.purple, cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>Upload file instead</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {proofFile ? proofFile.name : 'Choose file'}
                </button>
                <button onClick={() => setUseFileUpload(false)} style={{ background: 'transparent', border: 'none', color: C.purple, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Use URL instead</button>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={e => setProofFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 20px', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.teal}88)`, border: 'none', borderRadius: '10px', padding: '10px 24px', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Submitting...' : 'Log achievement →'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SubmitEntry() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [searchParams] = useSearchParams()

  const semester = user?.current_semester ?? 1
  const academicYear = currentAcademicYear()

  const editId = searchParams.get('edit')
  const weekParam = searchParams.get('week')
  const initialWeek = weekParam ? Number(weekParam) : null

  const [flow, setFlow] = useState(() => (editId || weekParam ? 'diary' : 'chooser'))

  const { data: marksListData, isLoading: marksLoading } = useQuery({
    queryKey: ['marks', 'all'],
    queryFn: () => api.get('/marks').then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
    enabled: flow === 'chooser',
  })
  const currentSemMarks = useMemo(() => {
    const all = marksListData?.data || []
    return all.find(m => m.semester === semester) || null
  }, [marksListData, semester])

  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements', 'list', { semester, academic_year: academicYear }],
    queryFn: () => api.get('/achievements', { params: { semester, academic_year: academicYear } }).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
    enabled: flow === 'chooser',
  })
  const achievementsCount = useMemo(() => (achievementsData?.data || []).length, [achievementsData])

  const { data: editEntryData } = useQuery({
    queryKey: ['diary', 'entry', editId],
    queryFn: () => api.get(`/diary/${editId}`).then(r => r.data),
    staleTime: 5 * 60 * 1000, retry: 1,
    enabled: !!editId,
  })
  const editEntry = editEntryData?.data || null

  return (
    <>
      <style>{`@keyframes sePulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      <div style={{ maxWidth: '860px' }}>
        <AnimatePresence mode="wait">
          {flow === 'chooser' && (
            <motion.div key="chooser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TypeChooser onSelect={setFlow} currentSemMarks={currentSemMarks} achievementsCount={achievementsCount} marksLoading={marksLoading} achievementsLoading={achievementsLoading} />
            </motion.div>
          )}
          {flow === 'diary' && (
            <motion.div key="diary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DiaryFlow onCancel={() => setFlow('chooser')} editEntry={editEntry} initialWeek={initialWeek} user={user} semester={semester} academicYear={academicYear} addToast={addToast} />
            </motion.div>
          )}
          {flow === 'marks' && (
            <motion.div key="marks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MarksFlow onCancel={() => setFlow('chooser')} semester={semester} academicYear={academicYear} addToast={addToast} />
            </motion.div>
          )}
          {flow === 'achievement' && (
            <motion.div key="achievement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AchievementFlow onCancel={() => setFlow('chooser')} achievementsCount={achievementsCount} semester={semester} academicYear={academicYear} addToast={addToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
