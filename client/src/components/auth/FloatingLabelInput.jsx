/**
 * Floating-label input for auth pages.
 * Features:
 *  - Label floats up on focus / filled value
 *  - Label runs ScrambleText when focused (fast, subtle)
 *  - Gold particle burst (5 CSS dots) on focus
 *  - Gold glow on focus, red glow + shake on error
 *  - Small gold checkmark fades in right side when filled + no error
 *  - Supports rightElement override (e.g. eye-icon)
 *  - RHF-compatible: onBlur is merged, ...rest forwards ref
 */
import { useState, useId, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ScrambleText from './ScrambleText'

const C = { gold: '#E8B84B', error: '#EF4444', text: '#F2F0E8' }

// ── Particle burst CSS keyframe ───────────────────────────────────────────────
const BURST_CSS = `
@keyframes auth-burst {
  0%   { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(-20px) scale(0.2); opacity: 0; }
}
`

function ParticleBurst() {
  const dots = [
    { left: '18%', delay: '0ms',    size: '4px' },
    { left: '33%', delay: '45ms',   size: '3px' },
    { left: '50%', delay: '15ms',   size: '5px' },
    { left: '66%', delay: '70ms',   size: '3px' },
    { left: '82%', delay: '30ms',   size: '4px' },
  ]
  return (
    <>
      <style>{BURST_CSS}</style>
      {dots.map((d, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position:     'absolute',
            top:          '2px',
            left:         d.left,
            width:        d.size,
            height:       d.size,
            borderRadius: '50%',
            background:   C.gold,
            animation:    `auth-burst 0.55s ${d.delay} ease-out forwards`,
            pointerEvents:'none',
            zIndex:       5,
          }}
        />
      ))}
    </>
  )
}

// ── Gold checkmark (filled, no error) ─────────────────────────────────────────
function GoldCheck() {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.18 }}
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="7" cy="7" r="6.5" fill="rgba(232,184,75,0.15)" stroke="rgba(232,184,75,0.4)" strokeWidth="1" />
      <path d="M4 7l2 2 4-4" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  )
}

// ── Shake variant ──────────────────────────────────────────────────────────────
const shakeVariants = {
  idle:  { x: 0 },
  shake: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.42, ease: 'easeInOut' } },
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FloatingLabelInput({
  label,
  type        = 'text',
  value       = '',
  onChange,
  onBlur:     rhfOnBlur,
  error,
  rightElement,
  autoComplete,
  name,
  disabled,
  ...rest
}) {
  const [focused,      setFocused]      = useState(false)
  const [showBurst,    setShowBurst]    = useState(false)
  const [scrambleTrig, setScrambleTrig] = useState(false)
  const reduced  = useReducedMotion()
  const inputId  = useId()
  const shakeKey = useRef(0)

  const isFloated = focused || (value !== '' && value !== undefined && value !== null)
  const isFilled  = !focused && value !== '' && value !== undefined && !error

  // Bump shakeKey on each new error so Framer Motion re-fires shake
  const prevErr = useRef(null)
  if (error && error !== prevErr.current) shakeKey.current += 1
  prevErr.current = error

  function handleFocus() {
    setFocused(true)
    if (!reduced) {
      setShowBurst(true)
      setScrambleTrig(v => !v)
      setTimeout(() => setShowBurst(false), 700) // clean up after animation
    }
  }

  function handleBlur(e) {
    setFocused(false)
    rhfOnBlur?.(e)
  }

  const borderColor = error
    ? 'rgba(239,68,68,0.5)'
    : focused
      ? 'rgba(232,184,75,0.45)'
      : isFilled
        ? 'rgba(232,184,75,0.18)'
        : 'rgba(255,255,255,0.08)'

  const boxShadow = error
    ? '0 0 0 2px rgba(239,68,68,0.15)'
    : focused
      ? '0 0 0 2px rgba(232,184,75,0.18)'
      : 'none'

  const labelColor = error
    ? 'rgba(239,68,68,0.75)'
    : focused
      ? 'rgba(232,184,75,0.85)'
      : isFloated
        ? 'rgba(232,184,75,0.55)'
        : 'rgba(242,240,232,0.35)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <motion.div
        key={shakeKey.current}
        variants={reduced ? {} : shakeVariants}
        animate={error && !reduced ? 'shake' : 'idle'}
        style={{ position: 'relative' }}
      >
        {/* Particle burst on focus */}
        {showBurst && !reduced && <ParticleBurst />}

        {/* Floating label */}
        <label
          htmlFor={inputId}
          style={{
            position:      'absolute',
            left:          '20px',
            top:           isFloated ? '8px' : '50%',
            transform:     isFloated ? 'none' : 'translateY(-50%)',
            fontSize:      isFloated ? '10px' : '14px',
            fontWeight:    isFloated ? 500 : 400,
            color:         labelColor,
            pointerEvents: 'none',
            zIndex:        2,
            lineHeight:    1,
            userSelect:    'none',
            transition:    reduced ? 'none' : 'top 0.18s ease, font-size 0.18s ease, color 0.18s ease, transform 0.18s ease',
          }}
        >
          {focused && !reduced
            ? <ScrambleText text={label} trigger={scrambleTrig} delay={0} />
            : label
          }
        </label>

        {/* Input */}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{
            width:        '100%',
            background:   focused ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
            border:       `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding:      '26px 20px 10px',
            paddingRight: (rightElement || isFilled) ? '48px' : '20px',
            color:        disabled ? 'rgba(242,240,232,0.3)' : C.text,
            fontSize:     '14px',
            outline:      'none',
            boxShadow,
            transition:   reduced ? 'none' : 'background 0.22s, border-color 0.22s, box-shadow 0.22s',
            fontFamily:   'inherit',
            cursor:       disabled ? 'not-allowed' : 'text',
          }}
          {...rest}
        />

        {/* Right slot: explicit element OR auto checkmark */}
        <div style={{
          position:   'absolute',
          right:      '14px',
          top:        '50%',
          transform:  'translateY(-50%)',
          display:    'flex',
          alignItems: 'center',
          zIndex:     2,
        }}>
          {rightElement || (
            <AnimatePresence>
              {isFilled && !reduced && <GoldCheck />}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Error message — space reserved to prevent layout shift */}
      <div style={{ minHeight: '16px', paddingLeft: '4px' }}>
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="err"
              initial={reduced ? {} : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: '11px', color: C.error, margin: 0, lineHeight: 1.4 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
