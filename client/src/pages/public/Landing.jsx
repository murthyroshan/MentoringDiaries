import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useReducedMotion,
  useInView,
  useMotionValue,
  animate,
} from 'framer-motion'

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.15 } },
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ to, suffix = '', duration = 1.5 }) {
  const ref          = useRef(null)
  const isInView     = useInView(ref, { once: true })
  const motionValue  = useMotionValue(0)
  const [display, setDisplay] = useState(0)
  const shouldReduce = useReducedMotion()

  useEffect(() => {
    if (!isInView) return
    if (shouldReduce) { setDisplay(to); return }
    const controls = animate(motionValue, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return controls.stop
  }, [isInView, to, duration, shouldReduce, motionValue])

  return <span ref={ref}>{display}{suffix}</span>
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.5 1.5-4.5L16.862 3.487z" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function ChatHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 9.5c-.55 0-.95.4-1.5 1-.55-.6-.95-1-1.5-1A1.5 1.5 0 008 11c0 2 3 3.5 3 3.5s3-1.5 3-3.5A1.5 1.5 0 0012.5 9.5z" />
    </svg>
  )
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.63 48.63 0 0112 20.904a48.63 48.63 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 shrink-0 text-success-500" aria-hidden>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

// ─── Hero Floating Cards ──────────────────────────────────────────────────────

function DiaryEntryCard({ shouldReduce }) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative"
    >
      <motion.div
        animate={shouldReduce ? {} : {
          y: [0, -10, 0],
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="glass-card p-4 w-64 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary-600" />
          </div>
          <span className="text-xs font-semibold text-neutral-600">Today's Entry</span>
          <span className="ml-auto text-xs text-neutral-400">just now</span>
        </div>
        <p className="text-xs text-neutral-700 leading-relaxed">
          "Completed the React module. Still finding hooks tricky, but it's starting to click..."
        </p>
        <div className="mt-3 flex gap-1.5">
          <span className="badge bg-primary-50 text-primary-700 border border-primary-200">Reflection</span>
          <span className="badge bg-accent-50 text-accent-700 border border-accent-200">Progress</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AiRiskCard({ shouldReduce }) {
  const circumference = 2 * Math.PI * 32
  return (
    <motion.div
      variants={fadeUp}
      className="relative"
    >
      <motion.div
        animate={shouldReduce ? {} : {
          y: [0, 10, 0],
          transition: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
        }}
        className="glass-card p-5 w-52 shadow-lg"
      >
        <p className="text-xs font-semibold text-neutral-500 mb-3 text-center">AI Risk Score</p>
        <div className="flex items-center justify-center mb-3">
          <svg width="80" height="80" viewBox="0 0 80 80" aria-label="Risk score: 82, On Track">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E7E5E4" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="32"
              fill="none"
              stroke="#10B981"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.82} ${circumference * 0.18}`}
              strokeDashoffset={circumference * 0.25}
              transform="rotate(-90 40 40)"
            />
            <text x="40" y="45" textAnchor="middle" fill="#10B981" fontSize="18" fontWeight="700" fontFamily="Sora, sans-serif">82</text>
          </svg>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success-500" />
          <span className="text-xs text-success-700 font-semibold">On Track</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MentorResponseCard({ shouldReduce }) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative"
    >
      <motion.div
        animate={shouldReduce ? {} : {
          y: [0, -7, 0],
          transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 },
        }}
        className="glass-card p-4 w-60 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">DR</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-800 truncate">Dr. Rivera</p>
            <p className="text-xs text-neutral-400">Your Mentor</p>
          </div>
        </div>
        <div className="bg-primary-50 rounded-lg p-2.5">
          <p className="text-xs text-primary-800 leading-relaxed">
            "Great reflection! Keep pushing — your progress is really showing. 🎯"
          </p>
        </div>
        <p className="text-right text-xs text-neutral-400 mt-1.5">2h ago</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Animated Dashed Connector ────────────────────────────────────────────────

function ConnectorLine() {
  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true })
  const shouldReduce = useReducedMotion()

  return (
    <div
      ref={ref}
      className="hidden md:block absolute inset-x-0 pointer-events-none"
      style={{ top: '60px', padding: '0 16.67%' }}
      aria-hidden
    >
      <svg className="w-full h-6" viewBox="0 0 400 24" fill="none" preserveAspectRatio="none">
        <motion.path
          d="M 0 12 L 400 12"
          stroke="#C7D2FE"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView && !shouldReduce ? { pathLength: 1, opacity: 1 } : (shouldReduce && isInView ? { pathLength: 1, opacity: 1 } : {})}
          transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
        />
      </svg>
    </div>
  )
}

// ─── Role Card Data ───────────────────────────────────────────────────────────

const roleCards = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Student',
    colorKey: 'primary',
    points: [
      'Write daily reflective diary entries',
      'Track your growth with AI-powered insights',
      'Get direct feedback from your assigned mentor',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'Mentor',
    colorKey: 'accent',
    points: [
      'Review student entries and flag concerns',
      'Respond with rich feedback and guidance',
      'Monitor student progress at a glance',
    ],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
    title: 'Admin',
    colorKey: 'neutral',
    points: [
      'Manage users, roles, and permissions',
      'View institution-wide risk analytics',
      'Ensure compliance and data integrity',
    ],
  },
]

const roleColors = {
  primary: {
    icon: 'bg-primary-50 text-primary-600',
    badge: 'bg-primary-600',
    hover: 'hover:border-primary-300',
    glow: { boxShadow: '0 8px 32px rgba(79,70,229,0.18)' },
  },
  accent: {
    icon: 'bg-accent-50 text-accent-600',
    badge: 'bg-accent-500',
    hover: 'hover:border-accent-300',
    glow: { boxShadow: '0 8px 32px rgba(245,158,11,0.18)' },
  },
  neutral: {
    icon: 'bg-neutral-100 text-neutral-600',
    badge: 'bg-neutral-600',
    hover: 'hover:border-neutral-400',
    glow: { boxShadow: '0 8px 32px rgba(0,0,0,0.10)' },
  },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Landing() {
  const shouldReduce = useReducedMotion()

  const baseTransition = shouldReduce
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: shouldReduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'rgb(var(--bg-primary))' }}>

      {/* ── Keyframes (scoped inline) ─────────────────────────────────────── */}
      <style>{`
        @keyframes gradientCycle {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-neutral-200/60"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-sm">
              <GraduationCapIcon />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg leading-none tracking-tight">
              Mentoring<span className="text-primary-600">Diaries</span>
            </span>
          </div>
          {/* Nav actions */}
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Hero
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden gradient-hero">

        {/* Background orbs — CSS-only, slow drift */}
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div
            className="absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full animate-blob"
            style={{
              background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 68%)',
              filter: 'blur(48px)',
            }}
          />
          <div
            className="absolute top-1/3 -right-32 w-[520px] h-[520px] rounded-full animate-blob animation-delay-2000"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.13) 0%, transparent 68%)',
              filter: 'blur(56px)',
            }}
          />
          <div
            className="absolute -bottom-24 left-1/4 w-[400px] h-[400px] rounded-full animate-blob animation-delay-4000"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 68%)',
              filter: 'blur(64px)',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: text ───────────────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-7"
          >
            {/* Eyebrow badge */}
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                Trusted by 500+ students
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="font-display font-bold text-5xl lg:text-6xl text-neutral-900 leading-[1.08] tracking-tight"
            >
              Your growth,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #4F46E5 0%, #F59E0B 50%, #4F46E5 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: shouldReduce ? 'none' : 'gradientCycle 3.5s linear infinite',
                }}
              >
                guided.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={fadeUp}
              className="text-lg text-neutral-500 leading-relaxed max-w-md"
            >
              A warm, structured space where students reflect daily, AI watches over patterns,
              and mentors arrive with the guidance that truly matters.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <button
                onClick={scrollToHowItWorks}
                className="btn btn-ghost btn-lg border border-neutral-200 hover:border-neutral-300 gap-2"
              >
                See how it works
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
              </button>
            </motion.div>

            {/* Animated counters */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-8 pt-2">
              {[
                { to: 500, suffix: '+', label: 'Students' },
                { to: 98,  suffix: '%', label: 'On-track' },
                { to: 24,  suffix: 'hr', label: 'Response time' },
              ].map(({ to, suffix, label }) => (
                <div key={label}>
                  <p className="font-display font-bold text-2xl text-neutral-900">
                    <AnimatedCounter to={to} suffix={suffix} />
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Right: staggered floating cards ─────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="relative hidden lg:block h-[480px]"
            aria-hidden
          >
            {/* Soft ambient glow behind cards */}
            <div
              className="absolute inset-8 rounded-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 55% 45%, rgba(79,70,229,0.07) 0%, transparent 70%)' }}
            />

            {/* Diary entry card — top-left */}
            <div className="absolute top-2 left-0">
              <DiaryEntryCard shouldReduce={shouldReduce} />
            </div>

            {/* AI risk score card — center-right */}
            <div className="absolute top-[30%] right-0">
              <AiRiskCard shouldReduce={shouldReduce} />
            </div>

            {/* Mentor response card — bottom-left */}
            <div className="absolute bottom-4 left-10">
              <MentorResponseCard shouldReduce={shouldReduce} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — How It Works
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-28 relative overflow-hidden">
        {/* Section ambient */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.05) 0%, transparent 60%)' }}
        />

        <div className="max-w-6xl mx-auto px-6">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={baseTransition}
            className="text-center mb-20"
          >
            <h2 className="font-display font-bold text-4xl lg:text-5xl text-neutral-900 mb-4 tracking-tight">
              Simple. Structured. Supportive.
            </h2>
            <p className="text-neutral-500 text-lg max-w-md mx-auto">
              Three steps. Infinite growth.
            </p>
          </motion.div>

          {/* Steps grid + connector */}
          <div className="relative">
            <ConnectorLine />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                {
                  step: '01',
                  Icon: PencilIcon,
                  title: 'Student writes',
                  desc: 'Students log daily reflections, challenges, and wins in their personal growth diary.',
                  accentClass: 'bg-primary-50 text-primary-600',
                  stepColor: 'text-primary-400',
                },
                {
                  step: '02',
                  Icon: SparkleIcon,
                  title: 'AI analyzes',
                  desc: 'Our AI scans for sentiment patterns, risk signals, and engagement levels in real time.',
                  accentClass: 'bg-accent-50 text-accent-600',
                  stepColor: 'text-accent-400',
                },
                {
                  step: '03',
                  Icon: ChatHeartIcon,
                  title: 'Mentor responds',
                  desc: 'Mentors receive smart context and reply with personalized, timely guidance.',
                  accentClass: 'bg-primary-50 text-primary-600',
                  stepColor: 'text-primary-400',
                },
              ].map(({ step, Icon, title, desc, accentClass, stepColor }) => (
                <motion.div
                  key={step}
                  variants={fadeUp}
                  className="glass-card p-8 flex flex-col items-center text-center"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${accentClass}`}>
                    <Icon />
                  </div>
                  <span className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-2 ${stepColor}`}>
                    Step {step}
                  </span>
                  <h3 className="font-display font-semibold text-xl text-neutral-900 mb-3">{title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — Role Cards + Final CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-28" style={{ background: 'rgb(var(--bg-secondary))' }}>
        <div className="max-w-6xl mx-auto px-6">

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={baseTransition}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-4xl lg:text-5xl text-neutral-900 mb-4 tracking-tight">
              Built for everyone in your institution
            </h2>
            <p className="text-neutral-500 text-lg max-w-xl mx-auto">
              One platform, three powerful roles — seamlessly connected.
            </p>
          </motion.div>

          {/* Role cards */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            {roleCards.map(({ icon, title, colorKey, points }) => {
              const c = roleColors[colorKey]
              return (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  whileHover={shouldReduce ? {} : { y: -4, transition: { duration: 0.2 } }}
                  whileFocus={shouldReduce ? {} : { y: -4 }}
                  className={`glass-card p-8 border border-neutral-200 transition-all duration-250 ${c.hover}`}
                  style={{ cursor: 'default' }}
                  onMouseEnter={(e) => !shouldReduce && Object.assign(e.currentTarget.style, c.glow)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${c.icon}`}>
                    {icon}
                  </div>
                  {/* Title */}
                  <h3 className="font-display font-semibold text-xl text-neutral-900 mb-4">{title}</h3>
                  {/* Bullet points */}
                  <ul className="space-y-2.5" role="list">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-neutral-600">
                        <CheckIcon />
                        {point}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ── Final CTA block ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={baseTransition}
            className="relative rounded-3xl p-12 lg:p-16 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #312E81 0%, #4F46E5 55%, #6366F1 100%)' }}
          >
            {/* Decorative orbs inside CTA */}
            <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div
                className="absolute -top-20 -right-20 w-72 h-72 rounded-full"
                style={{ background: 'rgba(245,158,11,0.18)', filter: 'blur(48px)' }}
              />
              <div
                className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full"
                style={{ background: 'rgba(99,102,241,0.25)', filter: 'blur(40px)' }}
              />
            </div>

            <div className="relative z-10">
              <h2 className="font-display font-bold text-4xl lg:text-5xl text-white mb-4 leading-tight tracking-tight">
                Start your growth journey today.
              </h2>
              <p className="text-primary-200 text-lg mb-10 max-w-lg mx-auto">
                Join thousands of students and mentors building meaningful academic relationships.
              </p>
              <Link to="/register" className="btn btn-accent btn-xl inline-flex gap-2">
                Get started today
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <GraduationCapIcon />
            </div>
            <span className="font-display font-semibold text-neutral-800 text-sm">
              Mentoring<span className="text-primary-600">Diaries</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <Link to="/login" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Register
            </Link>
          </nav>

          {/* Tagline */}
          <p className="text-xs text-neutral-400 text-center sm:text-right">
            Guided growth. Every day.
          </p>
        </div>
      </footer>

    </div>
  )
}
