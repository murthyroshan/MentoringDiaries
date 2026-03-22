import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

const C = {
  surface:  '#111118',
  elevated: '#16161F',
  border:   'rgba(255,255,255,0.05)',
  gold:     '#E8B84B',
  goldDim:  'rgba(232,184,75,0.08)',
  ember:    '#D4622A',
  text:     '#F2F0E8',
  muted:    'rgba(242,240,232,0.45)',
  subtle:   'rgba(242,240,232,0.2)',
  green:    '#3DD68C',
}

function useSpotlight() {
  const ref  = useRef(null)
  const [spot, setSpot] = useState({ x: 0, y: 0, visible: false })

  const onMove = useCallback((e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])

  const onLeave = useCallback(() => setSpot(s => ({ ...s, visible: false })), [])

  return { ref, spot, onMove, onLeave }
}

function BentoCard({ children, style = {}, colSpan = 1, rowSpan = 1 }) {
  const { ref, spot, onMove, onLeave } = useSpotlight()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { onLeave(); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      initial={{ opacity:0, y:40 }}
      whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true, margin:'-60px' }}
      transition={{ duration:0.6, ease:[0.25, 0.1, 0.25, 1] }}
      style={{
        background:   C.surface,
        border:       `1px solid ${hovered ? 'rgba(232,184,75,0.18)' : C.border}`,
        borderRadius: '28px',
        padding:      '32px',
        position:     'relative',
        overflow:     'hidden',
        gridColumn:   `span ${colSpan}`,
        gridRow:      `span ${rowSpan}`,
        transition:   'border-color 0.3s, box-shadow 0.3s',
        boxShadow:    hovered ? '0 20px 60px rgba(0,0,0,0.5)' : 'none',
        ...style,
      }}
    >
      {/* Spotlight */}
      {spot.visible && (
        <div
          aria-hidden
          style={{
            position:   'absolute',
            left:       spot.x,
            top:        spot.y,
            width:      '400px',
            height:     '400px',
            transform:  'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(232,184,75,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
            borderRadius:  '50%',
          }}
        />
      )}
      <div style={{ position:'relative', zIndex:1 }}>{children}</div>
    </motion.div>
  )
}

// Fake UI inside student card
function FakeDiaryUI() {
  return (
    <div style={{
      background: C.elevated,
      borderRadius:'16px',
      padding:'16px',
      marginTop:'20px',
      border:`1px solid rgba(255,255,255,0.06)`,
    }}>
      {/* Fake header */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
        <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:'rgba(232,184,75,0.15)' }} />
        <div>
          <div style={{ width:'80px', height:'7px', borderRadius:'4px', background:'rgba(255,255,255,0.12)', marginBottom:'4px' }} />
          <div style={{ width:'50px', height:'6px', borderRadius:'4px', background:'rgba(255,255,255,0.07)' }} />
        </div>
      </div>
      {/* Fake textarea */}
      <div style={{
        background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px',
        marginBottom:'10px', border:'1px solid rgba(255,255,255,0.06)',
      }}>
        {[1,0.85,0.7,0.5].map((w,i) => (
          <div key={i} style={{
            height:'6px', borderRadius:'3px',
            background:'rgba(255,255,255,0.08)',
            width:`${w*100}%`, marginBottom:'6px',
          }} />
        ))}
      </div>
      {/* Mood row */}
      <div style={{ display:'flex', gap:'5px', marginBottom:'10px' }}>
        {['😔','😐','🙂','😊','🤩'].map((e,i) => (
          <div key={i} style={{
            width:'24px', height:'24px', borderRadius:'50%', fontSize:'12px',
            display:'flex', alignItems:'center', justifyContent:'center',
            background: i === 2 ? 'rgba(232,184,75,0.15)' : 'rgba(255,255,255,0.05)',
            border: i === 2 ? '1px solid rgba(232,184,75,0.4)' : '1px solid transparent',
          }}>{e}</div>
        ))}
      </div>
      {/* Submit button */}
      <div style={{
        background:'#E8B84B', borderRadius:'8px', padding:'7px 0',
        textAlign:'center', fontSize:'11px', fontWeight:700, color:'#06060A',
      }}>Submit Entry</div>
    </div>
  )
}

const CHECK = (
  <svg viewBox="0 0 12 12" fill="none" stroke="#E8B84B" strokeWidth={2} style={{ width:'12px', height:'12px', marginTop:'2px', flexShrink:0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l2.5 2.5L10 3" />
  </svg>
)

export default function BentoGrid() {
  return (
    <section style={{ background:'#06060A', padding:'160px 0' }}>
      <div style={{ maxWidth:'80rem', margin:'0 auto', padding:'0 24px' }}>

        {/* Heading */}
        <motion.div
          initial={{ opacity:0, y:24 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.6 }}
          style={{ textAlign:'center', marginBottom:'72px' }}
        >
          <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:C.gold, marginBottom:'16px' }}>
            Built For Everyone
          </p>
          <h2 style={{
            fontFamily:'Sora, system-ui, sans-serif',
            fontSize:'clamp(1.8rem, 4vw, 3rem)',
            fontWeight:700, color:C.text,
            letterSpacing:'-0.02em',
          }}>
            One platform, three roles.
          </h2>
          <p style={{ color:C.muted, fontSize:'16px', marginTop:'12px' }}>
            Students grow. Mentors guide. Admins oversee.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3, 1fr)',
          gridTemplateRows:'auto auto',
          gap:'16px',
        }}>

          {/* Student — large, spans 2 cols + 2 rows */}
          <BentoCard colSpan={2} rowSpan={2} style={{ minHeight:'440px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
              <div style={{
                width:'44px', height:'44px', borderRadius:'14px',
                background:'rgba(232,184,75,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px',
              }}>📖</div>
              <div>
                <p style={{ fontSize:'11px', color:C.gold, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>For Students</p>
              </div>
            </div>
            <h3 style={{ fontFamily:'Sora, system-ui, sans-serif', fontSize:'28px', fontWeight:700, color:C.text, letterSpacing:'-0.02em', marginBottom:'6px' }}>
              Reflect. Grow. Repeat.
            </h3>
            <p style={{ fontSize:'14px', color:C.muted, lineHeight:1.65, maxWidth:'360px' }}>
              Your weekly diary is more than a record — it's a signal. Write freely, track your mood, and let AI surface what really matters.
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:'20px 0 0', display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                'Write weekly reflective diary entries',
                'AI-powered mood and sentiment tracking',
                'Get direct mentor feedback within 24h',
                'View your growth timeline semester-wide',
              ].map(f => (
                <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                  {CHECK}
                  <span style={{ fontSize:'14px', color:'rgba(242,240,232,0.65)', lineHeight:1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
            <FakeDiaryUI />
          </BentoCard>

          {/* Mentor */}
          <BentoCard>
            <div style={{
              width:'44px', height:'44px', borderRadius:'14px',
              background:'rgba(212,98,42,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'14px',
            }}>🧭</div>
            <p style={{ fontSize:'11px', color:'#F5A623', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>For Mentors</p>
            <h3 style={{ fontFamily:'Sora, system-ui, sans-serif', fontSize:'22px', fontWeight:700, color:C.text, letterSpacing:'-0.02em', marginBottom:'8px' }}>
              Guide with full context.
            </h3>
            <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, marginBottom:'16px' }}>
              See AI briefs, sentiment trends, and risk flags before every session.
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'8px' }}>
              {['Review entries with AI context','Flag at-risk students instantly','Schedule and manage sessions'].map(f => (
                <li key={f} style={{ display:'flex', gap:'8px' }}>
                  {CHECK}
                  <span style={{ fontSize:'13px', color:'rgba(242,240,232,0.6)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          {/* Admin */}
          <BentoCard>
            <div style={{
              width:'44px', height:'44px', borderRadius:'14px',
              background:'rgba(61,214,140,0.1)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', marginBottom:'14px',
            }}>🛡️</div>
            <p style={{ fontSize:'11px', color:C.green, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'6px' }}>For Admins</p>
            <h3 style={{ fontFamily:'Sora, system-ui, sans-serif', fontSize:'22px', fontWeight:700, color:C.text, letterSpacing:'-0.02em', marginBottom:'8px' }}>
              Oversee everything.
            </h3>
            <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, marginBottom:'16px' }}>
              Institution-wide risk monitoring, user management, and audit exports.
            </p>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'8px' }}>
              {['Manage users, roles, permissions','Monitor institution-wide risk','Export reports and audit logs'].map(f => (
                <li key={f} style={{ display:'flex', gap:'8px' }}>
                  {CHECK}
                  <span style={{ fontSize:'13px', color:'rgba(242,240,232,0.6)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </BentoCard>

          {/* Stat bar — spans 3 cols */}
          <BentoCard colSpan={3} style={{ padding:'28px 32px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:'200px' }}>
                <p style={{ fontSize:'14px', fontWeight:600, color:C.text, marginBottom:'4px' }}>
                  Average risk score reduced by{' '}
                  <span style={{ color:C.green }}>34%</span>
                  {' '}in Semester 1
                </p>
                <p style={{ fontSize:'12px', color:C.subtle }}>
                  Across institutions using active AI monitoring
                </p>
              </div>
              <div style={{ flex:2, minWidth:'200px' }}>
                <div style={{ height:'8px', borderRadius:'9999px', background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
                  <motion.div
                    initial={{ width:0 }}
                    whileInView={{ width:'66%' }}
                    viewport={{ once:true }}
                    transition={{ duration:1.2, ease:[0.25, 0.1, 0.25, 1], delay:0.3 }}
                    style={{ height:'100%', borderRadius:'9999px', background:`linear-gradient(90deg, ${C.gold}, ${C.green})` }}
                  />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px' }}>
                  <span style={{ fontSize:'11px', color:C.subtle }}>Semester start</span>
                  <span style={{ fontSize:'11px', color:C.green }}>↓34% risk reduction</span>
                </div>
              </div>
            </div>
          </BentoCard>

        </div>
      </div>
    </section>
  )
}
