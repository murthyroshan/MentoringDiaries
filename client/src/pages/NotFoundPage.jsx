import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(var(--bg-primary))' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
            >
                <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <AlertCircle size={40} className="text-white" />
                </div>
                <h1 className="text-6xl font-black mb-4 gradient-text">404</h1>
                <h2 className="text-2xl font-bold mb-3" style={{ color: 'rgb(var(--text-primary))' }}>Page Not Found</h2>
                <p className="text-base mb-8" style={{ color: 'rgb(var(--text-muted))' }}>
                    The page you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Link to="/" className="btn btn-primary px-8 py-3">
                    <Home size={18} /> Back to Home
                </Link>
            </motion.div>
        </div>
    )
}
