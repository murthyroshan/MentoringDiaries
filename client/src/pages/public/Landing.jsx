import {
  useEffect, useRef, useState, useCallback, lazy, Suspense,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  motion, useReducedMotion, useScroll, useTransform,
  useMotionValue, useSpring, AnimatePresence,
} from 'framer-motion'

// Stable motion-wrapped Link — must be outside any component
const MotionLink = motion(Link)
import Lenis from 'lenis'
import HeroCards   from '../../components/landing/HeroCards'
import MarqueeSection from '../../components/landing/MarqueeRow'
import BentoGrid   from '../../components/landing/BentoGrid'

const ParticleField = lazy(() => import('../../components/landing/ParticleField'))

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  void:      '#06060A',
  dark:      '#0C0C12',
  surface:   '#111118',
  elevated:  '#16161F',
  border:    'rgba(255,255,255,0.06)',
  borderLit: 'rgba(255,220,100,0.2)',
  gold:      '#E8B84B',
  goldLight: '#F5D380',
  goldDim:   'rgba(232,184,75,0.15)',
  ember:     '#D4622A',
  emberDim:  'rgba(212,98,42,0.12)',
  text:      '#F2F0E8',
  muted:     'rgba(242,240,232,0.45)',
  subtle:    'rgba(242,240,232,0.2)',
  green:     '#3DD68C',
}

// ── Smooth scroll with Lenis ──────────────────────────────────────────────────
function useSmoothScroll(skip) {
  const lenisRef = useRef(null)

  useEffect(() => {
    if (skip) return
    const lenis = new Lenis({
      duration: 1.4,
      easing:   (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenisRef.current = lenis
    let active = true

    function raf(time) {
      if (!active) return
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      active = false
      lenis.destroy()
    }
  }, [skip])

  return lenisRef
}

// ── CountUp ───────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1500, skip = false) {
  const [count, setCount] = useState(skip ? target : 0)
  const ref   = useRef(null)
  const ran   = useRef(false)

  useEffect(() => {
    if (skip) { setCount(target); return }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || ran.current) return
      ran.current = true
      const t0 = performance.now()
      const tick = (now) => {
        const p  = Math.min((now - t0) / duration, 1)
        const ep = 1 - (1 - p) ** 3
        setCount(Math.round(ep * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [target, duration, skip])

  return [count, ref]
}

// ── Magnetic button ───────────────────────────────────────────────────────────
function MagneticButton({ children, strength = 6, style = {}, onClick, to, className = '', onMouseEnter, onMouseLeave: onLeaveExt, 'data-cursor': dc = 'button' }) {
  const ref   = useRef(null)
  const bx    = useMotionValue(0)
  const by    = useMotionValue(0)
  const sbx   = useSpring(bx, { stiffness: 200, damping: 20 })
  const sby   = useSpring(by, { stiffness: 200, damping: 20 })

  const onMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2
    const dx   = e.clientX - cx
    const dy   = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 120) {
      bx.set((dx / dist) * strength)
      by.set((dy / dist) * strength)
    }
  }, [bx, by, strength])

  const onLeave = useCallback((e) => {
    bx.set(0)
    by.set(0)
    onLeaveExt?.(e)
  }, [bx, by, onLeaveExt])

  const sharedProps = {
    ref,
    'data-cursor': dc,
    className,
    onMouseMove:   onMove,
    onMouseLeave:  onLeave,
    onMouseEnter,
    style: { x: sbx, y: sby, textDecoration: 'none', ...style },
  }

  if (to) {
    return <MotionLink to={to} {...sharedProps}>{children}</MotionLink>
  }
  return (
    <motion.button type="button" onClick={onClick} {...sharedProps}>
      {children}
    </motion.button>
  )
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ text, startDelay = 1200, speed = 35 }) {
  const [displayed, setDisplayed] = useState('')
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    let i   = 0
    const tid = setTimeout(() => {
      const iv = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) { clearInterval(iv); setDone(true) }
      }, speed)
      return () => clearInterval(iv)
    }, startDelay)
    return () => clearTimeout(tid)
  }, [text, startDelay, speed])

  return (
    <p style={{
      fontSize:'clamp(1rem, 2vw, 1.25rem)',
      color: C.muted,
      maxWidth:'600px',
      margin:'32px auto 0',
      lineHeight:1.7,
      minHeight:'2.2em',
    }}>
      {displayed}
      <motion.span
        animate={{ opacity: done ? [1,0,1] : 1 }}
        transition={{ duration:0.7, repeat:Infinity }}
        style={{ color:C.gold, fontWeight:300 }}
      >|</motion.span>
    </p>
  )
}

// ── Word-by-word headline ─────────────────────────────────────────────────────
function AnimatedHeadline({ lines, skip }) {
  const words = lines.flatMap((line, li) =>
    line.text.split(' ').map((w, wi) => ({ word: w, isGold: line.gold, li, wi }))
  )

  return (
    <h1 style={{
      fontFamily:    'Sora, system-ui, sans-serif',
      fontSize:      'clamp(3rem, 8vw, 8rem)',
      fontWeight:    800,
      lineHeight:    0.95,
      letterSpacing: '-0.03em',
      margin:        0,
    }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display:'block' }}>
          {line.text.split(' ').map((word, wi) => {
            const idx = words.findIndex(w => w.li === li && w.wi === wi)
            return (
              <motion.span
                key={wi}
                initial={skip ? {} : { opacity:0, y:40, rotateX:-20 }}
                animate={skip ? {} : { opacity:1, y:0,  rotateX:0   }}
                transition={{ duration:0.6, delay: idx * 0.06, ease:[0.25, 0.1, 0.25, 1] }}
                style={{
                  display:           'inline-block',
                  marginRight:       '0.25em',
                  color:             line.gold ? C.gold : 'rgba(242,240,232,0.90)',
                  textShadow:        line.gold ? '0 0 80px rgba(232,184,75,0.4)' : 'none',
                  transformOrigin:   'bottom center',
                  perspectiveOrigin: 'bottom center',
                }}
              >
                {word}
              </motion.span>
            )
          })}
        </div>
      ))}
    </h1>
  )
}

// ── How It Works — 3D flip cards ──────────────────────────────────────────────
const HOW_STEPS = [
  {
    n:'01', emoji:'✍️',
    title:'Student writes',
    desc:'Log your week — reflections, challenges, wins, and how you\'re really feeling.',
    backDesc:'Each entry is private, unstructured, and yours. Students complete their diary in minutes with mood tracking and free text.',
    stat:'85% completion rate',
  },
  {
    n:'02', emoji:'🤖',
    title:'AI analyzes',
    desc:'Groq AI scans every entry for sentiment patterns, risk signals, and engagement levels.',
    backDesc:'Llama 3.1 processes language at 500+ tokens/second. Risk scores, sentiment trends, and key themes extracted instantly.',
    stat:'< 2s analysis time',
  },
  {
    n:'03', emoji:'💬',
    title:'Mentor responds',
    desc:'Your mentor gets full context and AI suggestions — so their response actually helps.',
    backDesc:'Mentors arrive prepared with an AI brief, flagged risks, and suggested discussion points. No cold reading, no guesswork.',
    stat:'< 24h response time',
  },
]

function FlipCard({ step, skip }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <motion.div
      initial={{ opacity:0, y:60 }}
      whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true, margin:'-80px' }}
      transition={{ duration:0.7, ease:[0.25, 0.1, 0.25, 1] }}
      style={{ perspective:'1000px', width:'320px', height:'360px', cursor:'pointer', flexShrink:0 }}
      onMouseEnter={() => !skip && setFlipped(true)}
      onMouseLeave={() => !skip && setFlipped(false)}
      data-cursor="hover"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration:0.6, ease:[0.4, 0, 0.2, 1] }}
        style={{ width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d' }}
      >
        {/* Front */}
        <div style={{
          position:   'absolute', inset:0,
          background: C.surface,
          border:     `1px solid ${C.border}`,
          borderRadius:'24px', padding:'36px',
          backfaceVisibility:'hidden',
          WebkitBackfaceVisibility:'hidden',
          display:'flex', flexDirection:'column',
        }}>
          <span style={{
            position:'absolute', top:'20px', right:'24px',
            fontSize:'80px', fontWeight:900,
            color:'rgba(255,255,255,0.03)',
            lineHeight:1, fontFamily:'Sora, system-ui, sans-serif',
            userSelect:'none',
          }}>{step.n}</span>
          <div style={{
            width:'56px', height:'56px', borderRadius:'16px',
            background:'rgba(232,184,75,0.1)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'28px', marginBottom:'20px',
          }}>{step.emoji}</div>
          <h3 style={{ fontFamily:'Sora, system-ui, sans-serif', fontSize:'22px', fontWeight:700, color:C.text, marginBottom:'10px' }}>
            {step.title}
          </h3>
          <p style={{ fontSize:'14px', color:C.muted, lineHeight:1.65, flex:1 }}>{step.desc}</p>
          <p style={{ fontSize:'11px', color:C.subtle, marginTop:'16px' }}>Hover to see more →</p>
        </div>

        {/* Back */}
        <div style={{
          position:   'absolute', inset:0,
          background: `linear-gradient(135deg, rgba(232,184,75,0.08), rgba(212,98,42,0.08))`,
          border:     `1px solid rgba(232,184,75,0.2)`,
          borderRadius:'24px', padding:'36px',
          backfaceVisibility:'hidden',
          WebkitBackfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          display:'flex', flexDirection:'column', justifyContent:'space-between',
        }}>
          <div>
            <div style={{
              display:'inline-block', fontSize:'11px', fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase',
              color:C.gold, border:`1px solid rgba(232,184,75,0.3)`,
              borderRadius:'9999px', padding:'4px 12px', marginBottom:'16px',
            }}>Step {step.n}</div>
            <p style={{ fontSize:'14px', color:'rgba(242,240,232,0.75)', lineHeight:1.7 }}>
              {step.backDesc}
            </p>
          </div>
          <div style={{
            background:'rgba(232,184,75,0.1)', borderRadius:'12px',
            padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px',
          }}>
            <span style={{ fontSize:'20px' }}>📊</span>
            <span style={{ fontSize:'14px', fontWeight:600, color:C.gold }}>{step.stat}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Stat item ─────────────────────────────────────────────────────────────────
function StatItem({ to, prefix = '', suffix = '', label, skip }) {
  const [count, ref] = useCountUp(to, 1500, skip)
  return (
    <div ref={ref} style={{ textAlign:'center' }}>
      <p style={{
        fontSize:'2.5rem', fontWeight:900, color:C.text,
        fontFamily:'Sora, system-ui, sans-serif', lineHeight:1,
      }}>
        {prefix}{skip ? to : count}{suffix}
      </p>
      <p style={{ fontSize:'13px', color:C.subtle, marginTop:'6px' }}>{label}</p>
      <div style={{ width:'32px', height:'1px', background:'rgba(232,184,75,0.4)', margin:'12px auto 0' }} />
    </div>
  )
}

// ── Final CTA countdown ───────────────────────────────────────────────────────
function FinalCTAContent({ skip }) {
  const [phase, setPhase] = useState(0)
  const ref = useRef(null)
  const triggered = useRef(false)

  useEffect(() => {
    if (skip) { setPhase(4); return }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || triggered.current) return
      triggered.current = true
      setPhase(1)
      setTimeout(() => setPhase(2), 700)
      setTimeout(() => setPhase(3), 1400)
      setTimeout(() => setPhase(4), 2100)
    }, { threshold:0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [skip])

  return (
    <div ref={ref} style={{ textAlign:'center', position:'relative', zIndex:10 }}>
      {/* Countdown numbers 1-3 */}
      <AnimatePresence mode="wait">
        {phase > 0 && phase < 4 && (
          <motion.div
            key={`num-${phase}`}
            initial={{ opacity:0, scale:0.5 }}
            animate={{ opacity:1, scale:1 }}
            exit={{ opacity:0, scale:1.5 }}
            transition={{ duration:0.5 }}
            style={{
              fontSize:'clamp(8rem, 20vw, 14rem)',
              fontWeight:900, color:C.gold,
              fontFamily:'Sora, system-ui, sans-serif',
              lineHeight:1,
              textShadow:`0 0 120px rgba(232,184,75,0.5)`,
              position:'absolute', top:'50%', left:'50%',
              transform:'translate(-50%, -50%)',
              userSelect:'none',
            }}
          >
            {['','01','02','03'][phase]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final content */}
      <AnimatePresence>
        {phase === 4 && (
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ duration:0.8 }}
          >
            <motion.h2
              style={{
                fontFamily:'Sora, system-ui, sans-serif',
                fontSize:'clamp(2.5rem, 7vw, 5.5rem)',
                fontWeight:900, color:C.text,
                letterSpacing:'-0.03em',
                lineHeight:1.05, marginBottom:'24px',
              }}
            >
              {['Your','students','deserve','better.'].map((w,i) => (
                <motion.span
                  key={i}
                  initial={{ opacity:0, y:30 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: i * 0.1, duration:0.5 }}
                  style={{ display:'inline-block', marginRight:'0.3em' }}
                >
                  {w}
                </motion.span>
              ))}
            </motion.h2>

            <motion.p
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              transition={{ delay:0.6 }}
              style={{ fontSize:'clamp(1rem, 2vw, 1.25rem)', color:C.muted, marginBottom:'56px' }}
            >
              Give them a mentor who's always prepared.
            </motion.p>

            <motion.div
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.9 }}
            >
              <MagneticButton
                to="/register"
                strength={8}
                style={{
                  display:'inline-flex', alignItems:'center', gap:'12px',
                  background:`linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                  color:'#06060A', fontWeight:700, fontSize:'1.2rem',
                  padding:'24px 48px', borderRadius:'20px',
                  border:'none', cursor:'pointer',
                  boxShadow:'0 0 0 rgba(232,184,75,0)',
                  transition:'box-shadow 0.3s, transform 0.3s',
                  willChange:'transform',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 30px 100px rgba(232,184,75,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 0 rgba(232,184,75,0)'}
              >
                Begin your journey
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width:'20px', height:'20px' }}>
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" />
                </svg>
              </MagneticButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Landing ──────────────────────────────────────────────────────────────
export default function Landing() {
  const skip    = useReducedMotion()
  const navigate = useNavigate()
  const lenisRef = useSmoothScroll(skip)

  // Scroll state
  const { scrollY } = useScroll()
  const [scrolled,     setScrolled]     = useState(false)
  const [heroScrolled, setHeroScrolled] = useState(false)

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => {
      setScrolled(v > 80)
      setHeroScrolled(v > 100)
    })
    return unsub
  }, [scrollY])

  // Detect mobile for performance
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Navbar button hover
  const [navBtnHover, setNavBtnHover] = useState(false)
  const [primaryHover, setPrimaryHover] = useState(false)
  const [ghostHover,   setGhostHover]   = useState(false)

  return (
    <div style={{ background:C.void, overflowX:'hidden', minHeight:'100vh', cursor:'none' }}>

      {/* ── Global styles ──────────────────────────────────────────────────── */}
      <style>{`
        * { cursor: none !important; }
        @media (max-width: 768px) { * { cursor: auto !important; } }

        @keyframes ping-gold {
          0%   { transform: scale(1);   opacity: 1; }
          75%  { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes ping-gold-2 {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes orb-drift-1 {
          0%,100% { transform: translate(0,0); }
          33%     { transform: translate(30px,-20px); }
          66%     { transform: translate(-15px,15px); }
        }
        @keyframes orb-drift-2 {
          0%,100% { transform: translate(0,0); }
          33%     { transform: translate(-30px,20px); }
          66%     { transform: translate(20px,-15px); }
        }
        @keyframes scroll-line {
          0%   { transform: scaleY(0); transform-origin: top; }
          50%  { transform: scaleY(1); transform-origin: top; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }
        .nav-underline {
          position: relative;
          text-decoration: none;
        }
        .nav-underline::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          height: 1px; width: 100%;
          background: #F2F0E8;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .nav-underline:hover::after { transform: scaleX(1); }

        .get-started-btn {
          position: relative;
          overflow: hidden;
        }
        .get-started-btn::before {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 0;
          background: #E8B84B;
          transition: height 0.3s ease;
          z-index: 0;
        }
        .get-started-btn:hover::before { height: 100%; }
        .get-started-btn span { position: relative; z-index: 1; transition: color 0.3s; }
        .get-started-btn:hover span { color: #06060A; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ opacity:0, y:-16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.5 }}
        style={{
          position:'fixed', top:0, left:0, right:0, zIndex:50,
          background:       scrolled ? 'rgba(6,6,10,0.75)' : 'transparent',
          backdropFilter:   scrolled ? 'blur(24px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
          borderBottom:     scrolled ? '1px solid rgba(232,184,75,0.08)' : '1px solid transparent',
          transition:       'background 0.4s, backdrop-filter 0.4s, border-color 0.4s',
        }}
      >
        <div style={{
          maxWidth:'80rem', margin:'0 auto', padding:'0 32px',
          height:'68px', display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          {/* Logo */}
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }} data-cursor="hover">
            <div style={{
              width:'34px', height:'34px', borderRadius:'8px',
              background:C.void, border:`1px solid rgba(232,184,75,0.3)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', fontWeight:800, color:C.gold,
              fontFamily:'Sora, system-ui, sans-serif',
              transition:'border-color 0.3s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,184,75,0.8)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,184,75,0.3)'}
            >MD</div>
            <span style={{ fontSize:'15px', fontWeight:600, fontFamily:'Sora, system-ui, sans-serif' }}>
              <span style={{ color:'rgba(242,240,232,0.7)' }}>Mentoring</span>
              <span style={{ color:C.gold }}>Diaries</span>
            </span>
          </Link>

          {/* Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <Link
              to="/login"
              className="nav-underline"
              data-cursor="hover"
              style={{ fontSize:'14px', color:'rgba(242,240,232,0.6)', padding:'8px 12px' }}
              onMouseEnter={e => e.currentTarget.style.color = C.text}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,240,232,0.6)'}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="get-started-btn"
              data-cursor="button"
              style={{
                display:'flex', alignItems:'center', gap:'0',
                border:`1px solid rgba(232,184,75,0.3)`,
                padding:'8px 20px', borderRadius:'10px',
                fontSize:'14px', fontWeight:500,
              }}
            >
              <span style={{ color:C.text }}>Get started</span>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight:'100vh', background:C.void,
        paddingTop:'160px', position:'relative', overflow:'hidden',
      }}>

        {/* Three.js particle field — desktop only */}
        {!isMobile && !skip && (
          <Suspense fallback={null}>
            <ParticleField
              style={{
                position:'absolute', inset:0,
                pointerEvents:'none', zIndex:0,
              }}
            />
          </Suspense>
        )}

        {/* Gradient orbs */}
        <div aria-hidden style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:1 }}>
          <div style={{
            position:'absolute', top:'10%', left:'20%',
            width:'700px', height:'700px', borderRadius:'50%',
            background:'radial-gradient(circle, rgba(232,184,75,0.06) 0%, transparent 70%)',
            animation: skip ? 'none' : 'orb-drift-1 20s ease-in-out infinite',
            willChange:'transform',
          }} />
          <div style={{
            position:'absolute', top:'40%', right:'10%',
            width:'500px', height:'500px', borderRadius:'50%',
            background:'radial-gradient(circle, rgba(212,98,42,0.05) 0%, transparent 70%)',
            animation: skip ? 'none' : 'orb-drift-2 25s ease-in-out infinite',
            willChange:'transform',
          }} />
          <div style={{
            position:'absolute', bottom:'20%', left:'40%',
            width:'300px', height:'300px', borderRadius:'50%',
            background:'radial-gradient(circle, rgba(232,184,75,0.04) 0%, transparent 70%)',
          }} />
          {/* Noise texture */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.03 }}>
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>

        {/* Hero content */}
        <div style={{
          position:'relative', zIndex:10,
          maxWidth:'72rem', margin:'0 auto', padding:'0 32px',
          textAlign:'center',
        }}>

          {/* Announce badge */}
          <motion.div
            initial={skip ? {} : { opacity:0, y:-20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5, delay:0 }}
            style={{ display:'flex', justifyContent:'center', marginBottom:'40px' }}
          >
            <div
              data-cursor="hover"
              style={{
                display:'inline-flex', alignItems:'center', gap:'10px',
                border:`1px solid rgba(232,184,75,0.2)`,
                background:'rgba(232,184,75,0.05)',
                backdropFilter:'blur(8px)',
                borderRadius:'9999px', padding:'8px 20px',
                transition:'background 0.3s, border-color 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(232,184,75,0.1)'; e.currentTarget.style.borderColor='rgba(232,184,75,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(232,184,75,0.05)'; e.currentTarget.style.borderColor='rgba(232,184,75,0.2)' }}
            >
              {/* Pulsing dot */}
              <div style={{ position:'relative', width:'8px', height:'8px', flexShrink:0 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:C.gold, animation: skip ? 'none' : 'ping-gold 1.5s ease-out infinite' }} />
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:C.gold, animation: skip ? 'none' : 'ping-gold-2 1.5s ease-out 0.5s infinite' }} />
                <div style={{ position:'relative', width:'8px', height:'8px', borderRadius:'50%', background:C.gold }} />
              </div>
              <span style={{ fontSize:'13px', color:'rgba(242,240,232,0.7)' }}>
                Now with Groq AI · Llama 3.1 · Real-time analysis
              </span>
              <motion.span
                whileHover={skip ? {} : { x:4 }}
                style={{ color:C.gold, fontSize:'13px' }}
              >→</motion.span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            style={{ transformPerspective:'1000px', marginBottom:0 }}
          >
            <AnimatedHeadline
              skip={skip}
              lines={[
                { text:'Mentoring',       gold:false },
                { text:'that actually',   gold:false },
                { text:'works.',          gold:true  },
              ]}
            />
          </motion.div>

          {/* Typewriter subheadline */}
          <Typewriter
            text="Students reflect weekly. AI spots what matters. Mentors arrive prepared."
            startDelay={1400}
            speed={35}
          />

          {/* CTA buttons */}
          <div style={{ display:'flex', gap:'20px', justifyContent:'center', marginTop:'48px', flexWrap:'wrap' }}>
            {/* Primary — Start for free */}
            <MagneticButton
              to="/register"
              strength={6}
              style={{
                display:'inline-flex', alignItems:'center', gap:'10px',
                background:C.gold, color:'#06060A',
                fontWeight:700, fontSize:'1rem',
                padding:'16px 32px', borderRadius:'16px',
                border:'none', cursor:'pointer',
                boxShadow: primaryHover ? '0 20px 60px rgba(232,184,75,0.35)' : 'none',
                transition:'box-shadow 0.3s, transform 0.2s',
                willChange:'transform',
              }}
              onMouseEnter={() => setPrimaryHover(true)}
              onMouseLeave={() => setPrimaryHover(false)}
            >
              Start for free
              <motion.svg
                animate={primaryHover && !skip ? { x:6 } : { x:0 }}
                viewBox="0 0 20 20" fill="currentColor"
                style={{ width:'18px', height:'18px' }}
              >
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" />
              </motion.svg>
            </MagneticButton>

            {/* Ghost — Watch it work */}
            <MagneticButton
              strength={3}
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: skip ? 'auto' : 'smooth' })}
              style={{
                display:'inline-flex', alignItems:'center', gap:'10px',
                background:'transparent',
                border:`1px solid ${ghostHover ? 'rgba(232,184,75,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: ghostHover ? C.text : 'rgba(242,240,232,0.6)',
                fontWeight:400, fontSize:'1rem',
                padding:'16px 32px', borderRadius:'16px',
                cursor:'pointer',
                transition:'border-color 0.3s, color 0.3s',
                willChange:'transform',
              }}
              onMouseEnter={() => setGhostHover(true)}
              onMouseLeave={() => setGhostHover(false)}
            >
              Watch it work ↓
            </MagneticButton>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={heroScrolled ? { opacity:0 } : { opacity:1 }}
            transition={{ duration:0.4 }}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
              marginTop:'80px', pointerEvents:'none',
            }}
          >
            <div style={{
              width:'1px', height:'60px',
              background:'rgba(232,184,75,0.4)',
              animation: skip ? 'none' : 'scroll-line 1.8s ease-in-out infinite',
            }} />
            <span style={{ fontSize:'11px', color:'rgba(242,240,232,0.2)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
              scroll
            </span>
          </motion.div>

          {/* Stats row */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:'clamp(32px, 6vw, 80px)',
            marginTop:'80px',
            borderTop:`1px solid rgba(255,255,255,0.04)`, paddingTop:'40px',
            flexWrap:'wrap',
          }}>
            <StatItem to={500} suffix="+" label="Students enrolled"     skip={skip} />
            <div style={{ width:'1px', height:'40px', background:'rgba(255,255,255,0.08)' }} aria-hidden />
            <StatItem to={98}  suffix="%" label="On-track rate"          skip={skip} />
            <div style={{ width:'1px', height:'40px', background:'rgba(255,255,255,0.08)' }} aria-hidden />
            <StatItem to={24}  prefix="<" suffix="h" label="Mentor response" skip={skip} />
          </div>
        </div>

        {/* Floating hero cards */}
        <HeroCards scrollY={scrollY} />

        {/* Bottom gradient fade */}
        <div aria-hidden style={{
          position:'absolute', bottom:0, left:0, right:0, height:'140px',
          background:`linear-gradient(to bottom, transparent, ${C.void})`,
          pointerEvents:'none', zIndex:5,
        }} />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS — 3D FLIP CARDS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background:C.dark, padding:'160px 0' }}>
        <div style={{ maxWidth:'80rem', margin:'0 auto', padding:'0 32px' }}>

          <motion.div
            initial={{ opacity:0, y:24 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.6 }}
            style={{ textAlign:'center', marginBottom:'80px' }}
          >
            <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:C.gold, marginBottom:'16px' }}>
              How It Works
            </p>
            <h2 style={{
              fontFamily:'Sora, system-ui, sans-serif',
              fontSize:'clamp(2rem, 5vw, 3.5rem)',
              fontWeight:700, color:C.text,
              letterSpacing:'-0.02em', marginBottom:'16px',
            }}>
              Three steps. Infinite growth.
            </h2>
            <p style={{ color:C.muted, fontSize:'16px', maxWidth:'28rem', margin:'0 auto' }}>
              From diary entry to mentor response in under 24 hours.
            </p>
          </motion.div>

          <div style={{
            display:'flex', gap:'24px', justifyContent:'center',
            flexWrap:'wrap',
          }}>
            {HOW_STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                transition={{ delay: i * 0.2 }}
              >
                <FlipCard step={s} skip={skip} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES — PINNED SCROLL SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <FeaturesSection skip={skip} />

      {/* ════════════════════════════════════════════════════════════════════
          BENTO GRID — ROLE CARDS
      ════════════════════════════════════════════════════════════════════ */}
      <BentoGrid />

      {/* ════════════════════════════════════════════════════════════════════
          TESTIMONIALS — MARQUEE
      ════════════════════════════════════════════════════════════════════ */}
      <MarqueeSection />

      {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA — FULL SCREEN
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight:'100vh', background:C.void,
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
      }}>
        {!isMobile && !skip && (
          <Suspense fallback={null}>
            <ParticleField style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, opacity:0.7 }} />
          </Suspense>
        )}
        {/* Orb */}
        <div aria-hidden style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%, -50%)',
          width:'600px', height:'600px', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(232,184,75,0.05) 0%, transparent 70%)',
          pointerEvents:'none', zIndex:1,
        }} />
        <FinalCTAContent skip={skip} />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background:   C.void,
        borderTop:    `1px solid rgba(255,255,255,0.04)`,
        padding:      '64px 0',
      }}>
        <div style={{
          maxWidth:'80rem', margin:'0 auto', padding:'0 32px',
          display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',
          gap:'40px', alignItems:'start',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <div style={{
                width:'32px', height:'32px', borderRadius:'8px',
                background:C.void, border:`1px solid rgba(232,184,75,0.3)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'12px', fontWeight:800, color:C.gold,
                fontFamily:'Sora, system-ui, sans-serif',
              }}>MD</div>
              <span style={{ fontSize:'14px', fontWeight:600, fontFamily:'Sora, system-ui, sans-serif' }}>
                <span style={{ color:'rgba(242,240,232,0.7)' }}>Mentoring</span>
                <span style={{ color:C.gold }}>Diaries</span>
              </span>
            </div>
            <p style={{ fontSize:'13px', color:C.subtle, lineHeight:1.65, maxWidth:'220px' }}>
              AI-powered mentoring for educational institutions.
            </p>
            <p style={{ fontSize:'12px', color:'rgba(242,240,232,0.2)', marginTop:'16px' }}>
              © 2025 MentoringDiaries. Built for students.
            </p>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontSize:'12px', fontWeight:600, color:C.subtle, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'20px' }}>
              Platform
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {[
                { label:'Sign In',   to:'/login'    },
                { label:'Register',  to:'/register' },
                { label:'Features',  to:'/'         },
                { label:'For Teams', to:'/'         },
              ].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="nav-underline"
                  data-cursor="hover"
                  style={{ fontSize:'14px', color:C.subtle, textDecoration:'none', display:'inline-block' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text}
                  onMouseLeave={e => e.currentTarget.style.color = C.subtle}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'16px' }}>
            <p style={{ fontSize:'14px', color:C.muted }}>
              Ready to get started?
            </p>
            <Link
              to="/register"
              className="get-started-btn"
              data-cursor="button"
              style={{
                display:'inline-flex', padding:'12px 24px',
                border:`1px solid rgba(232,184,75,0.3)`,
                borderRadius:'12px', fontSize:'14px', fontWeight:500,
              }}
            >
              <span style={{ color:C.text }}>Get started →</span>
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ── Features section (inline) ─────────────────────────────────────────────────
const FEATURES = [
  {
    n:'01', title:'AI Risk Detection',
    desc:'Groq-powered analysis spots burnout, disengagement, and academic risk before they escalate.',
    visual: <RiskChart />,
  },
  {
    n:'02', title:'Weekly Diary System',
    desc:'Students reflect in minutes. Free text, mood tracking, and structured prompts — all in one.',
    visual: <DiaryMockup />,
  },
  {
    n:'03', title:'Mentor Dashboard',
    desc:'AI briefs, risk flags, and sentiment timelines — everything a mentor needs before a session.',
    visual: <MentorMockup />,
  },
  {
    n:'04', title:'Institution Analytics',
    desc:'Cohort-wide risk distributions, engagement trends, and exportable audit reports.',
    visual: <AnalyticsMockup />,
  },
]

function RiskChart() {
  const bars = [0.4, 0.55, 0.7, 0.5, 0.8, 0.65, 0.9]
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'80px', padding:'0 8px' }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height:0 }}
          whileInView={{ height:`${h*80}px` }}
          viewport={{ once:true }}
          transition={{ duration:0.6, delay: i*0.08, ease:[0.25,0.1,0.25,1] }}
          style={{
            flex:1, borderRadius:'4px 4px 0 0',
            background: h > 0.75 ? C.gold : h > 0.5 ? 'rgba(232,184,75,0.5)' : 'rgba(232,184,75,0.25)',
          }}
        />
      ))}
    </div>
  )
}
function DiaryMockup() {
  return (
    <div style={{ padding:'0 8px' }}>
      {[1, 0.75, 0.9, 0.5].map((w,i) => (
        <motion.div
          key={i}
          initial={{ opacity:0, x:-20 }}
          whileInView={{ opacity:1, x:0 }}
          viewport={{ once:true }}
          transition={{ delay: i*0.1 }}
          style={{
            height:'8px', borderRadius:'4px',
            background:`rgba(232,184,75,${w * 0.3})`,
            width:`${w*100}%`, marginBottom:'8px',
          }}
        />
      ))}
    </div>
  )
}
function MentorMockup() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px', padding:'0 8px' }}>
      {[{ label:'Sentiment', v:80, c:C.gold },{ label:'Engagement', v:65, c:'#F5A623' },{ label:'Risk', v:30, c:C.green }].map(({ label, v, c }) => (
        <div key={label}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
            <span style={{ fontSize:'10px', color:C.subtle }}>{label}</span>
            <span style={{ fontSize:'10px', color:C.muted }}>{v}%</span>
          </div>
          <div style={{ height:'4px', borderRadius:'9999px', background:'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width:0 }}
              whileInView={{ width:`${v}%` }}
              viewport={{ once:true }}
              transition={{ duration:0.8 }}
              style={{ height:'100%', borderRadius:'9999px', background:c }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
function AnalyticsMockup() {
  const data = [0.3, 0.6, 0.45, 0.8, 0.55, 0.7, 0.9, 0.5]
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'5px', height:'60px', padding:'0 8px' }}>
      {data.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY:0 }}
          whileInView={{ scaleY:1 }}
          viewport={{ once:true }}
          transition={{ delay: i*0.06 }}
          style={{
            flex:1, height:`${h*60}px`, borderRadius:'3px 3px 0 0',
            background:`rgba(232,184,75,${0.2 + h*0.5})`,
            transformOrigin:'bottom',
          }}
        />
      ))}
    </div>
  )
}

function FeaturesSection({ skip }) {
  return (
    <section style={{ background:C.void, padding:'160px 0' }}>
      <div style={{ maxWidth:'80rem', margin:'0 auto', padding:'0 32px' }}>

        <motion.div
          initial={{ opacity:0, y:24 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.6 }}
          style={{ textAlign:'center', marginBottom:'80px' }}
        >
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:C.gold, marginBottom:'16px' }}>
            Everything You Need
          </p>
          <h2 style={{
            fontFamily:'Sora, system-ui, sans-serif',
            fontSize:'clamp(2rem, 5vw, 3.5rem)',
            fontWeight:700, color:C.text,
            letterSpacing:'-0.02em',
          }}>
            Everything your institution needs.
          </h2>
        </motion.div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'24px' }}>
          {FEATURES.map(({ n, title, desc, visual }, i) => (
            <motion.div
              key={n}
              initial={{ opacity:0, y:60 }}
              whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true, margin:'-60px' }}
              transition={{ duration:0.7, delay: i * 0.1, ease:[0.25, 0.1, 0.25, 1] }}
              style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderRadius: '24px', padding:'36px',
                position:     'relative', overflow:'hidden',
                transition:   'border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(232,184,75,0.2)'
                e.currentTarget.style.boxShadow   = '0 20px 60px rgba(0,0,0,0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.boxShadow   = 'none'
              }}
              data-cursor="hover"
            >
              <span style={{
                position:'absolute', top:'20px', right:'24px',
                fontSize:'72px', fontWeight:900,
                color:'rgba(255,255,255,0.025)',
                lineHeight:1, fontFamily:'Sora, system-ui, sans-serif',
                userSelect:'none',
              }}>{n}</span>

              <div style={{ marginBottom:'20px' }}>{visual}</div>

              <h3 style={{
                fontFamily:'Sora, system-ui, sans-serif',
                fontSize:'22px', fontWeight:700, color:C.text,
                marginBottom:'10px',
              }}>{title}</h3>
              <p style={{ fontSize:'14px', color:C.muted, lineHeight:1.65 }}>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const C_feat = C  // alias for components defined after Landing
