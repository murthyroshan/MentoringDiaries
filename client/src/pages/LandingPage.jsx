import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { GraduationCap, Brain, BarChart3, Shield, BookOpen, ArrowRight, Sparkles, Users, TrendingUp, MessageSquare } from 'lucide-react'

const features = [
    { icon: Brain, title: 'AI-Powered Analysis', desc: 'Sentiment scoring, risk detection, and auto-summaries using cutting-edge AI.', color: 'violet' },
    { icon: Shield, title: 'Risk Monitoring', desc: 'Weighted risk formula catches at-risk students early using historical patterns.', color: 'red' },
    { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Intervention response time, mentor efficiency, and trend analysis dashboards.', color: 'indigo' },
    { icon: Users, title: 'Role-Based Access', desc: 'Secure, tailored experiences for students, mentors, and administrators.', color: 'green' },
    { icon: TrendingUp, title: 'Progress Tracking', desc: 'Visual history of student emotional and academic trajectory over time.', color: 'orange' },
    { icon: Sparkles, title: 'Smart Notifications', desc: 'Real-time Socket.io alerts when entries are submitted or reviewed.', color: 'pink' },
]

const roleCards = [
    {
        role: 'student', icon: BookOpen, label: 'Student Portal',
        desc: 'Submit weekly diary entries and receive AI-powered insights on your progress.',
        color: 'from-violet-500 to-indigo-500', to: '/register',
    },
    {
        role: 'mentor', icon: Users, label: 'Mentor Console',
        desc: 'Review assigned student entries, provide feedback, and monitor wellbeing.',
        color: 'from-indigo-500 to-blue-500', to: '/register',
    },
]

const colorIcon = {
    violet: { bg: 'rgba(139,92,246,0.1)', color: 'rgb(139,92,246)' },
    red: { bg: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' },
    indigo: { bg: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)' },
    green: { bg: 'rgba(34,197,94,0.1)', color: 'rgb(34,197,94)' },
    orange: { bg: 'rgba(249,115,22,0.1)', color: 'rgb(249,115,22)' },
    pink: { bg: 'rgba(236,72,153,0.1)', color: 'rgb(236,72,153)' },
}

export default function LandingPage() {
    const { scrollY } = useScroll();
    const headerBackground = useTransform(scrollY, [0, 50], ['rgba(15,23,42,0)', 'rgba(15,23,42,0.8)']);
    const headerBorder = useTransform(scrollY, [0, 50], ['1px solid rgba(255,255,255,0)', '1px solid rgba(255,255,255,0.1)']);
    const heroY = useTransform(scrollY, [0, 500], [0, 150]);
    const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

    // Mock Chat Demo State
    const [chatStep, setChatStep] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setChatStep(s => (s + 1) % 4);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const chatVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="min-h-screen gradient-hero relative overflow-hidden" style={{ background: 'rgb(var(--bg-primary))' }}>
            {/* Animated Mesh Background base via CSS grid */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)' }} />

            {/* HEADER */}
            <motion.header 
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" 
                style={{ backgroundColor: headerBackground, borderBottom: headerBorder }}
            >
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            <GraduationCap size={16} color="white" />
                        </div>
                        <span className="font-bold text-base tracking-tight" style={{ color: 'rgb(var(--text-primary))' }}>MentorDiaries</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="btn btn-ghost text-sm font-medium">Sign In</Link>
                        <Link to="/register" className="btn btn-primary text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)]">Get Started</Link>
                    </div>
                </div>
            </motion.header>

            {/* HERO */}
            <motion.section 
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 z-10"
            >
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    {/* Left Text */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                            <span className="inline-flex items-center gap-2 badge mb-6 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                                <Sparkles size={14} className="animate-pulse" /> AI-Powered Mentorship
                            </span>
                            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1]" style={{ color: 'rgb(var(--text-primary))' }}>
                                Master your growth.<br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400">
                                    Guided by AI.
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl mb-10 text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                                Transform traditional mentoring logs into an intelligent, real-time kinetic experience. Deep analytics, emotion tracking, and proactive risk detection.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Link to="/register" className="btn btn-primary text-base px-8 py-3.5 shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all">
                                    Start for Free <ArrowRight size={18} className="ml-2" />
                                </Link>
                                <Link to="/login" className="btn btn-secondary text-base px-8 py-3.5 glass-card hover:bg-white/5 border border-white/10">
                                    Sign In
                                </Link>
                            </div>
                        </motion.div>
                        
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} className="mt-12 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Real-time tracking</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-400" /> AI Sentiment Analysis</span>
                        </motion.div>
                    </div>

                    {/* Right Interactive Demo Area */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, rotateX: 10 }} 
                        animate={{ opacity: 1, scale: 1, rotateX: 0 }} 
                        transition={{ duration: 1, type: "spring" }}
                        className="flex-1 w-full max-w-lg relative perspective-1000"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl rounded-[3rem] -z-10" />
                        <div className="glass-card rounded-3xl border border-white/10 shadow-2xl p-6 bg-slate-900/60 backdrop-blur-2xl relative overflow-hidden">
                            {/* Window Header */}
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <div className="mx-auto flex items-center gap-2 text-xs font-medium text-slate-400">
                                    <Brain size={14} className="text-purple-400" /> Mentor AI Demo
                                </div>
                            </div>

                            {/* Chat interaction mock */}
                            <div className="space-y-4 h-64 overflow-hidden relative">
                                <AnimatePresence mode="popLayout">
                                    {chatStep >= 0 && (
                                        <motion.div key="msg1" variants={chatVariants} initial="hidden" animate="visible" className="flex justify-end">
                                            <div className="bg-purple-600/20 border border-purple-500/30 text-slate-200 px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
                                                I felt really overwhelmed during the algorithm design workshop today.
                                            </div>
                                        </motion.div>
                                    )}
                                    {chatStep >= 1 && (
                                        <motion.div key="msg2" variants={chatVariants} initial="hidden" animate="visible" className="flex justify-start">
                                            <div className="bg-slate-800/80 border border-white/5 text-slate-300 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm max-w-[85%] flex items-start gap-3">
                                                <Brain size={16} className="text-purple-400 mt-1 shrink-0" />
                                                <div>
                                                    <span className="text-xs text-purple-400 font-medium mb-1 block">Analysis Complete</span>
                                                    Detected High Stress levels. Generating resource links and notifying your mentor for a check-in.
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    {chatStep >= 2 && (
                                        <motion.div key="msg3" variants={chatVariants} initial="hidden" animate="visible" className="flex justify-start">
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-2xl rounded-tl-sm text-xs max-w-[85%] flex items-center gap-2">
                                                <TrendingUp size={14} /> Action plan suggested to mentor.
                                            </div>
                                        </motion.div>
                                    )}
                                    {chatStep === 3 && (
                                        <motion.div key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end pt-2">
                                            <div className="bg-purple-600/20 border border-purple-500/30 px-4 py-3 rounded-2xl rounded-tr-sm flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* FEATURES */}
            <section className="relative max-w-6xl mx-auto px-6 py-24 z-20">
                <div className="text-center mb-16">
                    <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-5xl font-bold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>
                        Everything you need, <span className="gradient-text">supercharged</span>
                    </motion.h2>
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-100px" }} className="text-lg text-slate-400">Deep insights. Real-time actions. Beautiful interfaces.</motion.p>
                </div>
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {features.map((f, i) => {
                        const c = colorIcon[f.color]
                        return (
                            <motion.div
                                key={i}
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                                }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="glass-card p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-lg"
                                    style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
                                    <f.icon size={24} style={{ color: c.color }} />
                                </div>
                                <h3 className="font-bold text-xl mb-3 text-slate-100">{f.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
                            </motion.div>
                        )
                    })}
                </motion.div>
            </section>

            {/* ROLE CARDS & FOOTER */}
            <section className="relative z-20 bg-black/20 pb-20 pt-10">
                <div className="max-w-6xl mx-auto px-6 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-100">Unlock your potential today</h2>
                    </div>
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                            visible: { transition: { staggerChildren: 0.15 } }
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8"
                    >
                        {roleCards.map((r, i) => (
                            <motion.div
                                key={i}
                                variants={{
                                    hidden: { opacity: 0, scale: 0.95 },
                                    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
                                }}
                                whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                                className="glass-card p-8 rounded-[2rem] flex flex-col items-center text-center overflow-hidden relative group"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${r.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                                <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${r.color} shadow-xl flex items-center justify-center mb-6 transform group-hover:rotate-12 transition-transform duration-300`}>
                                    <r.icon size={32} color="white" />
                                </div>
                                <h3 className="font-bold text-2xl mb-3 text-slate-100">{r.label}</h3>
                                <p className="text-slate-400 mb-8 leading-relaxed">{r.desc}</p>
                                <Link to={r.to} className={`btn btn-primary w-full py-4 text-sm uppercase tracking-wider font-bold bg-gradient-to-r ${r.color}`}>
                                    Join as {r.role} <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* FOOTER */}
                <footer className="max-w-6xl mx-auto px-6 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 opacity-50">
                            <GraduationCap size={16} />
                            <span className="font-semibold text-sm tracking-tight text-white">MentorDiaries</span>
                        </div>
                        <p className="text-center md:text-right text-xs text-slate-500">
                            © 2025 MentorDiaries · Developed for the future of education.
                        </p>
                    </div>
                </footer>
            </section>
        </div>
    )
}
