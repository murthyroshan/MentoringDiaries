/**
 * Three decorative glassmorphism cards that float in the background
 * behind the FormCard (z-index: 1). Desktop-only. Parallax on mouse move.
 * opacity: 0.6, blur: 2px — intentionally soft.
 */
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'

const C = {
  gold:   '#E8B84B',
  green:  '#3DD68C',
  text:   '#F2F0E8',
  subtle: 'rgba(242,240,232,0.3)',
}

const CARD_BASE = {
  position:          'fixed',
  background:        'rgba(17,17,24,0.5)',
  border:            '1px solid rgba(255,255,255,0.05)',
  backdropFilter:    'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius:      '20px',
  padding:           '16px',
  pointerEvents:     'none',
  opacity:           0.6,
  zIndex:            1,
}

const CARDS = [
  {
    // Mini diary snippet
    style: { left: '5vw', top: '15vh', width: '190px', transform: 'rotate(-8deg)' },
    float: { y: [-8, 8], dur: 5.5 },
    parallax: 0.022,
    content: (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: C.gold }} />
          <span style={{ fontSize:'11px', fontWeight:600, color:'rgba(242,240,232,0.7)' }}>Week 9 Entry</span>
        </div>
        <div style={{ marginBottom:'8px' }}>
          <div style={{ height:'6px', borderRadius:'3px', background:'rgba(255,255,255,0.07)', marginBottom:'5px', width:'90%' }} />
          <div style={{ height:'6px', borderRadius:'3px', background:'rgba(255,255,255,0.05)', width:'65%' }} />
        </div>
        <span style={{
          fontSize:'10px', padding:'2px 8px', borderRadius:'9999px',
          background:'rgba(61,214,140,0.1)', color: C.green,
          display:'inline-flex', alignItems:'center', gap:'4px',
        }}>
          <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:C.green, display:'inline-block' }} />
          On Track
        </span>
      </div>
    ),
  },
  {
    // AI Score ring
    style: { right: '7vw', bottom: '20vh', width: '160px', transform: 'rotate(6deg)' },
    float: { y: [6, -10], dur: 4.2 },
    parallax: 0.018,
    content: (
      <div>
        <p style={{ fontSize:'10px', color:'rgba(242,240,232,0.4)', textAlign:'center', marginBottom:'10px' }}>AI Score</p>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'10px' }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r="26" fill="none" stroke="rgba(232,184,75,0.1)" strokeWidth="5" />
            <circle cx="34" cy="34" r="26" fill="none" stroke={C.gold} strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26 * 0.91} ${2 * Math.PI * 26 * 0.09}`}
              strokeDashoffset={2 * Math.PI * 26 * 0.25}
              transform="rotate(-90 34 34)"
            />
            <text x="34" y="38" textAnchor="middle" fill={C.text} fontSize="14" fontWeight="800"
              fontFamily="Sora, system-ui">91</text>
          </svg>
        </div>
        {[{ l:'Sentiment', p:88 }, { l:'Risk', p:12 }].map(({ l, p }) => (
          <div key={l} style={{ marginBottom:'4px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
              <span style={{ fontSize:'9px', color:'rgba(242,240,232,0.3)' }}>{l}</span>
              <span style={{ fontSize:'9px', color:'rgba(242,240,232,0.5)' }}>{p}%</span>
            </div>
            <div style={{ height:'2px', background:'rgba(255,255,255,0.06)', borderRadius:'9999px' }}>
              <div style={{ height:'100%', width:`${p}%`, background: C.gold, borderRadius:'9999px' }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    // Mentor feedback
    style: { right: '6vw', top: '10vh', width: '200px', transform: 'rotate(4deg)' },
    float: { y: [-6, 9], dur: 6.1 },
    parallax: 0.026,
    content: (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#E8B84B,#D4622A)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'10px', fontWeight:700, color:'#06060A',
          }}>DR</div>
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, color:'rgba(242,240,232,0.7)', margin:0 }}>Dr. Reema</p>
            <p style={{ fontSize:'10px', color:C.subtle, margin:0 }}>New feedback ✓</p>
          </div>
        </div>
        <div style={{ background:'rgba(232,184,75,0.06)', borderRadius:'12px', padding:'10px' }}>
          <p style={{ fontSize:'11px', color:'rgba(242,240,232,0.6)', lineHeight:1.5, margin:0 }}>
            Great progress this week! Keep going 🎯
          </p>
        </div>
      </div>
    ),
  },
]

// ── Single floating card ──────────────────────────────────────────────────────
function BgCard({ config, mouseRef }) {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const smx = useSpring(mx, { stiffness: 60, damping: 20 })
  const smy = useSpring(my, { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (reduced) return
    const move = (e) => {
      // Parallax: opposite to mouse direction
      mx.set(-(e.clientX / window.innerWidth  - 0.5) * window.innerWidth  * config.parallax)
      my.set(-(e.clientY / window.innerHeight - 0.5) * window.innerHeight * config.parallax)
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [reduced, config.parallax, mx, my])

  return (
    <motion.div
      style={{ ...CARD_BASE, ...config.style, x: smx, y: smy }}
      animate={reduced ? {} : { y: config.float.y }}
      transition={{
        y: { duration: config.float.dur, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
      }}
    >
      {config.content}
    </motion.div>
  )
}

// ── Exported container (desktop only) ─────────────────────────────────────────
export default function FloatingBgCards() {
  const mouseRef = useRef({ x: 0, y: 0 })

  return (
    <div className="hidden lg:block">
      {CARDS.map((cfg, i) => (
        <BgCard key={i} config={cfg} mouseRef={mouseRef} />
      ))}
    </div>
  )
}
