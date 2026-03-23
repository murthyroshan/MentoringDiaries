import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '../store/uiStore'
import api from '../services/api'
import MeshBackground from '../components/ui/MeshBackground'
import AuthCard3D from '../components/ui/AuthCard3D'
import MagneticButton from '../components/ui/MagneticButton'
import { SPRING_PHYSICS } from '../constants/animations'

const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password too short'),
})

export default function LoginPage() {
    const [showPw, setShowPw] = useState(false)
    const { login } = useAuthStore()
    const { addToast } = useUIStore()
    const navigate = useNavigate()

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    })

    const onSubmit = async (data) => {
        try {
            const res = await api.post('/auth/login', data)
            login(res.data.user)
            addToast(`Welcome back, ${res.data.user.name}!`, 'success')
            const redirects = { student: '/student/dashboard', mentor: '/mentor/dashboard', admin: '/admin/dashboard' }
            navigate(redirects[res.data.user.role] || '/student/dashboard')
        } catch (err) {
            addToast(err.response?.data?.message || 'Login failed', 'error')
        }
    }

    // Kinetic Typography Stagger Logic
    const headingText = "Welcome back";
    const letterVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: SPRING_PHYSICS }
    };
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative px-4 text-white overflow-hidden">
            <MeshBackground />
            
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ...SPRING_PHYSICS }}
                className="w-full max-w-md z-10"
            >
                {/* Logo and Typography */}
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
                        Sign in to your MentorDiaries account
                    </motion.p>
                </div>

                <AuthCard3D>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="form-label">Email Address</label>
                            <input {...register('email')} type="email" className="form-input" placeholder="you@college.edu" />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <div className="relative">
                                <input {...register('password')} type={showPw ? 'text' : 'password'} className="form-input pr-10" placeholder="••••••••" />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1 rounded">
                                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                        </div>
                        <MagneticButton type="submit" className="btn btn-primary w-full py-3" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
                        </MagneticButton>
                    </form>
                    <p className="text-center text-sm mt-6" style={{ color: 'rgb(var(--text-muted))' }}>
                        No account? <Link to="/register" className="font-semibold" style={{ color: 'rgb(139,92,246)' }}>Register</Link>
                    </p>
                </AuthCard3D>
                <p className="text-center text-xs mt-6 relative z-20" style={{ color: 'rgb(var(--text-muted))' }}>
                    <Link to="/" className="hover:text-purple-400 transition-colors">← Back to home</Link>
                </p>
            </motion.div>
        </div>
    )
}
