/**
 * Three unique interactive background elements for auth pages.
 * Fixed position, z-index 1 (behind FormCard z-10). Desktop-only.
 *
 * 1. GrowthRing    — orbital SVG ring system (top-left)
 * 2. ActivityFeed  — live-scrolling ticker  (top-right)
 * 3. EmotionWave   — animated sentiment waveform (bottom-right)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

// ── Shared CSS keyframes ───────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes ring-cw    { to { transform: rotate(360deg);  } }
@keyframes ring-ccw   { to { transform: rotate(-360deg); } }
@keyframes center-dot { 0%,100%{opacity:.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.45)} }
@keyframes ripple-out { 0%{opacity:.45;transform:scale(1)} 100%{opacity:0;transform:scale(5.5)} }
@keyframes live-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
`

// ── Shared parallax hook ───────────────────────────────────────────────────────
function useParallax(strength) {
  const px      = useMotionValue(0)
  const py      = useMotionValue(0)
  const spx     = useSpring(px, { stiffness: 55, damping: 22 })
  const spy     = useSpring(py, { stiffness: 55, damping: 22 })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const move = (e) => {
      px.set(-(e.clientX / window.innerWidth  - 0.5) * window.innerWidth  * strength)
      py.set(-(e.clientY / window.innerHeight - 0.5) * window.innerHeight * strength)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [reduced, strength, px, py])

  return { x: spx, y: spy }
}

// ── Shared wrapper (parallax outer + float inner) ─────────────────────────────
function BgElement({ parallaxStrength, floatY, floatDur, entranceDelay, position, children }) {
  const { x, y } = useParallax(parallaxStrength)
  const reduced  = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay: entranceDelay }}
      style={{ position: 'fixed', zIndex: 1, ...position, x, y }}
    >
      <motion.div
        animate={reduced ? {} : { y: floatY }}
        transition={{ duration: floatDur, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ELEMENT 1 — GROWTH RING
// ══════════════════════════════════════════════════════════════════════════════
const RING_GOLD  = '#E8B84B'
const RING_EMBER = '#D4622A'

function GrowthRing() {
  const [hovered, setHovered] = useState(false)
  const reduced = useReducedMotion()

  const ring = (dur, dir) => ({
    transformOrigin: '100px 100px',
    animation: reduced ? 'none' : `${dir > 0 ? 'ring-cw' : 'ring-ccw'} ${dur}s linear infinite`,
    animationPlayState: hovered ? 'paused' : 'running',
  })

  const nodeGlow = (color) => `drop-shadow(0 0 ${hovered ? 5 : 2}px ${color})`

  return (
    <div
      data-cursor="hover"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '200px', height: '200px', cursor: 'default',
        opacity: hovered ? 1 : 0.75,
        transition: 'opacity 0.3s',
      }}
    >
      <svg width="200" height="200" viewBox="0 0 200 200" overflow="visible">
        {/* Ring lines */}
        <circle cx="100" cy="100" r="40"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <circle cx="100" cy="100" r="65"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <circle cx="100" cy="100" r="90"  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Inner ring — 2 gold nodes, CW 12s */}
        <g style={{ ...ring(12, 1), filter: nodeGlow(RING_GOLD) }}>
          <circle cx="140" cy="100" r="4" fill={RING_GOLD} />
          <circle cx="60"  cy="100" r="4" fill={RING_GOLD} opacity="0.7" />
        </g>

        {/* Mid ring — 1 ember node, CCW 20s */}
        <g style={{ ...ring(20, -1), filter: nodeGlow(RING_EMBER) }}>
          <circle cx="165" cy="100" r="3.5" fill={RING_EMBER} />
        </g>

        {/* Outer ring — 2 white nodes, CW 30s */}
        <g style={{ ...ring(30, 1), filter: 'drop-shadow(0 0 2px rgba(242,240,232,0.4))' }}>
          <circle cx="190" cy="100" r="3"   fill="rgba(242,240,232,0.35)" />
          <circle cx="10"  cy="100" r="2.5" fill="rgba(242,240,232,0.25)" />
        </g>

        {/* Ripple rings (expand outward from center) */}
        {!reduced && (
          <>
            <circle cx="100" cy="100" r="7" fill="none" stroke={RING_GOLD} strokeWidth="1"
              style={{
                transformOrigin: '100px 100px',
                transformBox:    'fill-box',
                animation: `ripple-out 2.4s ease-out infinite`,
              }}
            />
            <circle cx="100" cy="100" r="7" fill="none" stroke={RING_GOLD} strokeWidth="0.8"
              style={{
                transformOrigin: '100px 100px',
                transformBox:    'fill-box',
                animation: `ripple-out 2.4s ease-out 1.2s infinite`,
              }}
            />
          </>
        )}

        {/* Center pulsing dot */}
        <circle
          cx="100" cy="100" r="6"
          fill={RING_GOLD}
          style={{
            transformOrigin: '100px 100px',
            transformBox:    'fill-box',
            animation: reduced ? 'none' : `center-dot ${hovered ? 0.8 : 2}s ease-in-out infinite`,
            filter:    `drop-shadow(0 0 ${hovered ? 8 : 4}px ${RING_GOLD})`,
            transition: 'filter 0.3s',
          }}
        />
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              textAlign: 'center', fontSize: '10px', color: 'rgba(242,240,232,0.35)',
              margin: '4px 0 0', letterSpacing: '0.03em',
            }}
          >
            Your progress, visualized
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ELEMENT 2 — LIVE ACTIVITY FEED
// ══════════════════════════════════════════════════════════════════════════════
const FEED_POOL = [
  { color: '#3DD68C',  text: 'Arjun submitted Week 14',       time: 'just now' },
  { color: '#E8B84B',  text: 'Dr. Reema reviewed an entry',   time: '5s ago'   },
  { color: '#8B5CF6',  text: 'Priya hit a 10-week streak!',   time: '8s ago'   },
  { color: '#D4622A',  text: 'AI flagged for follow-up',      time: '12s ago'  },
  { color: '#3B82F6',  text: 'Session scheduled · Thu 3pm',   time: '18s ago'  },
  { color: '#3DD68C',  text: 'Rohan submitted Week 9',        time: '25s ago'  },
  { color: '#E8B84B',  text: 'Mentor responded to Aisha',     time: '32s ago'  },
  { color: '#8B5CF6',  text: 'New student joined institution', time: '1m ago'  },
  { color: '#3B82F6',  text: 'Weekly report generated',       time: '1m ago'   },
  { color: '#D4622A',  text: 'Risk alert cleared by mentor',  time: '2m ago'   },
]

const VISIBLE_COUNT = 4

function ActivityFeed() {
  const [items,   setItems]   = useState(() =>
    FEED_POOL.slice(0, VISIBLE_COUNT).map((item, i) => ({ ...item, id: i }))
  )
  const [dotPulse, setDotPulse] = useState(false)
  const nextRef   = useRef(VISIBLE_COUNT)
  const pausedRef = useRef(false)
  const reduced   = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      if (pausedRef.current) return
      const newItem = { ...FEED_POOL[nextRef.current % FEED_POOL.length], id: Date.now() }
      nextRef.current++
      setItems(prev => [...prev.slice(1), newItem])
      setDotPulse(true)
      setTimeout(() => setDotPulse(false), 500)
    }, 2500)
    return () => clearInterval(id)
  }, [reduced])

  return (
    <div
      data-cursor="hover"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      style={{
        width: '240px',
        background: 'rgba(11,11,17,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '18px',
        padding: '14px 16px',
        overflow: 'hidden',
        cursor: 'default',
        opacity: 0.75,
        transition: 'opacity 0.3s',
      }}
      onMouseOver={e => e.currentTarget.style.opacity = '1'}
      onMouseOut={e => e.currentTarget.style.opacity = '0.75'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#3DD68C', display: 'inline-block', flexShrink: 0,
          animation: reduced ? 'none' : 'live-pulse 1.8s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.3)', letterSpacing: '0.04em' }}>
          Live activity
        </span>
      </div>

      {/* Items — top fade mask */}
      <div style={{ position: 'relative', overflow: 'hidden', height: `${VISIBLE_COUNT * 34}px` }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '28px',
          background: 'linear-gradient(to bottom, rgba(11,11,17,0.85), transparent)',
          zIndex: 2, pointerEvents: 'none',
        }} />

        <AnimatePresence initial={false}>
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={reduced ? {} : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, y: -16 }}
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: 'absolute',
                top: `${idx * 34}px`,
                left: 0, right: 0,
                display: 'flex', alignItems: 'center',
                gap: '8px', height: '28px',
              }}
            >
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: item.color, flexShrink: 0,
                boxShadow: `0 0 4px ${item.color}80`,
              }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,240,232,0.65)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.text}
              </span>
              <span style={{ fontSize: '9px', color: 'rgba(242,240,232,0.22)', flexShrink: 0 }}>
                {item.time}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ELEMENT 3 — EMOTION WAVE
// ══════════════════════════════════════════════════════════════════════════════
const WAVE_W  = 270
const WAVE_H  = 82
const WAVE_WL = 68  // wavelength in px

function buildWavePath(amplitude, phase) {
  let d = ''
  for (let x = 0; x <= WAVE_W; x += 3) {
    const y = WAVE_H / 2 + amplitude * Math.sin(2 * Math.PI * x / WAVE_WL - phase)
    d += x === 0 ? `M${x},${y.toFixed(1)}` : ` L${x},${y.toFixed(1)}`
  }
  return d
}

function buildWaveFill(amplitude, phase) {
  let d = ''
  for (let x = 0; x <= WAVE_W; x += 3) {
    const y = WAVE_H / 2 + amplitude * Math.sin(2 * Math.PI * x / WAVE_WL - phase)
    d += x === 0 ? `M${x},${y.toFixed(1)}` : ` L${x},${y.toFixed(1)}`
  }
  d += ` L${WAVE_W},${WAVE_H} L0,${WAVE_H} Z`
  return d
}

function EmotionWave() {
  const [hovered, setHovered] = useState(false)
  const mainRef   = useRef(null)
  const shadowRef = useRef(null)
  const fillRef   = useRef(null)
  const cursorRef = useRef(null)
  const dotRef    = useRef(null)
  const tipRef    = useRef(null)   // DOM tooltip div
  const phaseRef  = useRef(0)
  const hovRef    = useRef(false)
  const elmRef    = useRef(null)
  const reduced   = useReducedMotion()

  // Sync hovered ref for rAF
  useEffect(() => { hovRef.current = hovered }, [hovered])

  // Animation loop
  useEffect(() => {
    if (reduced) return
    let animId

    function tick() {
      const amp   = hovRef.current ? 22 : 13
      const speed = hovRef.current ? 0.058 : 0.038
      phaseRef.current += speed
      const ph = phaseRef.current

      const mainD   = buildWavePath(amp, ph)
      const fillD   = buildWaveFill(amp, ph)

      if (mainRef.current)   mainRef.current.setAttribute('d', mainD)
      if (shadowRef.current) shadowRef.current.setAttribute('d', mainD)
      if (fillRef.current)   fillRef.current.setAttribute('d', fillD)

      // Update cursor line, dot, and tooltip if hovering
      const lx = localXRef.current
      if (hovRef.current && lx >= 0 && lx <= WAVE_W) {
        const y = WAVE_H / 2 + amp * Math.sin(2 * Math.PI * lx / WAVE_WL - ph)
        if (cursorRef.current) {
          cursorRef.current.setAttribute('x1', lx)
          cursorRef.current.setAttribute('x2', lx)
          cursorRef.current.style.opacity = '1'
        }
        if (dotRef.current) {
          dotRef.current.setAttribute('cx', lx)
          dotRef.current.setAttribute('cy', y.toFixed(1))
          dotRef.current.style.opacity = '1'
        }
        if (tipRef.current) {
          const week  = Math.max(1, Math.round((lx / WAVE_W) * 14))
          const score = Math.round(80 + Math.sin(lx * 0.09) * 9)
          tipRef.current.textContent = `Wk ${week} · ${score}%`
          // Position: left-clamp so it never overflows the SVG
          tipRef.current.style.left    = `${Math.min(lx - 28, WAVE_W - 60)}px`
          tipRef.current.style.opacity = '1'
        }
      } else {
        if (cursorRef.current) cursorRef.current.style.opacity = '0'
        if (dotRef.current)    dotRef.current.style.opacity    = '0'
        if (tipRef.current)    tipRef.current.style.opacity    = '0'
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track mouse X in a ref so rAF can read it without triggering re-renders
  const localXRef = useRef(-1)

  const handleMouseMove = useCallback((e) => {
    if (!elmRef.current) return
    const rect = elmRef.current.getBoundingClientRect()
    localXRef.current = e.clientX - rect.left - 20 // 20px = horizontal padding
  }, [])

  const handleMouseLeave = useCallback(() => {
    localXRef.current = -1
    setHovered(false)
  }, [])

  return (
    <div
      ref={elmRef}
      data-cursor="hover"
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${WAVE_W + 40}px`,
        background: 'rgba(11,11,17,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '18px',
        padding: '14px 20px',
        cursor: 'default',
        opacity: hovered ? 1 : 0.75,
        transition: 'opacity 0.3s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.25)' }}>Platform Sentiment</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#E8B84B' }}>87% positive</span>
      </div>

      {/* SVG wave — relative container so tooltip can use position:absolute */}
      <div style={{ position: 'relative' }}>
      <svg
        width={WAVE_W} height={WAVE_H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="wave-fill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E8B84B" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#E8B84B" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path ref={fillRef} fill="url(#wave-fill-grad)" />

        {/* Shadow wave */}
        <path
          ref={shadowRef}
          stroke="#E8B84B" strokeWidth="4" fill="none"
          opacity="0.12"
          style={{ filter: 'blur(4px)' }}
        />

        {/* Main wave */}
        <path
          ref={mainRef}
          stroke="#E8B84B" strokeWidth="1.5" fill="none"
          opacity={hovered ? 1 : 0.8}
          style={{ transition: 'opacity 0.3s' }}
        />

        {/* Cursor intersection line */}
        <line
          ref={cursorRef}
          y1="0" y2={WAVE_H}
          stroke="rgba(232,184,75,0.3)" strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0"
          style={{ transition: 'opacity 0.15s' }}
        />

        {/* Intersection dot */}
        <circle
          ref={dotRef}
          r="4" fill="#E8B84B"
          opacity="0"
          style={{
            filter: 'drop-shadow(0 0 5px #E8B84B)',
            transition: 'opacity 0.15s',
          }}
        />
      </svg>

      {/* Tooltip — DOM-driven by rAF, no React re-render needed */}
      <div
        ref={tipRef}
        style={{
          position:   'absolute',
          top:        '-28px',
          left:       0,
          background: 'rgba(11,11,17,0.9)',
          border:     '1px solid rgba(232,184,75,0.25)',
          borderRadius:'6px',
          padding:    '3px 8px',
          fontSize:   '10px',
          color:      '#E8B84B',
          whiteSpace: 'nowrap',
          opacity:    0,
          transition: 'opacity 0.15s',
          pointerEvents: 'none',
        }}
      />
      </div>{/* end relative wave wrapper */}

      {/* Bottom stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: '#3DD68C', fontWeight: 600 }}>↑ 12%</span>
        <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)' }}>this week</span>
        <span style={{ fontSize: '10px', color: 'rgba(242,240,232,0.2)', marginLeft: 'auto' }}>2,341 entries</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTED CONTAINER
// ══════════════════════════════════════════════════════════════════════════════
export default function FloatingBgCards() {
  return (
    <div className="hidden lg:block" aria-hidden>
      <style>{KEYFRAMES}</style>

      {/* 1 — Growth Ring: top-left */}
      <BgElement
        parallaxStrength={0.015}
        floatY={[-8, 8]}
        floatDur={6}
        entranceDelay={0.5}
        position={{ left: '4vw', top: '12vh' }}
      >
        <GrowthRing />
      </BgElement>

      {/* 2 — Live Activity Feed: top-right */}
      <BgElement
        parallaxStrength={0.02}
        floatY={[6, -6]}
        floatDur={5}
        entranceDelay={0.8}
        position={{ right: '4vw', top: '8vh' }}
      >
        <ActivityFeed />
      </BgElement>

      {/* 3 — Emotion Wave: bottom-right */}
      <BgElement
        parallaxStrength={0.012}
        floatY={[-5, 5]}
        floatDur={7}
        entranceDelay={1.1}
        position={{ right: '4vw', bottom: '12vh' }}
      >
        <EmotionWave />
      </BgElement>
    </div>
  )
}
