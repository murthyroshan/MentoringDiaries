import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Eye, EyeOff, Loader2, BookOpen, Users, Info } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import api from '../services/api'
import MeshBackground from '../components/ui/MeshBackground'
import AuthCard3D from '../components/ui/AuthCard3D'
import MagneticButton from '../components/ui/MagneticButton'
import { SPRING_PHYSICS } from '../constants/animations'

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    role: z.enum(['student', 'mentor']),
    department: z.string().optional(),
    batch: z.string().optional(),
    rollNumber: z.string().optional(),
    year: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.role === 'student') {
        // Enforce institutional email
        if (!data.email.toLowerCase().endsWith('@gcet.edu.in')) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'Students must use an @gcet.edu.in email address' })
        }
        // Enforce roll number format: 2 digits followed by at least 4 alphanumeric chars
        if (!data.rollNumber || !/^\d{2}[a-zA-Z0-9]{4,}$/.test(data.rollNumber)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rollNumber'], message: 'Roll number must start with 2 digits (year) followed by alphanumeric characters (min 6 chars total)' })
        }
        // Year is required for students
        if (!data.year) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['year'], message: 'Year of study is required' })
        }
    }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const YEAR_SEMESTER_MAP = {
    '1': 'Semester 1 or 2',
    '2': 'Semester 3 or 4',
    '3': 'Semester 5 or 6',
    '4': 'Semester 7 or 8',
}

const roles = [
    { value: 'student', label: 'Student', desc: 'Submit weekly diary entries', icon: BookOpen, color: 'from-violet-500 to-indigo-500' },
    { value: 'mentor', label: 'Mentor', desc: 'Review and support students', icon: Users, color: 'from-indigo-500 to-blue-500' },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
    const [showPw, setShowPw] = useState(false)
    const [serverErrors, setServerErrors] = useState([]) // structured backend validation errors
    const { login } = useAuthStore()
    const { addToast } = useUIStore()
    const navigate = useNavigate()

    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
        defaultValues: { role: 'student' },
    })

    const selectedRole = watch('role')
    const selectedYear = watch('year')

    const onSubmit = async (data) => {
        setServerErrors([])
        try {
            const payload = { ...data }
            // Auto-calculate semester from year so backend also gets it
            if (data.year) {
                payload.year = Number(data.year)
            }
            const res = await api.post('/auth/register', payload)
            login(res.data.user)
            addToast(`Account created! Welcome, ${res.data.user.name}!`, 'success')
            const redirects = { student: '/student/dashboard', mentor: '/mentor/dashboard', admin: '/admin/dashboard' }
            navigate(redirects[res.data.user.role] || '/student/dashboard')
        } catch (err) {
            const details = err.response?.data?.details
            if (Array.isArray(details) && details.length > 0) {
                setServerErrors(details)
            } else {
                addToast(err.response?.data?.message || 'Registration failed', 'error')
            }
        }
    }

    // Helper: find server error for a field
    const serverError = (field) => serverErrors.find(e => e.field === field)?.message

    // Kinetic Typography Stagger Logic
    const headingText = "Create your account";
    const letterVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: SPRING_PHYSICS }
    };
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden text-white"
            style={{ background: 'rgb(var(--bg-primary))' }}>
            <MeshBackground />
            
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ...SPRING_PHYSICS }} className="w-full max-w-md z-10">
                <div className="text-center mb-8 relative z-20">
                    <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...SPRING_PHYSICS, delay: 0.2 }}
                        className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_15px_rgba(139,92,246,0.5)] flex items-center justify-center mx-auto mb-4"
                    >
                        <GraduationCap size={28} className="text-purple-400" />
                    </motion.div>
                    
                    <motion.h1 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="text-3xl font-bold flex justify-center space-x-[2px]" 
                        style={{ color: 'rgb(var(--text-primary))' }}
                    >
                        {headingText.split('').map((char, index) => (
                            <motion.span key={index} variants={letterVariants}>
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        ))}
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-sm mt-2" 
                        style={{ color: 'rgb(var(--text-muted))' }}
                    >
                        Join MentorDiaries today
                    </motion.p>
                </div>

                <AuthCard3D>
                    {/* Server validation errors (structured) */}
                    {serverErrors.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-5 p-3 rounded-xl text-sm space-y-1 bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                            {serverErrors.map((e, i) => (
                                <p key={i} className="text-red-400">
                                    <span className="font-semibold capitalize">{e.field}:</span> {e.message}
                                </p>
                            ))}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Role Selector */}
                        <div>
                            <label className="form-label text-white/90">I am a...</label>
                            <div className="grid grid-cols-2 gap-2">
                                {roles.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => { setValue('role', r.value); setServerErrors([]) }}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200"
                                        style={{
                                            borderColor: selectedRole === r.value ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.1)',
                                            background: selectedRole === r.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center shadow-lg`}>
                                            <r.icon size={14} color="white" />
                                        </div>
                                        <span className="text-xs font-semibold text-white/90">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="form-label text-white/90">Full Name</label>
                            <input {...register('name')} className="form-input bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10" placeholder="Your full name" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="form-label text-white/90">Email Address</label>
                            <input {...register('email')} type="email" className="form-input bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10"
                                placeholder={selectedRole === 'student' ? 'username@gcet.edu.in' : 'you@email.com'} />
                            {(errors.email || serverError('email')) && (
                                <p className="text-xs text-red-500 mt-1">{errors.email?.message || serverError('email')}</p>
                            )}
                            {selectedRole === 'student' && (
                                <p className="text-xs mt-1 flex items-center gap-1 text-white/50">
                                    <Info size={11} /> Must end with @gcet.edu.in
                                </p>
                            )}
                        </div>

                        {/* Student-only fields */}
                        {selectedRole === 'student' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label text-white/90">Department</label>
                                        <input {...register('department')} className="form-input bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10" placeholder="e.g. CSE" />
                                    </div>
                                    <div>
                                        <label className="form-label text-white/90">Batch</label>
                                        <input {...register('batch')} className="form-input bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10" placeholder="e.g. 2022-26" />
                                    </div>
                                </div>

                                {/* Year of Study */}
                                <div>
                                    <label className="form-label text-white/90">Year of Study</label>
                                    <select {...register('year')} className="form-input bg-white/5 border-white/10 text-white focus:border-purple-400 focus:bg-white/10 [&>option]:text-black">
                                        <option value="">Select year...</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                    </select>
                                    {errors.year && <p className="text-xs text-red-500 mt-1">{errors.year.message}</p>}
                                    {selectedYear && (
                                        <p className="text-xs mt-1 flex items-center gap-1 text-purple-300">
                                            <Info size={11} /> Auto-assigned to: <strong>{YEAR_SEMESTER_MAP[selectedYear]}</strong>
                                        </p>
                                    )}
                                </div>

                                {/* Roll Number */}
                                <div>
                                    <label className="form-label text-white/90">Roll Number</label>
                                    <input {...register('rollNumber')} className="form-input bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10"
                                        placeholder="e.g. 22CS001" />
                                    {(errors.rollNumber || serverError('rollNumber')) && (
                                        <p className="text-xs text-red-500 mt-1">{errors.rollNumber?.message || serverError('rollNumber')}</p>
                                    )}
                                    <p className="text-xs mt-1 text-white/50">
                                        Format: 2-digit year + alphanumeric (e.g. 22CS001)
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        <div>
                            <label className="form-label text-white/90">Password</label>
                            <div className="relative">
                                <input {...register('password')} type={showPw ? 'text' : 'password'} className="form-input pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-400 focus:bg-white/10"
                                    placeholder="Min. 8 chars, 1 uppercase, 1 number" />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1 rounded text-white/60 hover:text-white">
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                        </div>

                        <MagneticButton type="submit" className="btn btn-primary w-full py-3" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
                        </MagneticButton>

                        {/* Google OAuth placeholder */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-2 bg-transparent text-white/50 backdrop-blur-md">or</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled
                            title="Google OAuth — Coming Soon"
                            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/10 text-sm font-medium cursor-not-allowed opacity-40 transition-opacity text-white/70 bg-white/5">
                            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M46.5 24.6c0-1.6-.1-3.2-.4-4.6H24v8.7h12.7c-.5 2.8-2.2 5.2-4.7 6.8v5.6h7.5c4.4-4 6.9-10 6.9-16.5z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.4 0-11.9-4.3-13.8-10.2H2.4v6c3.9 7.7 11.9 13.5 21.6 13.5z" /><path fill="#FBBC05" d="M10.2 28.5c-.5-1.5-.8-3.1-.8-4.5s.3-3 .8-4.5v-6H2.4C.8 16.8 0 20.3 0 24s.8 7.2 2.4 10l7.8-5.5z" /><path fill="#EA4335" d="M24 9.5c3.6 0 6.7 1.2 9.2 3.6l6.8-6.8C35.9 2.3 30.5 0 24 0 14.3 0 6.3 5.7 2.4 14l7.8 5.5C12.1 13.8 17.6 9.5 24 9.5z" /></svg>
                            Continue with Google <span className="text-xs opacity-60">(Coming Soon)</span>
                        </button>
                    </form>
                    <p className="text-center text-sm mt-6 text-white/70">
                        Have an account? <Link to="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">Sign in</Link>
                    </p>
                </AuthCard3D>
            </motion.div>
        </div>
    )
}
