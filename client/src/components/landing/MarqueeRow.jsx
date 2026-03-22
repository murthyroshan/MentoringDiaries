import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const C = {
  surface: '#111118',
  border:  'rgba(255,255,255,0.05)',
  gold:    '#E8B84B',
  text:    '#F2F0E8',
  muted:   'rgba(242,240,232,0.6)',
  subtle:  'rgba(242,240,232,0.35)',
}

const TESTIMONIALS = [
  { name:'Aisha T.',   role:'Computer Science, Y3', quote:"My mentor actually knew what I'd been struggling with before I even explained it. The AI summary changed everything.", stars:5, init:'AT', color:'#E8B84B' },
  { name:'Marcus D.',  role:'Biomedical, Y2',       quote:"I used to dread check-ins. Now I look forward to them because there's actually context behind every conversation.", stars:5, init:'MD', color:'#D4622A' },
  { name:'Priya K.',   role:'Psychology, Y4',       quote:"Knowing my mentor has read my diary before sessions makes it feel so much more personal and effective.", stars:5, init:'PK', color:'#E8B84B' },
  { name:'James W.',   role:'Engineering, Y1',      quote:"The risk score helped me realise I was burning out before I even knew it myself. Game-changer.", stars:5, init:'JW', color:'#3DD68C' },
  { name:'Sofia M.',   role:'Economics, Y3',        quote:"Finally a platform that respects my reflection time and turns it into actionable mentor support.", stars:5, init:'SM', color:'#E8B84B' },
  { name:'Liam C.',    role:'Data Science, Y2',     quote:"My mentor flagged my engagement drop after just one entry. That intervention genuinely helped my grade.", stars:5, init:'LC', color:'#D4622A' },
  { name:'Nadia R.',   role:'Medicine, Y5',         quote:"The mentoring sessions went from surface-level to deeply personalised after we started using this. Night and day.", stars:5, init:'NR', color:'#E8B84B' },
  { name:'Oliver B.',  role:'Law, Y3',              quote:"I didn't think a platform could make me feel heard. MentoringDiaries proved me wrong — completely.", stars:5, init:'OB', color:'#3DD68C' },
]

const MENTOR_QUOTES = [
  { name:'Dr. Sarah L.',  role:'Mentor · 12 students', quote:"I can review 12 students in the time it used to take for 3. The AI brief is concise and I trust it.", stars:5, init:'SL', color:'#E8B84B' },
  { name:'Prof. Raj N.',  role:'Senior Mentor',        quote:"Risk flagging alone has helped me intervene before two students considered dropping out. This platform saves journeys.", stars:5, init:'RN', color:'#D4622A' },
  { name:'Dr. Chen W.',   role:'Mentor · STEM Faculty', quote:"The sentiment timeline is the first data tool that actually changed how I mentor. I look at patterns, not moments.", stars:5, init:'CW', color:'#E8B84B' },
  { name:'Ms. Torres A.', role:'Pastoral Mentor',      quote:"My students open up more in writing than in person. This platform bridges that gap perfectly.", stars:5, init:'TA', color:'#3DD68C' },
  { name:'Dr. Kwame P.',  role:'Mentor · 8 students',  quote:"I used to go into sessions guessing. Now I go in knowing. The difference in quality is unmistakable.", stars:5, init:'KP', color:'#E8B84B' },
  { name:'Prof. Hana M.', role:'Academic Advisor',     quote:"The admin dashboard gives me exactly the oversight I need. Risk distribution at a glance, every week.", stars:5, init:'HM', color:'#D4622A' },
  { name:'Dr. Finn O.',   role:'Mentor · CS Dept',     quote:"Students who used to ghost me now engage consistently. The accountability the diary creates is remarkable.", stars:5, init:'FO', color:'#E8B84B' },
  { name:'Ms. Yuki S.',   role:'Wellbeing Mentor',     quote:"I can finally track emotional patterns over a full semester. This is the wellbeing tool universities needed.", stars:5, init:'YS', color:'#3DD68C' },
]

function QuoteCard({ item, onHover }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => { setHovered(true);  onHover(true)  }}
      onMouseLeave={() => { setHovered(false); onHover(false) }}
      style={{
        background:   C.surface,
        border:       `1px solid ${hovered ? 'rgba(232,184,75,0.15)' : C.border}`,
        borderRadius: '20px',
        padding:      '22px 24px',
        width:        '280px',
        flexShrink:   0,
        transform:    hovered ? 'scale(1.02)' : 'scale(1)',
        transition:   'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
        boxShadow:    hovered ? '0 16px 40px rgba(0,0,0,0.4)' : 'none',
        cursor:       'default',
      }}
    >
      {/* Stars */}
      <div style={{ display:'flex', gap:'2px', marginBottom:'12px' }}>
        {Array.from({ length: item.stars }).map((_, i) => (
          <span key={i} style={{ color:C.gold, fontSize:'12px' }}>★</span>
        ))}
      </div>

      {/* Quote */}
      <p style={{ fontSize:'13px', color:C.muted, lineHeight:1.65, marginBottom:'16px' }}>
        "{item.quote}"
      </p>

      {/* Author */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{
          width:'32px', height:'32px', borderRadius:'50%', flexShrink:0,
          background:`linear-gradient(135deg, ${item.color}33, ${item.color}66)`,
          border:`1px solid ${item.color}44`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:700, color:item.color,
        }}>{item.init}</div>
        <div>
          <p style={{ fontSize:'13px', fontWeight:600, color:C.text, lineHeight:1 }}>{item.name}</p>
          <p style={{ fontSize:'11px', color:C.subtle, marginTop:'2px' }}>{item.role}</p>
        </div>
      </div>
    </div>
  )
}

function MarqueeTrack({ items, direction = 'left', speed = 40 }) {
  const prefersReduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const doubled  = [...items, ...items]  // duplicate for seamless loop
  const duration = items.length * speed

  return (
    <div style={{ overflow:'hidden', width:'100%' }}>
      <div
        style={{
          display:            'flex',
          gap:                '16px',
          width:              'max-content',
          animation:          prefersReduced ? 'none' : `marquee-${direction} ${duration}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange:         prefersReduced ? 'auto' : 'transform',
        }}
      >
        {doubled.map((item, i) => (
          <QuoteCard key={i} item={item} onHover={setPaused} />
        ))}
      </div>
    </div>
  )
}

export default function MarqueeSection() {
  return (
    <section style={{ background:'#0C0C12', padding:'128px 0', overflow:'hidden' }}>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes marquee-left  { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes marquee-right { from { transform: translateX(-50%) } to { transform: translateX(0) } }
      `}</style>

      <div style={{ maxWidth:'80rem', margin:'0 auto', padding:'0 24px', textAlign:'center', marginBottom:'64px' }}>
        <p style={{ fontSize:'11px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'#E8B84B', marginBottom:'16px' }}>
          Social Proof
        </p>
        <h2 style={{
          fontFamily:'Sora, system-ui, sans-serif',
          fontSize:'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight:700, color:'#F2F0E8',
          letterSpacing:'-0.02em',
        }}>
          Loved by students and mentors alike.
        </h2>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <MarqueeTrack items={TESTIMONIALS}  direction="left"  speed={40} />
        <MarqueeTrack items={MENTOR_QUOTES} direction="right" speed={45} />
      </div>
    </section>
  )
}
