import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

import api               from '../../services/api'
import { useAuthStore }  from '../../store/authStore'
import AuthBackground    from '../../components/auth/AuthBackground'
import FormCard          from '../../components/auth/FormCard'
import FloatingBgCards   from '../../components/auth/FloatingBgCards'
import FloatingLabelInput from '../../components/auth/FloatingLabelInput'
import ErrorToast        from '../../components/auth/ErrorToast'
import ScrambleText      from '../../components/auth/ScrambleText'

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ── Spinner ───────────────────────────────────────────────────────────────────
const SPINNER_CSS = `@keyframes auth-spin { to { transform: rotate(360deg) } }`

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '16px', height: '16px', flexShrink: 0,
      border: '2px solid rgba(6,6,10,0.3)', borderTop: '2px solid #06060A',
      borderRadius: '50%', animation: 'auth-spin 0.7s linear infinite',
    }} />
  )
}

// ── Animated checkmark (SVG stroke draw) ──────────────────────────────────────
function AnimatedCheck({ color = '#06060A' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <motion.path
        d="M3 9l4 4 8-8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ── Magnetic gold button ───────────────────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes btn-shimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
`

function GoldButton({ state, children, onClick, type = 'submit', disabled: forceDisable }) {
  const [offset,  setOffset]  = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const ref     = useRef(null)
  const reduced = useReducedMotion()

  const handleMouseMove = useCallback((e) => {
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
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setOffset({ x: 0, y: 0 }); setHovered(false) }}
        onMouseEnter={() => setHovered(true)}
        animate={reduced ? {} : { x: offset.x, y: offset.y }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          width:       '100%',
          padding:     '16px',
          borderRadius:'18px',
          ...bgStyle,
          animation:   hovered && !isOff && !reduced ? 'btn-shimmer 1.2s linear infinite' : 'none',
          color:       '#06060A',
          fontWeight:  700,
          fontSize:    '15px',
          border:      'none',
          cursor:      isOff ? 'not-allowed' : 'pointer',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          gap:         '8px',
          boxShadow:   hovered && !isOff
            ? '0 20px 60px rgba(232,184,75,0.38)'
            : '0 8px 28px rgba(232,184,75,0.18)',
          transform:   hovered && !isOff && !reduced ? 'scale(1.02)' : 'scale(1)',
          transition:  'box-shadow 0.3s, transform 0.2s, background 0.3s',
          fontFamily:  'inherit',
          pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        {isLoading && <Spinner />}
        {isSuccess && <AnimatedCheck />}
        {children}
      </motion.button>
    </>
  )
}

// ── Custom Checkbox ────────────────────────────────────────────────────────────
function Checkbox({ id, checked, onChange, label }) {
  return (
    <label htmlFor={id} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', userSelect:'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width:'16px', height:'16px', borderRadius:'4px', flexShrink:0,
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
      <span style={{ fontSize:'13px', color:'rgba(242,240,232,0.5)' }}>{label}</span>
    </label>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
      <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize:'11px', color:'rgba(242,240,232,0.2)' }}>or</span>
      <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

// ── Logo row ──────────────────────────────────────────────────────────────────
function CardHeader({ onBack }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'32px' }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate   = useNavigate()
  const loginStore = useAuthStore(s => s.login)
  const reduced    = useReducedMotion()

  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [btnState, setBtnState] = useState('idle')
  const [toastMsg, setToastMsg] = useState('')
  const [isExit,   setIsExit]   = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver:      zodResolver(schema),
    mode:          'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const emailVal = watch('email')
  const passVal  = watch('password')

  function goTo(path) {
    setIsExit(true)
    setTimeout(() => navigate(path), 320)
  }

  function navigateByRole(role) {
    const routes = { student: '/dashboard', mentor: '/mentor', admin: '/admin' }
    navigate(routes[role] ?? '/dashboard', { replace: true })
  }

  const onSubmit = async (data) => {
    setBtnState('loading')
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      loginStore(res.data.user)
      setBtnState('success')
      setTimeout(() => navigateByRole(res.data.user.role), 900)
    } catch (err) {
      setBtnState('idle')
      setToastMsg(err?.response?.data?.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <motion.div
      initial={reduced ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? {} : { opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ position: 'relative', minHeight: '100vh' }}
    >
      <ErrorToast message={toastMsg} onDismiss={() => setToastMsg('')} />

      {/* Background */}
      <AuthBackground variant="login" />

      {/* Decorative background cards */}
      <FloatingBgCards />

      {/* Centered form */}
      <div style={{
        position:       'fixed',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         10,
        padding:        '16px',
        pointerEvents:  'none',
      }}>
        <FormCard isExiting={isExit}>
          <div style={{ pointerEvents: 'auto' }}>
            <CardHeader onBack={() => goTo('/')} />

            {/* Heading */}
            <h1 style={{
              fontFamily: '"Sora", system-ui, sans-serif',
              fontSize:   'clamp(26px, 4vw, 36px)',
              fontWeight: 700,
              color:      '#F2F0E8',
              margin:     0,
              lineHeight: 1.1,
            }}>
              <ScrambleText text="Welcome back." trigger delay={200} />
            </h1>
            <p style={{ fontSize:'14px', color:'rgba(242,240,232,0.4)', marginTop:'8px', marginBottom:0 }}>
              Sign in to continue your journey.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ marginTop:'28px', display:'flex', flexDirection:'column', gap:'6px' }}>

              <FloatingLabelInput
                label="Email address"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
                value={emailVal}
              />

              <FloatingLabelInput
                label="Password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
                value={passVal}
                rightElement={
                  <button
                    type="button"
                    data-cursor="hover"
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      background:'none', border:'none', cursor:'pointer', padding:'4px',
                      color:'rgba(242,240,232,0.3)', display:'flex', alignItems:'center',
                      transition:'color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,240,232,0.65)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,240,232,0.3)'}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {/* Remember + Forgot */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'4px 0' }}>
                <Checkbox id="remember" checked={remember} onChange={setRemember} label="Remember me" />
                <Link
                  to="/forgot-password"
                  style={{ fontSize:'13px', color:'rgba(232,184,75,0.7)', textDecoration:'none', transition:'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E8B84B'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,184,75,0.7)'}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <div style={{ marginTop:'8px' }}>
                <GoldButton state={btnState}>
                  {btnState === 'loading' ? 'Signing in…'
                    : btnState === 'success' ? 'Welcome back!'
                    : 'Sign in →'}
                </GoldButton>
              </div>

              <OrDivider />

              <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(242,240,232,0.4)', margin:0 }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => goTo('/register')}
                  style={{
                    background:'none', border:'none', cursor:'pointer', padding:0,
                    color:'#E8B84B', fontWeight:500, fontSize:'13px', fontFamily:'inherit',
                    textDecoration:'none', transition:'text-decoration 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  Register →
                </button>
              </p>

            </form>
          </div>
        </FormCard>
      </div>
    </motion.div>
  )
}
