import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const C = {
  surface:    '#111118',
  elevated:   '#16161F',
  border:     'rgba(255,255,255,0.07)',
  borderLit:  'rgba(232,184,75,0.2)',
  gold:       '#E8B84B',
  goldDim:    'rgba(232,184,75,0.08)',
  text:       '#F2F0E8',
  muted:      'rgba(242,240,232,0.45)',
  subtle:     'rgba(242,240,232,0.2)',
  green:      '#3DD68C',
}

function use3DTilt(strength = 0.02) {
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const sRotX = useSpring(rotX, { stiffness: 300, damping: 30 })
  const sRotY = useSpring(rotY, { stiffness: 300, damping: 30 })

  const ref = useRef(null)

  const onMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2
    const dx   = e.clientX - cx
    const dy   = e.clientY - cy
    rotX.set(-(dy * strength))
    rotY.set(  dx * strength)
  }, [rotX, rotY, strength])

  const onLeave = useCallback(() => {
    rotX.set(0)
    rotY.set(0)
  }, [rotX, rotY])

  return { ref, sRotX, sRotY, onMove, onLeave }
}

// ── Diary Entry Card ─────────────────────────────────────────────────────────
function DiaryCard() {
  const { ref, sRotX, sRotY, onMove, onLeave } = use3DTilt(0.018)
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { onLeave(); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      style={{
        rotateX: sRotX,
        rotateY: sRotY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
        background:   C.surface,
        border:       `1px solid ${hovered ? C.borderLit : C.border}`,
        borderRadius: '24px',
        padding:      '20px',
        width:        '300px',
        boxShadow:    hovered
          ? '0 30px 80px rgba(0,0,0,0.6), inset 0 0 30px rgba(232,184,75,0.05)'
          : '0 30px 80px rgba(0,0,0,0.6)',
        transform:    'rotate(-4deg)',
        transition:   'border-color 0.3s, box-shadow 0.3s',
        cursor:       'default',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
        <div style={{
          width:'32px', height:'32px', borderRadius:'50%',
          background:'linear-gradient(135deg, #E8B84B, #D4622A)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'13px', fontWeight:700, color:'#06060A',
        }}>S</div>
        <div>
          <p style={{ fontSize:'13px', fontWeight:600, color:C.text, lineHeight:1 }}>Weekly Entry</p>
          <p style={{ fontSize:'11px', color:C.subtle, marginTop:'2px' }}>2 min ago</p>
        </div>
      </div>

      {/* Mood row */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'12px' }}>
        {['😔','😐','🙂','😊','🤩'].map((e,i) => (
          <div key={i} style={{
            width:'28px', height:'28px', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'14px',
            border: i === 2 ? `2px solid ${C.gold}` : '2px solid transparent',
            background: i === 2 ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)',
          }}>{e}</div>
        ))}
      </div>

      {/* Text lines */}
      <div style={{ marginBottom:'12px' }}>
        <div style={{ height:'8px', borderRadius:'4px', background:'rgba(255,255,255,0.08)', marginBottom:'6px', width:'90%' }} />
        <div style={{ height:'8px', borderRadius:'4px', background:'rgba(255,255,255,0.05)', width:'70%' }} />
      </div>

      {/* Tags */}
      <div style={{ display:'flex', gap:'6px' }}>
        <span style={{
          fontSize:'11px', padding:'3px 10px', borderRadius:'9999px',
          background:'rgba(232,184,75,0.1)', color:C.gold,
        }}>Week 8</span>
        <span style={{
          fontSize:'11px', padding:'3px 10px', borderRadius:'9999px',
          background:'rgba(61,214,140,0.1)', color:C.green,
          display:'flex', alignItems:'center', gap:'4px',
        }}>
          <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:C.green, display:'inline-block' }} />
          On Track
        </span>
      </div>
    </motion.div>
  )
}

// ── AI Analysis Card ──────────────────────────────────────────────────────────
function AICard() {
  const { ref, sRotX, sRotY, onMove, onLeave } = use3DTilt(0.02)
  const [hovered, setHovered] = useState(false)
  const r    = 42
  const circ = 2 * Math.PI * r
  const pct  = 0.87
  const dash = circ * pct

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { onLeave(); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      style={{
        rotateX: sRotX,
        rotateY: sRotY,
        transformPerspective: 1000,
        background:   C.surface,
        border:       `1px solid ${hovered ? C.borderLit : C.border}`,
        borderRadius: '24px',
        padding:      '20px',
        width:        '220px',
        marginLeft:   'auto',
        marginTop:    '-30px',
        boxShadow:    hovered
          ? '0 20px 60px rgba(232,184,75,0.15), 0 30px 80px rgba(0,0,0,0.6)'
          : '0 30px 80px rgba(0,0,0,0.6)',
        transition:   'border-color 0.3s, box-shadow 0.3s',
        cursor:       'default',
      }}
    >
      <p style={{ fontSize:'11px', color:C.muted, textAlign:'center', marginBottom:'12px' }}>AI Analysis</p>

      {/* Ring */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:'14px', position:'relative' }}>
        <svg width="110" height="110" viewBox="0 0 110 110" aria-label="AI risk score 87">
          {/* Glow ring */}
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(232,184,75,0.1)" strokeWidth="8" />
          {/* Main ring */}
          <circle
            cx="55" cy="55" r={r}
            fill="none" stroke={C.gold}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ * 0.25}
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="60" textAnchor="middle" fill={C.text} fontSize="22" fontWeight="900"
            fontFamily="Sora, system-ui, sans-serif">87</text>
          <text x="55" y="74" textAnchor="middle" fill={C.subtle} fontSize="9">Risk Score</text>
        </svg>
      </div>

      {/* Mini bars */}
      {[
        { label:'Sentiment',  pct: 80, color: C.gold },
        { label:'Engagement', pct: 60, color: '#F5A623' },
        { label:'Risk',       pct: 40, color: C.green },
      ].map(({ label, pct, color }) => (
        <div key={label} style={{ marginBottom:'6px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
            <span style={{ fontSize:'10px', color:C.subtle }}>{label}</span>
            <span style={{ fontSize:'10px', color:C.muted }}>{pct}%</span>
          </div>
          <div style={{ height:'3px', borderRadius:'9999px', background:'rgba(255,255,255,0.06)' }}>
            <div style={{ height:'100%', borderRadius:'9999px', background:color, width:`${pct}%` }} />
          </div>
        </div>
      ))}
    </motion.div>
  )
}

// ── Mentor Reply Card ─────────────────────────────────────────────────────────
function MentorCard() {
  const { ref, sRotX, sRotY, onMove, onLeave } = use3DTilt(0.018)
  const [hovered, setHovered] = useState(false)
  const [showDots, setShowDots] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setShowDots(v => !v), 8000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { onLeave(); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      style={{
        rotateX: sRotX,
        rotateY: sRotY,
        transformPerspective: 1000,
        background:   C.surface,
        border:       `1px solid ${hovered ? C.borderLit : C.border}`,
        borderRadius: '24px',
        padding:      '20px',
        width:        '280px',
        marginTop:    '16px',
        boxShadow:    hovered
          ? '0 30px 80px rgba(0,0,0,0.6), inset 0 0 30px rgba(232,184,75,0.05)'
          : '0 30px 80px rgba(0,0,0,0.6)',
        transform:    'rotate(3deg)',
        transition:   'border-color 0.3s, box-shadow 0.3s',
        cursor:       'default',
      }}
    >
      {/* Mentor info */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
        <div style={{
          width:'34px', height:'34px', borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg, #E8B84B, #D4622A)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:700, color:'#06060A',
        }}>DR</div>
        <div>
          <p style={{ fontSize:'13px', fontWeight:600, color:C.text, lineHeight:1 }}>Dr. Reema</p>
          <p style={{ fontSize:'11px', color:C.subtle, marginTop:'2px' }}>Your Mentor</p>
        </div>
      </div>

      {/* Chat bubble */}
      <div style={{
        background: 'rgba(232,184,75,0.07)',
        borderRadius:'16px', padding:'12px',
        marginBottom:'10px',
      }}>
        <p style={{ fontSize:'12px', color:'rgba(242,240,232,0.7)', lineHeight:1.6 }}>
          Strong week! Your consistency is building. Let's discuss your React challenges on Friday. 🎯
        </p>
      </div>

      {/* Typing dots or seen */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontSize:'11px', color:C.subtle }}>Seen · just now</p>
        {showDots && (
          <div style={{ display:'flex', gap:'3px', alignItems:'center' }}>
            {[0,1,2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration:0.6, repeat:Infinity, delay: i * 0.15 }}
                style={{ width:'5px', height:'5px', borderRadius:'50%', background:C.gold }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Exported container ────────────────────────────────────────────────────────
export default function HeroCards({ scrollY }) {
  const y1 = useTransform(scrollY, [0, 600], [0, -180])
  const y2 = useTransform(scrollY, [0, 600], [0, -300])
  const y3 = useTransform(scrollY, [0, 600], [0, -120])

  return (
    <div
      className="hidden lg:block"
      aria-hidden
      style={{ position:'absolute', right:'4%', top:'50%', transform:'translateY(-50%)', width:'360px', zIndex:10 }}
    >
      <motion.div style={{ y: y1 }}><DiaryCard /></motion.div>
      <motion.div style={{ y: y2 }}><AICard /></motion.div>
      <motion.div style={{ y: y3 }}><MentorCard /></motion.div>
    </div>
  )
}
