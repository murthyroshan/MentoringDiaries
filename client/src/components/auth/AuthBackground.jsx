/**
 * Full-screen layered background for auth pages.
 * Layers (back to front):
 *   1. Three.js particle field (lazy, skipped on mobile + reduced motion)
 *   2. Morphing CSS gradient orbs  (positions driven by variant prop)
 *   3. Mouse spotlight (radial gradient following cursor)
 *   4. Dot grid
 *   5. Film grain SVG
 *   6. Vignette
 *
 * variant: "login" | "register-1" | "register-2" | "register-3"
 */
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useReducedMotion } from 'framer-motion'

const AuthParticles = lazy(() => import('./AuthParticles'))

// ── Orb position tables ────────────────────────────────────────────────────────
// Each orb: { top, left, bottom, right, width, opacity }
// undefined values not applied (avoids conflict between top/bottom etc.)
const ORB_PRESETS = {
  login: [
    { top: '-10%',  left: '-5%',   width: '800px', opacity: 0.07 },
    { bottom:'-10%',right: '-5%',  width: '600px', opacity: 0.05 },
    { top: '42%',   left: '38%',   width: '400px', opacity: 0.04 },
  ],
  'register-1': [
    { top: '20%',  right: '0%',   width: '800px', opacity: 0.07 },
    { bottom:'0%', left: '10%',   width: '600px', opacity: 0.05 },
    { top: '10%',  left: '20%',   width: '600px', opacity: 0.05 },
  ],
  'register-2': [
    { top: '15%',  right: '5%',   width: '840px', opacity: 0.07 },
    { bottom:'5%', left: '15%',   width: '650px', opacity: 0.07 }, // ember brightens
    { top: '5%',   left: '25%',   width: '550px', opacity: 0.05 },
  ],
  'register-3': [
    { top: '25%',  left: '20%',   width: '700px', opacity: 0.07 },
    { bottom:'20%',left: '30%',   width: '600px', opacity: 0.05 },
    { top: '30%',  left: '35%',   width: '500px', opacity: 0.06 },
  ],
}

const ORB_COLORS = [
  'rgba(232,184,75,VAL)',    // gold
  'rgba(212,98,42,VAL)',     // ember
  'rgba(232,184,75,VAL)',    // gold
]

function orbStyle(preset, colorTemplate, isEmberBright) {
  const opacity = isEmberBright ? Math.min(preset.opacity * 1.4, 0.12) : preset.opacity
  const color   = colorTemplate.replace('VAL', opacity)
  return {
    position:     'absolute',
    width:        preset.width,
    height:       preset.width,
    borderRadius: '50%',
    background:   `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    top:          preset.top    ?? 'auto',
    left:         preset.left   ?? 'auto',
    bottom:       preset.bottom ?? 'auto',
    right:        preset.right  ?? 'auto',
    pointerEvents:'none',
    transition:   'top 2s cubic-bezier(0.4,0,0.2,1), left 2s cubic-bezier(0.4,0,0.2,1), right 2s cubic-bezier(0.4,0,0.2,1), bottom 2s cubic-bezier(0.4,0,0.2,1), width 2s cubic-bezier(0.4,0,0.2,1)',
  }
}

// ── Film grain overlay ────────────────────────────────────────────────────────
function FilmGrain() {
  return (
    <svg aria-hidden style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.035, pointerEvents:'none' }}>
      <filter id="auth-bg-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#auth-bg-grain)" />
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AuthBackground({ variant = 'login' }) {
  const reduced  = useReducedMotion()
  const [spot, setSpot] = useState({ x: -9999, y: -9999 })
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Spotlight follows mouse
  useEffect(() => {
    if (reduced) return
    const move = (e) => setSpot({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [reduced])

  const presets      = ORB_PRESETS[variant] ?? ORB_PRESETS.login
  const isRegister2  = variant === 'register-2'

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      zIndex:        0,
      pointerEvents: 'none',
      overflow:      'hidden',
      background:    '#06060A',
    }}>
      {/* ── Layer 1: Three.js particles (desktop + no reduced motion) ── */}
      {!reduced && !isMobile && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Suspense fallback={null}>
            <AuthParticles />
          </Suspense>
        </div>
      )}

      {/* ── Layer 2: Morphing orbs ── */}
      {presets.map((preset, i) => (
        <div key={i} style={orbStyle(preset, ORB_COLORS[i], isRegister2 && i === 1)} />
      ))}

      {/* ── Layer 3: Spotlight ── */}
      {!reduced && (
        <div style={{
          position:   'absolute',
          inset:      0,
          background: `radial-gradient(circle 400px at ${spot.x}px ${spot.y}px, rgba(232,184,75,0.04) 0%, transparent 70%)`,
          transition: 'background 0.08s linear',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Layer 4: Dot grid ── */}
      <div style={{
        position:        'absolute',
        inset:           0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize:  '28px 28px',
        pointerEvents:   'none',
      }} />

      {/* ── Layer 5: Film grain ── */}
      <FilmGrain />

      {/* ── Layer 6: Vignette ── */}
      <div style={{
        position:   'absolute',
        inset:      0,
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(6,6,10,0.8) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
