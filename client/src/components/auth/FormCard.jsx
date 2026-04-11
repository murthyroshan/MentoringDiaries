/**
 * Glassmorphism floating card with:
 *  - 3-D tilt on hover (mouse move → rotateX/Y)
 *  - Border glow that follows mouse position (radial gradient overlay)
 *  - Entrance animation via Framer Motion
 *  - Custom scrollbar, max-height 90vh
 */
import { useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const CARD_STYLE = {
  position:          'relative',
  width:             'min(480px, 92vw)',
  maxHeight:         '92vh',
  overflowY:         'auto',
  overflowX:         'hidden',
  pointerEvents:     'auto',
  background:        'rgba(11,11,17,0.85)',
  backdropFilter:    'blur(40px) saturate(160%)',
  WebkitBackdropFilter: 'blur(40px) saturate(160%)',
  border:            '1px solid rgba(255,255,255,0.08)',
  borderRadius:      '28px',
  padding:           'clamp(28px, 4vw, 48px)',
  boxShadow:         [
    '0 0 0 1px rgba(232,184,75,0.05)',
    '0 40px 100px rgba(0,0,0,0.7)',
    '0 0 80px rgba(232,184,75,0.04) inset',
  ].join(', '),
  // Custom scrollbar (webkit)
  scrollbarWidth:    'thin',
  scrollbarColor:    'rgba(232,184,75,0.2) transparent',
}

// CSS injection for webkit scrollbar
const SCROLLBAR_CSS = `
  .auth-form-card::-webkit-scrollbar          { width: 3px; }
  .auth-form-card::-webkit-scrollbar-track    { background: transparent; }
  .auth-form-card::-webkit-scrollbar-thumb    { background: rgba(232,184,75,0.2); border-radius: 9999px; }
  .auth-form-card::-webkit-scrollbar-thumb:hover { background: rgba(232,184,75,0.4); }
`

export default function FormCard({ children, isExiting = false }) {
  const reduced = useReducedMotion()
  const cardRef = useRef(null)

  // 3-D tilt values
  const rotX  = useMotionValue(0)
  const rotY  = useMotionValue(0)
  const sRotX = useSpring(rotX, { stiffness: 200, damping: 28 })
  const sRotY = useSpring(rotY, { stiffness: 200, damping: 28 })

  // Local mouse position (for border glow)
  const [localMouse, setLocalMouse] = useState({ x: -999, y: -999 })
  const [hovered,    setHovered]    = useState(false)

  const onMouseMove = useCallback((e) => {
    if (!cardRef.current || reduced) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2
    const dx   = e.clientX - cx
    const dy   = e.clientY - cy

    rotX.set(-dy * 0.012)
    rotY.set( dx * 0.012)
    setLocalMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [reduced, rotX, rotY])

  const onMouseLeave = useCallback(() => {
    rotX.set(0)
    rotY.set(0)
    setHovered(false)
    setLocalMouse({ x: -999, y: -999 })
  }, [rotX, rotY])

  return (
    <>
      {/* Inject scrollbar CSS once */}
      <style>{SCROLLBAR_CSS}</style>

      <motion.div
        ref={cardRef}
        className="auth-form-card"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseEnter={() => setHovered(true)}
        initial={reduced ? {} : { opacity: 0, scale: 0.94, y: 24 }}
        animate={isExiting
          ? { opacity: 0, scale: 0.92, y: 30 }
          : { opacity: 1, scale: 1,    y: 0 }
        }
        transition={isExiting
          ? { duration: 0.3, ease: [0.4, 0, 1, 1] }
          : { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }
        }
        style={{
          ...CARD_STYLE,
          rotateX:             sRotX,
          rotateY:             sRotY,
          transformPerspective: 1200,
        }}
      >
        {/* Border glow overlay — follows mouse */}
        <div
          aria-hidden
          style={{
            position:      'absolute',
            inset:         '-1px',
            borderRadius:  'inherit',
            pointerEvents: 'none',
            zIndex:        0,
            opacity:       hovered && !reduced ? 1 : 0,
            background:    `radial-gradient(circle 220px at ${localMouse.x}px ${localMouse.y}px, rgba(232,184,75,0.1), transparent 60%)`,
            transition:    'opacity 0.3s',
            // Clip to border area only
            WebkitMask:    'linear-gradient(#fff 0 0)',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </motion.div>
    </>
  )
}
