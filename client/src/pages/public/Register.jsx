import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowLeft, BookOpen, Users, Shield } from 'lucide-react'

import api                from '../../services/api'
import { useAuthStore }   from '../../store/authStore'
import AuthBackground     from '../../components/auth/AuthBackground'
import FormCard           from '../../components/auth/FormCard'
import FloatingBgCards    from '../../components/auth/FloatingBgCards'
import FloatingLabelInput from '../../components/auth/FloatingLabelInput'
import ErrorToast         from '../../components/auth/ErrorToast'
import ScrambleText       from '../../components/auth/ScrambleText'

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(2, 'Full name must be at least 2 characters'),
  email:       z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  institution: z.string().min(2, 'Institution name is required'),
  phone:       z.string().optional(),
  year:        z.string().optional(),
  role:        z.enum(['student', 'mentor', 'admin'], { required_error: 'Please select a role' }),
  terms:       z.boolean().refine(v => v === true, { message: 'You must accept the terms' }),
})

// ── Spinner ───────────────────────────────────────────────────────────────────
const SPINNER_CSS = `@keyframes auth-spin { to { transform: rotate(360deg) } }`
const SHIMMER_CSS = `
@keyframes btn-shimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
`

function Spinner() {
  return (
    <span style={{
      display:'inline-block', width:'16px', height:'16px', flexShrink:0,
      border:'2px solid rgba(6,6,10,0.3)', borderTop:'2px solid #06060A',
      borderRadius:'50%', animation:'auth-spin 0.7s linear infinite',
    }} />
  )
}

function AnimatedCheck({ color = '#06060A' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0 }}>
      <motion.path
        d="M3 9l4 4 8-8"
        stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength:0 }}
        animate={{ pathLength:1 }}
        transition={{ duration:0.4, ease:'easeOut' }}
      />
    </svg>
  )
}

// ── Gold shimmer button ───────────────────────────────────────────────────────
function GoldButton({ state, children, onClick, type = 'button', disabled: forceDisable }) {
  const [offset,  setOffset]  = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const ref     = useRef(null)
  const reduced = useReducedMotion()

  const onMouseMove = useCallback((e) => {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width  / 2)
    const dy = e.clientY - (rect.top  + rect.height / 2)
    setOffset(Math.sqrt(dx * dx + dy * dy) < 70 ? { x: dx * 0.085, y: dy * 0.085 } : { x: 0, y: 0 })
  }, [reduced])

  const isLoading = state === 'loading'
  const isSuccess = state === 'success'
  const isOff     = isLoading || forceDisable

  const bgStyle = isSuccess
    ? { backgroundImage: 'linear-gradient(135deg, #10B981, #34D399)', backgroundSize: '200% auto' }
    : isOff
      ? { backgroundColor: 'rgba(232,184,75,0.65)' }
      : { backgroundImage: 'linear-gradient(135deg, #E8B84B 0%, #F5D380 40%, #E8B84B 80%)', backgroundSize: '200% auto' }

  return (
    <>
      <style>{SPINNER_CSS}{SHIMMER_CSS}</style>
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isOff}
        data-cursor="button"
        onMouseMove={onMouseMove}
        onMouseLeave={() => { setOffset({ x: 0, y: 0 }); setHovered(false) }}
        onMouseEnter={() => setHovered(true)}
        animate={reduced ? {} : { x: offset.x, y: offset.y }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          width:'100%', padding:'16px', borderRadius:'18px',
          ...bgStyle,
          animation: hovered && !isOff && !reduced ? 'btn-shimmer 1.2s linear infinite' : 'none',
          color:'#06060A', fontWeight:700, fontSize:'15px',
          border:'none', cursor: isOff ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          boxShadow: hovered && !isOff ? '0 20px 60px rgba(232,184,75,0.38)' : '0 8px 28px rgba(232,184,75,0.18)',
          transform: hovered && !isOff && !reduced ? 'scale(1.02)' : 'scale(1)',
          transition:'box-shadow 0.3s, transform 0.2s, background 0.3s',
          fontFamily:'inherit', pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        {isLoading && <Spinner />}
        {isSuccess && <AnimatedCheck />}
        {children}
      </motion.button>
    </>
  )
}

// ── Password strength ──────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null
  const checks   = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
  const strength = checks.filter(Boolean).length
  const labels   = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors   = ['', '#EF4444', '#F59E0B', '#3B82F6', '#E8B84B']
  const glows    = ['', 'none', 'none', 'none', '0 0 8px rgba(232,184,75,0.4)']

  return (
    <div style={{ marginTop: '-2px', paddingLeft: '2px' }}>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'4px' }}>
        <span style={{ fontSize:'11px', color: colors[strength] }}>{labels[strength]}</span>
      </div>
      <div style={{ display:'flex', gap:'3px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex:1, height:'3px', borderRadius:'9999px',
            background: i <= strength ? colors[strength] : 'rgba(255,255,255,0.07)',
            boxShadow:  i <= strength && i === 4 ? glows[4] : 'none',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
const STEP_LABELS = ['Account', 'Details', 'Role']

function StepIndicator({ current }) {
  const reduced = useReducedMotion()
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:'28px' }}>
      {STEP_LABELS.map((label, i) => {
        const n        = i + 1
        const isActive = n === current
        const isDone   = n < current
        return (
          <div key={label} style={{ display:'flex', alignItems:'center', flex: i < 2 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
              <motion.div
                animate={reduced ? {} : {
                  width:     isActive ? '14px' : '9px',
                  height:    isActive ? '14px' : '9px',
                  boxShadow: isActive ? '0 0 18px rgba(232,184,75,0.65)' : 'none',
                }}
                transition={{ duration: 0.3 }}
                style={{
                  borderRadius: '50%',
                  background:   isDone || isActive ? '#E8B84B' : 'transparent',
                  border:       isDone || isActive ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  flexShrink:   0,
                }}
              >
                {isDone && (
                  <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                    <path d="M1 3L3 5L6 1" stroke="#06060A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </motion.div>
              <span style={{
                fontSize:'10px', whiteSpace:'nowrap',
                color: isActive ? '#E8B84B' : 'rgba(242,240,232,0.28)',
                transition: 'color 0.3s',
              }}>
                {isActive && !reduced ? <ScrambleText text={label} trigger delay={0} /> : label}
              </span>
            </div>

            {i < 2 && (
              <div style={{ flex:1, height:'1px', margin:'0 6px', marginBottom:'18px', background:'rgba(255,255,255,0.08)', position:'relative', overflow:'hidden' }}>
                <div style={{
                  position:'absolute', left:0, top:0, height:'100%',
                  width: isDone ? '100%' : '0%',
                  background: '#E8B84B',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Role selector cards ────────────────────────────────────────────────────────
const ROLES = [
  { id:'student', label:'Student',  desc:'Track your growth weekly',           Icon:BookOpen, iconBg:'rgba(99,102,241,0.1)',  iconColor:'#818CF8' },
  { id:'mentor',  label:'Mentor',   desc:'Guide your assigned students',       Icon:Users,    iconBg:'rgba(232,184,75,0.1)',  iconColor:'#E8B84B' },
  { id:'admin',   label:'Admin',    desc:'Manage your institution',            Icon:Shield,   iconBg:'rgba(61,214,140,0.1)', iconColor:'#34D399' },
]

function RoleCard({ role, selected, onSelect }) {
  const { id, label, desc, Icon, iconBg, iconColor } = role
  const sel = selected === id
  return (
    <div
      onClick={() => onSelect(id)}
      data-cursor="hover"
      style={{
        background:   sel ? 'rgba(232,184,75,0.05)' : 'rgba(255,255,255,0.02)',
        border:       `1px solid ${sel ? 'rgba(232,184,75,0.38)' : 'rgba(255,255,255,0.06)'}`,
        borderLeft:   sel ? '3px solid #E8B84B' : '1px solid rgba(255,255,255,0.06)',
        boxShadow:    sel ? '0 0 0 1px rgba(232,184,75,0.08) inset' : 'none',
        borderRadius: '16px',
        padding:      '16px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          '14px',
        cursor:       'pointer',
        transition:   'all 0.2s ease',
        userSelect:   'none',
      }}
    >
      <div style={{
        width:'44px', height:'44px', borderRadius:'12px', background:iconBg,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <Icon size={19} color={iconColor} />
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'14px', fontWeight:600, margin:0, lineHeight:1.2, color: sel ? '#E8B84B' : '#F2F0E8', transition:'color 0.2s' }}>
          {label}
        </p>
        <p style={{ fontSize:'11px', color:'rgba(242,240,232,0.4)', margin:'3px 0 0', lineHeight:1.4 }}>{desc}</p>
      </div>

      <div style={{
        width:'20px', height:'20px', borderRadius:'50%', flexShrink:0,
        border:`1.5px solid ${sel ? '#E8B84B' : 'rgba(255,255,255,0.2)'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'border-color 0.2s',
      }}>
        <AnimatePresence>
          {sel && (
            <motion.div
              initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
              style={{
                width:'10px', height:'10px', borderRadius:'50%', background:'#E8B84B',
                boxShadow:'0 0 6px rgba(232,184,75,0.5)',
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Year pill selector ────────────────────────────────────────────────────────
const YEARS = ['1st', '2nd', '3rd', '4th', 'Other']

function YearPills({ value, onChange }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
      {YEARS.map(y => {
        const sel = value === y
        return (
          <button
            key={y}
            type="button"
            data-cursor="hover"
            onClick={() => onChange(y)}
            style={{
              padding:'8px 16px', borderRadius:'9999px', fontSize:'13px',
              border:`1px solid ${sel ? 'rgba(232,184,75,0.5)' : 'rgba(255,255,255,0.08)'}`,
              background: sel ? 'rgba(232,184,75,0.1)' : 'transparent',
              color:      sel ? '#E8B84B' : 'rgba(242,240,232,0.5)',
              cursor:     'pointer',
              transition: 'all 0.18s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; e.currentTarget.style.color='rgba(242,240,232,0.75)' } }}
            onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.color='rgba(242,240,232,0.5)' } }}
          >
            {y}
          </button>
        )
      })}
    </div>
  )
}

// ── Custom Checkbox ────────────────────────────────────────────────────────────
function Checkbox({ id, checked, onChange, children }) {
  return (
    <label htmlFor={id} style={{ display:'flex', alignItems:'flex-start', gap:'8px', cursor:'pointer', userSelect:'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width:'16px', height:'16px', minWidth:'16px', borderRadius:'4px', marginTop:'1px',
          border:`1.5px solid ${checked ? '#E8B84B' : 'rgba(232,184,75,0.3)'}`,
          background: checked ? '#E8B84B' : 'transparent',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.15s', cursor:'pointer',
        }}
      >
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="#06060A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} style={{ display:'none' }} />
      <span style={{ fontSize:'12px', color:'rgba(242,240,232,0.4)', lineHeight:1.5 }}>{children}</span>
    </label>
  )
}

// ── Step slide variants ───────────────────────────────────────────────────────
const stepVariants = {
  enter:  (dir) => ({ x: dir > 0 ? 80 : -80, opacity:0, scale:0.95 }),
  center: { x: 0, opacity:1, scale:1 },
  exit:   (dir) => ({ x: dir > 0 ? -80 : 80, opacity:0, scale:0.95 }),
}
const stepTransition = { duration: 0.32, ease: [0.4, 0, 0.2, 1] }

// ── Step heading map ──────────────────────────────────────────────────────────
const STEP_HEADINGS = ['Start your journey.', 'Tell us about you.', 'Who are you?']
const STEP_SUBS     = ['Create your credentials.', 'A little more detail.', 'This determines your dashboard.']
const BG_VARIANTS   = ['register-1', 'register-2', 'register-3']

// ── Card header ───────────────────────────────────────────────────────────────
function CardHeader({ onBack }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <div style={{
          width:'24px', height:'24px', border:'1.5px solid #E8B84B', borderRadius:'5px',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'9px', fontWeight:700, color:'#E8B84B',
        }}>MD</div>
        <span style={{ fontSize:'13px', fontWeight:600, color:'rgba(242,240,232,0.55)' }}>MentoringDiaries</span>
      </div>
      <button
        onClick={onBack}
        data-cursor="hover"
        style={{
          background:'none', border:'none', cursor:'pointer', padding:'4px 0',
          display:'flex', alignItems:'center', gap:'5px', fontFamily:'inherit',
          color:'rgba(242,240,232,0.3)', fontSize:'12px', transition:'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,240,232,0.65)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,240,232,0.3)'}
      >
        <ArrowLeft size={12} /> Home
      </button>
    </div>
  )
}

// ── Main Register page ────────────────────────────────────────────────────────
export default function Register() {
  const navigate   = useNavigate()
  const loginStore = useAuthStore(s => s.login)
  const reduced    = useReducedMotion()

  const [step,      setStep]    = useState(1)
  const [dir,       setDir]     = useState(1)
  const [showPw,    setShowPw]  = useState(false)
  const [btnState,  setBtnState] = useState('idle')
  const [toastMsg,  setToastMsg] = useState('')
  const [terms,     setTerms]   = useState(false)
  const [termsErr,  setTermsErr] = useState('')
  const [isExit,    setIsExit]  = useState(false)
  const [headingKey, setHeadingKey] = useState(0) // triggers ScrambleText re-run

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm({
    resolver:      zodResolver(schema),
    mode:          'onBlur',
    defaultValues: { name:'', email:'', password:'', institution:'', phone:'', year:'', role:'', terms:false },
  })

  const values = watch()

  function navigateByRole(role) {
    const routes = { student:'/dashboard', mentor:'/mentor', admin:'/admin' }
    navigate(routes[role] ?? '/dashboard', { replace:true })
  }

  function goTo(path) {
    setIsExit(true)
    setTimeout(() => navigate(path), 320)
  }

  // ── Step navigation ────────────────────────────────────────────────────────
  async function goNext() {
    const fields = step === 1 ? ['name','email','password'] : step === 2 ? ['institution'] : []
    const valid  = await trigger(fields)
    if (!valid) return
    setDir(1)
    setStep(s => s + 1)
    setHeadingKey(k => k + 1)
  }

  function goBack() {
    setDir(-1)
    setStep(s => s - 1)
    setHeadingKey(k => k + 1)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (!terms) { setTermsErr('You must accept the terms'); return }
    setTermsErr('')
    setBtnState('loading')
    try {
      const res = await api.post('/auth/register', {
        name: data.name, email: data.email, password: data.password,
        institution: data.institution,
        phone: data.phone || undefined,
        year:  data.year  || undefined,
        role:  data.role,
      })
      loginStore(res.data.user)
      setBtnState('success')
      setTimeout(() => navigateByRole(res.data.user.role), 900)
    } catch (err) {
      setBtnState('idle')
      setToastMsg(err?.response?.data?.message || 'Something went wrong. Please try again.')
    }
  }

  const syncTerms = (val) => {
    setTerms(val)
    setValue('terms', val, { shouldValidate: true })
    if (val) setTermsErr('')
  }

  const bgVariant = BG_VARIANTS[step - 1]

  return (
    <motion.div
      initial={reduced ? {} : { opacity:0 }}
      animate={{ opacity:1 }}
      exit={reduced ? {} : { opacity:0 }}
      transition={{ duration:0.3 }}
      style={{ position:'relative', minHeight:'100vh' }}
    >
      <ErrorToast message={toastMsg} onDismiss={() => setToastMsg('')} />
      <AuthBackground variant={bgVariant} />
      <FloatingBgCards />

      {/* Centered form */}
      <div style={{
        position:'fixed', inset:0, display:'flex',
        alignItems:'center', justifyContent:'center',
        zIndex:10, padding:'16px', pointerEvents:'none',
      }}>
        <FormCard isExiting={isExit}>
          <div style={{ pointerEvents:'auto' }}>
            <CardHeader onBack={() => goTo('/')} />

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* Heading (above AnimatePresence so it animates together) */}
            <div style={{ marginBottom:'24px' }}>
              <h1 style={{
                fontFamily:'"Sora", system-ui, sans-serif',
                fontSize:'clamp(22px,3.5vw,30px)', fontWeight:700,
                color:'#F2F0E8', margin:0, lineHeight:1.15,
              }}>
                <ScrambleText key={headingKey} text={STEP_HEADINGS[step-1]} trigger delay={80} />
              </h1>
              <p style={{ fontSize:'13px', color:'rgba(242,240,232,0.4)', marginTop:'6px', marginBottom:0 }}>
                {STEP_SUBS[step - 1]}
              </p>
            </div>

            {/* Form wrapper */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={{ overflow:'hidden' }}>
                <AnimatePresence mode="wait" custom={dir}>

                  {/* ── STEP 1 — Account ── */}
                  {step === 1 && (
                    <motion.div key="s1" custom={dir}
                      variants={reduced ? {} : stepVariants}
                      initial="enter" animate="center" exit="exit"
                      transition={stepTransition}
                    >
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                        <FloatingLabelInput
                          label="Full name"
                          type="text"
                          autoComplete="name"
                          error={errors.name?.message}
                          {...register('name')}
                          value={values.name}
                        />
                        <FloatingLabelInput
                          label="Email address"
                          type="email"
                          autoComplete="email"
                          error={errors.email?.message}
                          {...register('email')}
                          value={values.email}
                        />
                        <FloatingLabelInput
                          label="Password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          error={errors.password?.message}
                          {...register('password')}
                          value={values.password}
                          rightElement={
                            <button
                              type="button" data-cursor="hover"
                              onClick={() => setShowPw(v => !v)}
                              style={{ background:'none',border:'none',cursor:'pointer',padding:'4px',color:'rgba(242,240,232,0.3)',display:'flex',alignItems:'center',transition:'color 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.color='rgba(242,240,232,0.65)'}
                              onMouseLeave={e => e.currentTarget.style.color='rgba(242,240,232,0.3)'}
                              aria-label={showPw ? 'Hide password' : 'Show password'}
                            >
                              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                            </button>
                          }
                        />
                        <PasswordStrength password={values.password} />
                        <div style={{ marginTop:'10px' }}>
                          <GoldButton type="button" state="idle" onClick={goNext}>Continue →</GoldButton>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 2 — Details ── */}
                  {step === 2 && (
                    <motion.div key="s2" custom={dir}
                      variants={reduced ? {} : stepVariants}
                      initial="enter" animate="center" exit="exit"
                      transition={stepTransition}
                    >
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                        <FloatingLabelInput
                          label="Institution / College name"
                          type="text"
                          autoComplete="organization"
                          error={errors.institution?.message}
                          {...register('institution')}
                          value={values.institution}
                        />

                        {/* Phone with prefix */}
                        <div style={{ display:'flex', gap:'8px' }}>
                          <div style={{
                            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                            borderRadius:'16px', padding:'16px 14px', display:'flex', alignItems:'center',
                            flexShrink:0, color:'rgba(242,240,232,0.5)', fontSize:'13px', gap:'4px',
                          }}>
                            🇮🇳 +91
                          </div>
                          <div style={{ flex:1 }}>
                            <FloatingLabelInput
                              label="Phone (optional)"
                              type="tel"
                              autoComplete="tel"
                              {...register('phone')}
                              value={values.phone}
                            />
                          </div>
                        </div>

                        {/* Year pills */}
                        <div>
                          <p style={{ fontSize:'12px', color:'rgba(242,240,232,0.35)', margin:'4px 0 8px 4px' }}>
                            Year / Grade
                          </p>
                          <YearPills
                            value={values.year}
                            onChange={y => setValue('year', y)}
                          />
                        </div>

                        <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'8px' }}>
                          <GoldButton type="button" state="idle" onClick={goNext}>Continue →</GoldButton>
                          <button
                            type="button"
                            onClick={goBack}
                            style={{
                              background:'none', border:'none', cursor:'pointer',
                              color:'rgba(242,240,232,0.3)', fontSize:'12px',
                              textAlign:'center', fontFamily:'inherit', padding:'4px',
                              transition:'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color='rgba(242,240,232,0.6)'}
                            onMouseLeave={e => e.currentTarget.style.color='rgba(242,240,232,0.3)'}
                          >← Back</button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 3 — Role ── */}
                  {step === 3 && (
                    <motion.div key="s3" custom={dir}
                      variants={reduced ? {} : stepVariants}
                      initial="enter" animate="center" exit="exit"
                      transition={stepTransition}
                    >
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {/* Role cards */}
                        {ROLES.map(role => (
                          <RoleCard
                            key={role.id}
                            role={role}
                            selected={values.role}
                            onSelect={id => setValue('role', id, { shouldValidate:true })}
                          />
                        ))}
                        {errors.role?.message && (
                          <p style={{ fontSize:'11px', color:'#EF4444', margin:0, paddingLeft:'4px' }}>
                            {errors.role.message}
                          </p>
                        )}

                        {/* Terms */}
                        <div style={{ marginTop:'8px' }}>
                          <Checkbox id="terms" checked={terms} onChange={syncTerms}>
                            I agree to the{' '}
                            <a href="/terms" style={{ color:'#E8B84B', textDecoration:'none' }}>Terms of Service</a>
                            {' '}and{' '}
                            <a href="/privacy" style={{ color:'#E8B84B', textDecoration:'none' }}>Privacy Policy</a>
                          </Checkbox>
                          {termsErr && (
                            <p style={{ fontSize:'11px', color:'#EF4444', margin:'4px 0 0 24px' }}>{termsErr}</p>
                          )}
                        </div>

                        <div style={{ marginTop:'4px', display:'flex', flexDirection:'column', gap:'8px' }}>
                          <GoldButton type="submit" state={btnState}>
                            {btnState === 'loading' ? 'Creating account…'
                              : btnState === 'success' ? 'Account created!'
                              : 'Create account →'}
                          </GoldButton>
                          <button
                            type="button"
                            onClick={goBack}
                            style={{
                              background:'none', border:'none', cursor:'pointer',
                              color:'rgba(242,240,232,0.3)', fontSize:'12px',
                              textAlign:'center', fontFamily:'inherit', padding:'4px',
                              transition:'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color='rgba(242,240,232,0.6)'}
                            onMouseLeave={e => e.currentTarget.style.color='rgba(242,240,232,0.3)'}
                          >← Back</button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Bottom link */}
              <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(242,240,232,0.4)', marginTop:'20px', marginBottom:0 }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => goTo('/login')}
                  style={{
                    background:'none', border:'none', cursor:'pointer', padding:0,
                    color:'#E8B84B', fontWeight:500, fontSize:'13px', fontFamily:'inherit',
                  }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration='none'}
                >
                  Sign in →
                </button>
              </p>
            </form>
          </div>
        </FormCard>
      </div>
    </motion.div>
  )
}
