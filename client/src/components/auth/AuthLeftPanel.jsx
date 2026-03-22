import { useRef, useCallback, useState } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const C = {
  dark:   '#0C0C12',
  gold:   '#E8B84B',
  text:   '#F2F0E8',
}

// ── 3-D tilt hook (same as HeroCards) ────────────────────────────────────────
function use3DTilt(strength = 0.018) {
  const rotX  = useMotionValue(0)
  const rotY  = useMotionValue(0)
  const sRotX = useSpring(rotX, { stiffness: 300, damping: 30 })
  const sRotY = useSpring(rotY, { stiffness: 300, damping: 30 })
  const ref   = useRef(null)

  const onMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2
    rotX.set(-((e.clientY - cy) * strength))
    rotY.set(  (e.clientX - cx) * strength)
  }, [rotX, rotY, strength])

  const onLeave = useCallback(() => { rotX.set(0); rotY.set(0) }, [rotX, rotY])

  return { ref, sRotX, sRotY, onMove, onLeave }
}

// ── Dot-grid background (matches Landing hero) ────────────────────────────────
const dotGridStyle = {
  position:           'absolute',
  inset:              0,
  backgroundImage:    'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize:     '32px 32px',
  pointerEvents:      'none',
}

// ── Film-grain SVG overlay ────────────────────────────────────────────────────
function FilmGrain() {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none' }}
    >
      <filter id="auth-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#auth-grain)" />
    </svg>
  )
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width:        '32px',
        height:       '32px',
        border:       `1.5px solid ${C.gold}`,
        borderRadius: '6px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     '11px',
        fontWeight:   700,
        color:        C.gold,
        letterSpacing: '0.05em',
        flexShrink:   0,
      }}>
        MD
      </div>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(242,240,232,0.7)', letterSpacing: '0.01em' }}>
        MentoringDiaries
      </span>
    </div>
  )
}

// ── Floating mini card (3-D tilt) ─────────────────────────────────────────────
function MiniCard({ children }) {
  const { ref, sRotX, sRotY, onMove, onLeave } = use3DTilt(0.012)
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { onLeave(); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      style={{
        rotateX:             sRotX,
        rotateY:             sRotY,
        transformPerspective: 900,
        transformStyle:      'preserve-3d',
        background:          'rgba(17,17,24,0.8)',
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        border:              `1px solid ${hovered ? 'rgba(232,184,75,0.18)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:        '18px',
        padding:             '20px',
        maxWidth:            '280px',
        marginTop:           '32px',
        boxShadow:           hovered
          ? '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,184,75,0.05) inset'
          : '0 20px 50px rgba(0,0,0,0.4)',
        transition:          'border-color 0.3s, box-shadow 0.3s',
        cursor:              'default',
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Login mini card content ───────────────────────────────────────────────────
export function LoginMiniCard() {
  return (
    <MiniCard>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(242,240,232,0.8)' }}>Week 12 Entry</span>
      </div>

      {/* Fake diary lines */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)', marginBottom: '7px', width: '92%' }} />
        <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', width: '68%' }} />
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px', padding: '3px 10px', borderRadius: '9999px',
          background: 'rgba(61,214,140,0.12)', color: '#3DD68C',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3DD68C', display: 'inline-block' }} />
          Low Risk · 23
        </span>
        <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.3)' }}>Reviewed by mentor ✓</span>
      </div>
    </MiniCard>
  )
}

// ── Register mini card content ────────────────────────────────────────────────
export function RegisterMiniCard() {
  const steps = [
    { num: '①', label: 'Create your account', active: true  },
    { num: '②', label: 'Write your first entry', active: false },
    { num: '③', label: 'Meet your mentor',       active: false },
  ]

  return (
    <MiniCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {steps.map(({ num, label, active }) => (
          <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: active ? C.gold : 'rgba(242,240,232,0.25)', flexShrink: 0 }}>{num}</span>
            <span style={{ fontSize: '12px', color: active ? 'rgba(242,240,232,0.85)' : 'rgba(242,240,232,0.3)', fontWeight: active ? 500 : 400 }}>
              {label}
            </span>
            {active && (
              <span style={{
                marginLeft: 'auto', fontSize: '9px', padding: '2px 8px', borderRadius: '9999px',
                background: 'rgba(232,184,75,0.15)', color: C.gold, fontWeight: 600, flexShrink: 0,
              }}>Active</span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.3)' }}>Progress</span>
          <span style={{ fontSize: '10px', color: C.gold }}>33%</span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '33%', background: C.gold, borderRadius: '9999px' }} />
        </div>
      </div>
    </MiniCard>
  )
}

// ── Exported left panel ───────────────────────────────────────────────────────
export default function AuthLeftPanel({ quote, card }) {
  const reduced = useReducedMotion()

  return (
    <div style={{
      width:      '45%',
      flexShrink: 0,
      background: C.dark,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      position:   'relative',
      overflow:   'hidden',
      display:    'flex',
      flexDirection: 'column',
    }}>
      {/* Gold orb */}
      <motion.div
        aria-hidden
        animate={reduced ? {} : { x: [0, 18, -14, 0], y: [0, -16, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position:     'absolute',
          top:          '50%',
          left:         '50%',
          transform:    'translate(-50%, -50%)',
          width:        '600px',
          height:       '600px',
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(232,184,75,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex:       0,
        }}
      />

      {/* Dot grid */}
      <div style={dotGridStyle} aria-hidden />

      {/* Film grain */}
      <FilmGrain />

      {/* Logo — top left */}
      <div style={{ position: 'absolute', top: '32px', left: '40px', zIndex: 2 }}>
        <Logo />
      </div>

      {/* Center content */}
      <div style={{
        position:      'relative',
        zIndex:        2,
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'center',
        height:        '100%',
        padding:       '120px 48px 80px',
      }}>
        {/* Quote */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
        >
          <h2 style={{
            fontFamily:  '"Sora", system-ui, sans-serif',
            fontSize:    'clamp(28px, 2.8vw, 38px)',
            fontWeight:  700,
            color:       'rgba(242,240,232,0.9)',
            lineHeight:  1.1,
            margin:      0,
          }}>
            {quote}
          </h2>
          <p style={{
            fontSize:   '13px',
            color:      'rgba(242,240,232,0.3)',
            marginTop:  '16px',
            fontStyle:  'italic',
          }}>
            — MentoringDiaries
          </p>
        </motion.div>

        {/* Floating mini card */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
        >
          {card}
        </motion.div>
      </div>

      {/* Bottom trust text */}
      <p style={{
        position:   'absolute',
        bottom:     '32px',
        left:       '40px',
        fontSize:   '11px',
        color:      'rgba(242,240,232,0.2)',
        margin:     0,
        zIndex:     2,
      }}>
        Trusted by 500+ students across institutions
      </p>
    </div>
  )
}
