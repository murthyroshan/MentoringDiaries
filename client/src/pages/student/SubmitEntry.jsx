import { Fragment, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import api from '../../services/api'
import { ChevronLeft, Check } from 'lucide-react'
import { getWeekDateRange } from '../../utils/weekDates'
import { format } from 'date-fns'
import confetti from 'canvas-confetti'

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function getCurrentWeekNumber() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function getCurrentISOWeekYear() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

/**
 * Returns the ISO week number for an arbitrary Date.
 */
function isoWeekOf(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/**
 * Build the list of all submittable weeks from semester start to current week.
 * Semester start: week 1 of the current academic year (September of that year
 * for autumn semester, or Jan of next for spring).
 * For simplicity we use the academic year start (early Sep) as "week 35" of
 * the prior calendar year, and compute back from there.
 * In practice we use a fixed anchor: Semester 1 starts at week 36 of the year
 * (approx. first week of September), Semester 2 at week 2 of the new calendar year.
 * We generate weeks from the closest semester start up to (and including) the
 * current week, with at most 20 weeks.
 */
function buildSubmittableWeeks() {
  const now = new Date()
  const currentWeekNum = getCurrentWeekNumber()
  const currentYear = getCurrentISOWeekYear()

  // Determine semester start week.
  // Month 0–5 (Jan–Jun) → spring semester starting ~week 2.
  // Month 6–11 (Jul–Dec) → autumn semester starting ~week 36.
  const month = now.getMonth()
  let semesterStartWeek, semesterStartYear
  if (month >= 6) {
    semesterStartWeek = 36
    semesterStartYear = currentYear
  } else {
    semesterStartWeek = 2
    semesterStartYear = currentYear
  }

  const weeks = []
  let w = semesterStartWeek
  let y = semesterStartYear

  // Generate up to 26 weeks, stopping at current week
  for (let count = 0; count < 26; count++) {
    // If we've gone past the current week+year, stop
    if (y > currentYear || (y === currentYear && w > currentWeekNum)) break

    const { startDate, endDate } = getWeekDateRange(w, y)
    const startFmt = format(startDate, 'd MMM')
    const endFmt = format(endDate, 'd MMM yyyy')
    const isCurrent = w === currentWeekNum && y === currentYear

    weeks.push({
      weekNumber: w,
      weekYear: y,
      startDate,
      endDate,
      label: `Week ${w} · ${startFmt} – ${endFmt}${isCurrent ? ' (current)' : ''}`,
      isCurrent,
    })

    // Advance to next week, handling year boundary
    w++
    // ISO weeks: most years have 52, some have 53.
    // Week 53 only exists in certain years. Simple heuristic: if week > 52,
    // check if week 53 exists by seeing if Dec 31 falls on Thu or later.
    const dec31 = new Date(Date.UTC(y, 11, 31))
    const dec31Day = dec31.getUTCDay() || 7
    const hasWeek53 = dec31Day >= 4 // Thu, Fri, Sat, or Sun
    const maxWeek = hasWeek53 ? 53 : 52

    if (w > maxWeek) {
      w = 1
      y++
    }
  }

  return weeks
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: '😔', label: 'Tough' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Great' },
  { emoji: '🤩', label: 'Amazing' },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const EMOTIONS = ['Anxious', 'Stressed', 'Neutral', 'Motivated', 'Confident']
const EMOTION_COLORS = {
  Anxious: '#EF4444',
  Stressed: '#F59E0B',
  Neutral: 'rgba(242,240,232,0.3)',
  Motivated: '#3B82F6',
  Confident: '#E8B84B',
}
const SUBJECTS = ['Mathematics', 'Computer Science', 'English', 'Physics', 'History']

// AI staged progress labels
const AI_STAGE_LABELS = [
  'Submitting your entry...',
  'Analysing your mood and attendance...',
  'Running AI risk assessment...',
  'Generating insights...',
  'Complete',
]

// ─── Framer Motion variants ───────────────────────────────────────────────────

// Forward (next step): content enters from right, exits left
const forwardVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2, ease: 'easeIn' } },
}

// Backward (prev step): content enters from left, exits right
const backwardVariants = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GoldButton({ children, onClick, disabled, style = {} }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      style={{
        padding: '14px 24px',
        borderRadius: '14px',
        fontSize: '14px',
        background: disabled
          ? 'rgba(232,184,75,0.25)'
          : 'linear-gradient(135deg,#E8B84B 0%,#F5D380 50%,#E8B84B 100%)',
        color: disabled ? 'rgba(6,6,10,0.5)' : '#06060A',
        fontWeight: 700,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

function BackButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '14px 18px',
        borderRadius: '14px',
        fontSize: '14px',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(242,240,232,0.5)',
        border: '1px solid rgba(255,255,255,0.07)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <ChevronLeft size={16} /> Back
    </button>
  )
}

// ─── Counting animation for risk score ───────────────────────────────────────
function AnimatedCount({ target, duration = 1000 }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target == null) return
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{value}</>
}

// ─── Success Overlay ─────────────────────────────────────────────────────────
function SuccessOverlay({ score }) {
  const navigate = useNavigate()

  // Fire canvas-confetti on mount
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E8B84B', '#F5D380', '#D4622A', '#3DD68C'],
    })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(6,6,10,0.96)',
        borderRadius: '24px',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ marginBottom: '20px' }}>
        <circle cx="32" cy="32" r="30" fill="rgba(61,214,140,0.1)" stroke="#3DD68C" strokeWidth="1.5" />
        <motion.path
          d="M20 32l8 8 16-16"
          stroke="#3DD68C"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        />
      </svg>
      <h3
        style={{
          fontFamily: '"Sora",system-ui',
          fontSize: '26px',
          fontWeight: 700,
          color: '#F2F0E8',
          margin: 0,
          textAlign: 'center',
        }}
      >
        Entry submitted!
      </h3>
      {score != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <span style={{ fontSize: '14px', color: 'rgba(242,240,232,0.6)' }}>
            AI Risk Score:{' '}
            <strong style={{ color: score < 40 ? '#3DD68C' : score < 70 ? '#F59E0B' : '#EF4444' }}>
              <AnimatedCount target={score} duration={1000} />
            </strong>
          </span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              background: score < 40 ? 'rgba(61,214,140,0.1)' : score < 70 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: score < 40 ? '#3DD68C' : score < 70 ? '#F59E0B' : '#EF4444',
              border: `1px solid ${score < 40 ? 'rgba(61,214,140,0.2)' : score < 70 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {score < 40 ? 'Low Risk' : score < 70 ? 'Medium Risk' : 'High Risk'}
          </span>
        </div>
      )}
      <p
        style={{
          fontSize: '13px',
          color: 'rgba(242,240,232,0.4)',
          marginTop: '8px',
          textAlign: 'center',
        }}
      >
        Your mentor will review shortly
      </p>
      <button
        onClick={() => navigate('/student/entries')}
        style={{
          marginTop: '24px',
          padding: '12px 28px',
          borderRadius: '14px',
          fontSize: '14px',
          background: 'linear-gradient(135deg,#E8B84B,#F5D380)',
          color: '#06060A',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        View my entries →
      </button>
    </motion.div>
  )
}

// ─── AI Progress Bar ──────────────────────────────────────────────────────────
function AiProgressBar({ stage, pct }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '12px', color: 'rgba(242,240,232,0.55)', marginBottom: '8px' }}
        >
          {AI_STAGE_LABELS[Math.min(stage, AI_STAGE_LABELS.length - 1)]}
        </motion.div>
      </AnimatePresence>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#E8B84B',
            borderRadius: '999px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1({ formData, setFormData, onNext, direction, submittedWeeks, allWeeks }) {
  const set = (key, val) => setFormData(d => ({ ...d, [key]: val }))
  const [errors, setErrors] = useState({})
  const moodRef = useRef(null)
  const variants = direction === 'back' ? backwardVariants : forwardVariants

  function validate() {
    const errs = {}
    if (formData.mood === null) errs.mood = 'Please select a mood'
    if (formData.attendance.length < 4 && formData.attendanceExplanation.trim().length < 10)
      errs.attendance = 'Please explain your attendance (min 10 chars)'
    return errs
  }

  function handleNext() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    onNext()
  }

  // Derive the currently-selected week object
  const selectedWeek = allWeeks.find(
    w => w.weekNumber === formData.weekNumber && w.weekYear === formData.weekYear
  ) || allWeeks[allWeeks.length - 1]

  const isLateSubmission = selectedWeek && !selectedWeek.isCurrent

  return (
    <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h2
            style={{
              fontFamily: '"Sora",system-ui,sans-serif',
              fontSize: '22px',
              fontWeight: 700,
              color: '#F2F0E8',
              margin: 0,
            }}
          >
            How was your week?
          </h2>
          {isLateSubmission && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(245,158,11,0.12)',
                color: '#F59E0B',
                border: '1px solid rgba(245,158,11,0.25)',
                fontWeight: 600,
              }}
            >
              Late submission — Week {formData.weekNumber}
            </motion.span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
          {selectedWeek
            ? `${format(selectedWeek.startDate, 'd MMM')} – ${format(selectedWeek.endDate, 'd MMM yyyy')}`
            : format(new Date(), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Week selector */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '12px',
            color: 'rgba(242,240,232,0.45)',
            marginBottom: '8px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Select Week
        </label>
        <select
          value={`${formData.weekNumber}-${formData.weekYear}`}
          onChange={e => {
            const [wn, wy] = e.target.value.split('-').map(Number)
            const { startDate, endDate } = getWeekDateRange(wn, wy)
            setFormData(d => ({ ...d, weekNumber: wn, weekYear: wy, _startDate: startDate, _endDate: endDate }))
          }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#F2F0E8',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {[...allWeeks].reverse().map(w => {
            const alreadySubmitted = submittedWeeks.has(`${w.weekNumber}-${w.weekYear}`)
            return (
              <option
                key={`${w.weekNumber}-${w.weekYear}`}
                value={`${w.weekNumber}-${w.weekYear}`}
                disabled={alreadySubmitted}
              >
                {alreadySubmitted
                  ? `Week ${w.weekNumber} · already submitted`
                  : w.label}
              </option>
            )
          })}
        </select>
      </div>

      {/* Mood picker */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '12px',
            color: errors.mood ? 'rgba(239,68,68,0.8)' : 'rgba(242,240,232,0.45)',
            marginBottom: '12px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Overall Mood {errors.mood ? '— ' + errors.mood : ''}
        </label>
        <motion.div
          ref={moodRef}
          animate={errors.mood ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={errors.mood ? { duration: 0.4 } : {}}
          style={{ display: 'flex', gap: '10px' }}
        >
          {MOODS.map((m, i) => (
            <motion.button
              key={i}
              onClick={() => { set('mood', i); setErrors(e => ({ ...e, mood: undefined })) }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                background: formData.mood === i ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${formData.mood === i ? 'rgba(232,184,75,0.3)' : errors.mood ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: formData.mood === i ? '0 0 20px rgba(232,184,75,0.12)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{ fontSize: formData.mood === i ? '32px' : '28px', transition: 'font-size 0.2s' }}>
                {m.emoji}
              </span>
              <span style={{ fontSize: '11px', color: formData.mood === i ? '#E8B84B' : 'rgba(242,240,232,0.4)' }}>
                {m.label}
              </span>
            </motion.button>
          ))}
        </motion.div>
        <AnimatePresence>
          {errors.mood && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}
            >
              {errors.mood}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Attendance */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '12px',
            color: 'rgba(242,240,232,0.45)',
            marginBottom: '12px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Attendance This Week
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {DAYS.map((day, i) => {
            const present = formData.attendance.includes(i)
            return (
              <button
                key={i}
                onClick={() =>
                  set(
                    'attendance',
                    present
                      ? formData.attendance.filter(d => d !== i)
                      : [...formData.attendance, i]
                  )
                }
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: present ? 'rgba(232,184,75,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${present ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: present ? '#E8B84B' : 'rgba(242,240,232,0.3)',
                  transition: 'all 0.15s',
                }}
              >
                {day}
              </button>
            )
          })}
          <span style={{ fontSize: '12px', color: 'rgba(242,240,232,0.35)', marginLeft: '8px' }}>
            {formData.attendance.length}/5 days
          </span>
        </div>
      </div>

      {formData.attendance.length < 4 && (
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              fontSize: '12px',
              color: errors.attendance ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.8)',
              marginBottom: '8px',
              display: 'block',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Please explain your attendance *
          </label>
          <motion.div
            animate={errors.attendance ? { x: [0, -8, 8, -8, 8, 0] } : {}}
            transition={errors.attendance ? { duration: 0.4 } : {}}
          >
            <textarea
              placeholder="Why were you absent? (e.g. illness, family emergency...)"
              value={formData.attendanceExplanation}
              onChange={e => { set('attendanceExplanation', e.target.value); setErrors(er => ({ ...er, attendance: undefined })) }}
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${formData.attendanceExplanation.trim().length >= 10 ? 'rgba(232,184,75,0.3)' : errors.attendance ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: '16px',
                padding: '14px 16px',
                color: '#F2F0E8',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </motion.div>
          <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.3)' }}>
            {formData.attendanceExplanation.trim().length} / 10 min chars
          </span>
          <AnimatePresence>
            {errors.attendance && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}
              >
                {errors.attendance}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <label
          style={{
            fontSize: '12px',
            color: 'rgba(242,240,232,0.45)',
            marginBottom: '12px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Overall Week Rating
        </label>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.3)' }}>Difficult</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#E8B84B' }}>{formData.weekRating}</span>
            <span style={{ fontSize: '11px', color: 'rgba(242,240,232,0.3)' }}>Excellent</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={formData.weekRating}
            onChange={e => set('weekRating', +e.target.value)}
            style={{ width: '100%', accentColor: '#E8B84B', cursor: 'pointer', height: '4px' }}
          />
        </div>
      </div>

      <GoldButton onClick={handleNext}>
        Continue →
      </GoldButton>
    </motion.div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({ formData, setFormData, onNext, onBack, direction }) {
  const variants = direction === 'back' ? backwardVariants : forwardVariants
  const subjects =
    formData.subjects.length > 0
      ? formData.subjects
      : SUBJECTS.map(name => ({ name, rating: 0, comment: '' }))

  function setSubjectField(idx, field, val) {
    const updated = subjects.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    setFormData(d => ({ ...d, subjects: updated }))
  }

  return (
    <motion.div variants={variants} initial="initial" animate="animate" exit="exit">
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontFamily: '"Sora",system-ui,sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#F2F0E8',
            margin: 0,
          }}
        >
          Rate your subjects
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
          How did each subject go this week?
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {subjects.map((sub, i) => (
          <div
            key={i}
            style={{
              background: sub.rating > 0 ? 'rgba(232,184,75,0.02)' : '#0C0C12',
              border: `1px solid ${sub.rating > 0 ? 'rgba(232,184,75,0.15)' : 'rgba(255,255,255,0.06)'}`,
              borderLeft: sub.rating > 0 ? '3px solid rgba(232,184,75,0.4)' : '3px solid transparent',
              borderRadius: '12px',
              padding: '14px',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#F2F0E8', marginBottom: '10px' }}>
              {sub.name}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <motion.button
                  key={star}
                  onClick={() => setSubjectField(i, 'rating', star)}
                  whileTap={{ scale: 1.3 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    fontSize: '16px',
                    color: star <= sub.rating ? '#E8B84B' : 'rgba(242,240,232,0.15)',
                    transition: 'color 0.15s',
                  }}
                >
                  ★
                </motion.button>
              ))}
            </div>
            <input
              placeholder="Notes? (optional)"
              value={sub.comment}
              onChange={e => setSubjectField(i, 'comment', e.target.value)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(242,240,232,0.6)',
                fontSize: '11px',
                padding: '2px 0',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '12px',
            color: 'rgba(242,240,232,0.45)',
            marginBottom: '8px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Challenges This Week
        </label>
        <div style={{ position: 'relative' }}>
          <textarea
            placeholder="Any challenges or problems you faced this week?"
            value={formData.problemsFaced}
            onChange={e => setFormData(d => ({ ...d, problemsFaced: e.target.value }))}
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '14px 16px',
              color: '#F2F0E8',
              fontSize: '13px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(232,184,75,0.3)'
              e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.06)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(255,255,255,0.07)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '12px',
              fontSize: '10px',
              color: 'rgba(242,240,232,0.2)',
            }}
          >
            {formData.problemsFaced.length} chars
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <BackButton onClick={onBack} />
        <GoldButton onClick={onNext} style={{ flex: 1 }}>
          Continue →
        </GoldButton>
      </div>
    </motion.div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3({ formData, setFormData, onSubmit, onBack, submitState, aiStage, aiPct, aiScore, direction }) {
  const [errors, setErrors] = useState({})
  const variants = direction === 'back' ? backwardVariants : forwardVariants

  const wordCount = formData.reflection
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  const moodEmoji = wordCount > 50 ? '🌟' : '💭'

  function handleSubmit() {
    const errs = {}
    if (formData.reflection.trim().length < 50) {
      errs.reflection = `Need ${50 - formData.reflection.trim().length} more characters`
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    onSubmit()
  }

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ position: 'relative' }}
    >
      <AnimatePresence>
        {submitState === 'success' && <SuccessOverlay score={aiScore} />}
      </AnimatePresence>

      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontFamily: '"Sora",system-ui,sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#F2F0E8',
            margin: 0,
          }}
        >
          Your reflection
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
          What's on your mind this week?
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <motion.div
          animate={errors.reflection ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={errors.reflection ? { duration: 0.4 } : {}}
        >
          <textarea
            placeholder={"What's on your mind this week?\nShare your thoughts, challenges, and wins..."}
            value={formData.reflection}
            onChange={e => { setFormData(d => ({ ...d, reflection: e.target.value })); setErrors(er => ({ ...er, reflection: undefined })) }}
            rows={8}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${errors.reflection ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '16px',
              padding: '16px 16px 40px',
              color: 'rgba(242,240,232,0.85)',
              fontSize: '13px',
              lineHeight: '1.7',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(232,184,75,0.3)'
              e.target.style.boxShadow = '0 0 0 3px rgba(232,184,75,0.08)'
              e.target.style.background = 'rgba(255,255,255,0.03)'
            }}
            onBlur={e => {
              e.target.style.borderColor = errors.reflection ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'
              e.target.style.boxShadow = 'none'
              e.target.style.background = 'rgba(255,255,255,0.02)'
            }}
          />
        </motion.div>
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '16px' }}>{moodEmoji}</span>
          <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)' }}>
            {wordCount} / 500 words
          </span>
        </div>
        <AnimatePresence>
          {errors.reflection && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}
            >
              {errors.reflection}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            fontSize: '12px',
            color: 'rgba(242,240,232,0.45)',
            marginBottom: '10px',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Emotional State
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {EMOTIONS.map((em, i) => {
            const active = formData.emotionalState === i
            const color = EMOTION_COLORS[em]
            return (
              <button
                key={i}
                onClick={() => setFormData(d => ({ ...d, emotionalState: i }))}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: active ? `${color}18` : 'transparent',
                  border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
                  color: active ? color : 'rgba(242,240,232,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                {em}
              </button>
            )
          })}
        </div>
      </div>

      {submitState === 'loading' && (
        <AiProgressBar stage={aiStage} pct={aiPct} />
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <BackButton onClick={onBack} disabled={submitState === 'loading'} />
        <GoldButton
          onClick={handleSubmit}
          disabled={submitState === 'loading'}
          style={{ flex: 1 }}
        >
          {submitState === 'loading'
            ? 'Analyzing with AI...'
            : 'Submit entry →'}
        </GoldButton>
      </div>
    </motion.div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
      }}
    >
      {[1, 2, 3].map((s, i) => (
        <Fragment key={s}>
          <div style={{ position: 'relative' }}>
            {/* Pulsing ring for current step */}
            {step === s && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: '2px solid rgba(232,184,75,0.4)',
                  pointerEvents: 'none',
                }}
              />
            )}
            <motion.div
              animate={{
                background: step > s ? '#E8B84B' : step === s ? 'rgba(232,184,75,0.15)' : 'rgba(255,255,255,0.04)',
                borderColor: step >= s ? '#E8B84B' : 'rgba(255,255,255,0.08)',
              }}
              transition={{ duration: 0.3 }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                border: '1.5px solid',
                color: step > s ? '#06060A' : step === s ? '#E8B84B' : 'rgba(242,240,232,0.3)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <AnimatePresence mode="wait">
                {step > s ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex' }}
                  >
                    <Check size={14} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="num"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {s}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          {i < 2 && (
            <motion.div
              animate={{ background: step > s ? '#E8B84B' : 'rgba(255,255,255,0.06)' }}
              transition={{ duration: 0.3 }}
              style={{
                width: '60px',
                height: '2px',
                margin: '0 8px',
              }}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubmitEntry() {
  const reduced = useReducedMotion()
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState('forward')

  const allWeeks = buildSubmittableWeeks()
  const currentWeek = allWeeks[allWeeks.length - 1]

  const [formData, setFormData] = useState({
    mood: null,
    attendance: [],
    weekRating: 5,
    subjects: [],
    problemsFaced: '',
    reflection: '',
    emotionalState: null,
    weekNumber: currentWeek?.weekNumber ?? getCurrentWeekNumber(),
    weekYear: currentWeek?.weekYear ?? getCurrentISOWeekYear(),
    attendanceExplanation: '',
    _startDate: null,
    _endDate: null,
  })
  const [submitState, setSubmitState] = useState('idle')
  const [aiStage, setAiStage] = useState(0)
  const [aiPct, setAiPct] = useState(0)
  const [aiScore, setAiScore] = useState(null)

  // Fetch existing entries to know which weeks are already submitted
  const { data: existingEntriesData } = useQuery({
    queryKey: ['submit-existing-entries'],
    queryFn: () => api.get('/diary?limit=100').then(r => r.data?.data || r.data?.entries || []),
    retry: false,
  })

  const submittedWeeks = new Set(
    (Array.isArray(existingEntriesData) ? existingEntriesData : [])
      .filter(e => e.week_number)
      .map(e => {
        const dateStr = e.start_date || e.created_at
        const sd = dateStr ? new Date(dateStr) : null
        const wy = sd ? (() => {
          const d = new Date(Date.UTC(sd.getFullYear(), sd.getMonth(), sd.getDate()))
          const dayNum = d.getUTCDay() || 7
          d.setUTCDate(d.getUTCDate() + 4 - dayNum)
          return d.getUTCFullYear()
        })() : formData.weekYear
        return `${e.week_number}-${wy}`
      })
  )

  function goNext() {
    setDirection('forward')
    setStep(s => s + 1)
  }

  function goBack() {
    setDirection('back')
    setStep(s => s - 1)
  }

  async function handleSubmit() {
    if (submitState !== 'idle') return
    setSubmitState('loading')
    setAiStage(0)
    setAiPct(0)

    try {
      // Map form data to server model field names (DiaryEntry schema)
      const subjects =
        formData.subjects.length > 0
          ? formData.subjects
          : SUBJECTS.map(name => ({ name, rating: 3, comment: '' }))

      const { startDate, endDate } = getWeekDateRange(formData.weekNumber, formData.weekYear)

      // Check overlap before submitting
      try {
        const rangeCheck = await api.get(
          `/diary/check-range?week_number=${formData.weekNumber}`
        )
        if (rangeCheck.data?.overlap) {
          addToast('You already submitted an entry for this week', 'error')
          setSubmitState('idle')
          setAiPct(0)
          return
        }
      } catch {
        // Non-fatal: continue submission if check-range fails
      }

      // Stage 1: 0 → 20% (submitting)
      setAiStage(0)
      setAiPct(0)
      // Small delay so bar animates from 0 before the request fires
      await new Promise(r => setTimeout(r, 50))
      setAiPct(20)

      const payload = {
        // Section A — required, min 50 chars
        reflection: formData.reflection,
        // Week number + ISO date range
        week_number: formData.weekNumber,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        // Section B — subjectRatings array of {name, rating, comment}
        subjectRatings: subjects
          .filter(s => s.rating > 0)
          .map(s => ({ name: s.name, rating: s.rating, comment: s.comment || '' })),
        // Section C — challenges text
        challenges: formData.problemsFaced || '',
        // Section D — weekly difficulty rating
        weekly_difficulty: formData.weekRating || 5,
        // Mood 1-5
        mood: formData.mood !== null ? formData.mood + 1 : 3,
        ...(formData.attendance.length < 4 && {
          attendance_explanation: formData.attendanceExplanation,
        }),
      }

      // Stage 1 → API call completes
      const res = await api.post('/diary', payload)
      const score = res.data?.data?.ai_risk_score ?? res.data?.data?.aiAnalysis?.riskScore ?? null
      setAiScore(score)

      // Stage 2: 20 → 50% — "Analysing mood and attendance"
      setAiStage(1)
      setAiPct(50)
      await new Promise(r => setTimeout(r, 600))

      // Stage 3: 50 → 80% — "Running AI risk assessment"
      setAiStage(2)
      setAiPct(80)
      await new Promise(r => setTimeout(r, 400))

      // Stage 4: 80 → 95% — "Generating insights"
      setAiStage(3)
      setAiPct(95)
      await new Promise(r => setTimeout(r, 300))

      // Stage 5: snap to 100%
      setAiStage(4)
      setAiPct(100)
      await new Promise(r => setTimeout(r, 200))

      setSubmitState('success')
      queryClient.invalidateQueries({ queryKey: ['student-overview'] })
      queryClient.invalidateQueries({ queryKey: ['my-entries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline-entries'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['submit-existing-entries'] })
      queryClient.invalidateQueries({ queryKey: ['student-entries-recent'] })
    } catch (err) {
      setSubmitState('idle')
      setAiPct(0)
      setAiStage(0)
      addToast(err?.response?.data?.message || 'Submission failed. Please try again.', 'error')
    }
  }

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? {} : { opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ maxWidth: '760px', margin: '0 auto' }}
    >
      <div style={{ marginBottom: '28px' }}>
        <h1
          style={{
            fontFamily: '"Sora",system-ui',
            fontSize: '24px',
            fontWeight: 700,
            color: '#F2F0E8',
            margin: 0,
          }}
        >
          Write Entry
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
          Week {formData.weekNumber} check-in
        </p>
      </div>

      <StepIndicator step={step} />

      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '680px',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1
              key="step1"
              formData={formData}
              setFormData={setFormData}
              onNext={goNext}
              direction={direction}
              submittedWeeks={submittedWeeks}
              allWeeks={allWeeks}
            />
          )}
          {step === 2 && (
            <Step2
              key="step2"
              formData={formData}
              setFormData={setFormData}
              onNext={goNext}
              onBack={goBack}
              direction={direction}
            />
          )}
          {step === 3 && (
            <Step3
              key="step3"
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onBack={goBack}
              submitState={submitState}
              aiStage={aiStage}
              aiPct={aiPct}
              aiScore={aiScore}
              direction={direction}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
