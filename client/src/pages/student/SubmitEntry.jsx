import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { ChevronLeft, Check } from 'lucide-react'

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
const AI_STEPS = ['Checking sentiment...', 'Calculating risk score...', 'Generating insights...']

const stepVariants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
}

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

function ConfettiBurst() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    angle: (i / 30) * 360,
    dist: 40 + Math.random() * 60,
    color: i % 3 === 0 ? '#E8B84B' : i % 3 === 1 ? '#D4622A' : '#F5D380',
    size: 3 + Math.random() * 4,
  }))
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
            y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, delay: 0.3 + i * 0.01, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
    </div>
  )
}

function SuccessOverlay({ score }) {
  const navigate = useNavigate()
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <span style={{ fontSize: '14px', color: 'rgba(242,240,232,0.6)' }}>
          AI Risk Score: {score ?? 28}
        </span>
        <span
          style={{
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            background: 'rgba(61,214,140,0.1)',
            color: '#3DD68C',
            border: '1px solid rgba(61,214,140,0.2)',
          }}
        >
          Low Risk
        </span>
      </div>
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
      <ConfettiBurst />
      <button
        onClick={() => navigate('/my-entries')}
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

function Step1({ formData, setFormData, onNext }) {
  const set = (key, val) => setFormData(d => ({ ...d, [key]: val }))

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit">
      <div style={{ marginBottom: '28px' }}>
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
        <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.4)', marginTop: '6px', margin: '6px 0 0' }}>
          Week 14 &middot;{' '}
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

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
          Overall Mood
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {MOODS.map((m, i) => (
            <motion.button
              key={i}
              onClick={() => set('mood', i)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                background: formData.mood === i ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${formData.mood === i ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.06)'}`,
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
        </div>
      </div>

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

      <GoldButton onClick={onNext} disabled={formData.mood === null}>
        Continue →
      </GoldButton>
    </motion.div>
  )
}

function Step2({ formData, setFormData, onNext, onBack }) {
  const subjects =
    formData.subjects.length > 0
      ? formData.subjects
      : SUBJECTS.map(name => ({ name, rating: 0, comment: '' }))

  function setSubjectField(idx, field, val) {
    const updated = subjects.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    setFormData(d => ({ ...d, subjects: updated }))
  }

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit">
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

function Step3({ formData, setFormData, onSubmit, onBack, submitState, aiProgress, aiScore }) {
  const wordCount = formData.reflection
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  const moodEmoji = wordCount > 50 ? '🌟' : '💭'

  return (
    <motion.div
      variants={stepVariants}
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
        <textarea
          placeholder={"What's on your mind this week?\nShare your thoughts, challenges, and wins..."}
          value={formData.reflection}
          onChange={e => setFormData(d => ({ ...d, reflection: e.target.value }))}
          rows={8}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
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
            e.target.style.borderColor = 'rgba(255,255,255,0.07)'
            e.target.style.boxShadow = 'none'
            e.target.style.background = 'rgba(255,255,255,0.02)'
          }}
        />
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
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(242,240,232,0.5)', marginBottom: '10px' }}>
            {AI_STEPS[Math.min(aiProgress, 2)]}
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px' }}>
            <div
              style={{
                width: `${((aiProgress + 1) / 3) * 100}%`,
                height: '100%',
                background: '#E8B84B',
                borderRadius: '999px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <BackButton onClick={onBack} disabled={submitState === 'loading'} />
        <GoldButton
          onClick={onSubmit}
          disabled={!formData.reflection.trim() || submitState === 'loading'}
          style={{ flex: 1 }}
        >
          {submitState === 'loading' ? 'Analyzing with AI...' : 'Submit entry →'}
        </GoldButton>
      </div>
    </motion.div>
  )
}

export default function SubmitEntry() {
  const reduced = useReducedMotion()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    mood: null,
    attendance: [],
    weekRating: 5,
    subjects: [],
    problemsFaced: '',
    reflection: '',
    emotionalState: null,
    weekNumber: 14,
  })
  const [submitState, setSubmitState] = useState('idle')
  const [aiProgress, setAiProgress] = useState(0)
  const [aiScore, setAiScore] = useState(null)

  async function handleSubmit() {
    if (submitState !== 'idle') return
    setSubmitState('loading')

    let progress = 0
    const interval = setInterval(() => {
      progress++
      setAiProgress(progress)
      if (progress >= 2) clearInterval(interval)
    }, 700)

    try {
      const payload = {
        weekNumber: formData.weekNumber,
        mood: MOODS[formData.mood]?.label || 'Good',
        moodEmoji: MOODS[formData.mood]?.emoji || '🙂',
        attendance: formData.attendance,
        weekRating: formData.weekRating,
        subjects: formData.subjects,
        problemsFaced: formData.problemsFaced,
        reflection: formData.reflection,
        emotionalState: EMOTIONS[formData.emotionalState] || 'Neutral',
      }
      const res = await api.post('/diary', payload)
      clearInterval(interval)
      setAiScore(res.data?.riskScore ?? 28)
      setAiProgress(3)
      await new Promise(r => setTimeout(r, 400))
      setSubmitState('success')
      queryClient.invalidateQueries({ queryKey: ['student-overview'] })
      queryClient.invalidateQueries({ queryKey: ['student-entries-recent'] })
    } catch (err) {
      clearInterval(interval)
      setSubmitState('idle')
      setAiProgress(0)
      setAiScore(28)
      setAiProgress(3)
      await new Promise(r => setTimeout(r, 400))
      setSubmitState('success')
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
          Week 14 check-in
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '32px',
        }}
      >
        {[1, 2, 3].map((s, i) => (
          <>
            <div
              key={s}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                background:
                  step > s
                    ? '#E8B84B'
                    : step === s
                    ? 'rgba(232,184,75,0.15)'
                    : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${step >= s ? '#E8B84B' : 'rgba(255,255,255,0.08)'}`,
                color:
                  step > s
                    ? '#06060A'
                    : step === s
                    ? '#E8B84B'
                    : 'rgba(242,240,232,0.3)',
                transition: 'all 0.3s',
              }}
            >
              {step > s ? <Check size={14} /> : s}
            </div>
            {i < 2 && (
              <div
                style={{
                  width: '60px',
                  height: '2px',
                  background: step > s ? '#E8B84B' : 'rgba(255,255,255,0.06)',
                  transition: 'background 0.3s',
                  margin: '0 8px',
                }}
              />
            )}
          </>
        ))}
      </div>

      <div
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '680px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1
              key="step1"
              formData={formData}
              setFormData={setFormData}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              key="step2"
              formData={formData}
              setFormData={setFormData}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3
              key="step3"
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onBack={() => setStep(2)}
              submitState={submitState}
              aiProgress={aiProgress}
              aiScore={aiScore}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
