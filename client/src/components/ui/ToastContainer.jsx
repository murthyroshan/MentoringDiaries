import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

const icons = {
    success: <CheckCircle size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />,
    info: <Info size={16} className="text-indigo-500" />,
}

const borders = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-indigo-500',
}

function Toast({ id, message, type = 'info' }) {
    const { removeToast } = useUIStore()

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [id, removeToast]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`relative glass-card flex items-center gap-3 px-4 py-3 min-w-[300px] max-w-sm overflow-hidden`}
        >
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${borders[type]}`} />
            {icons[type]}
            <p className="text-sm flex-1 font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{message}</p>
            <button onClick={() => removeToast(id)} className="btn-ghost p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={14} className="opacity-70" />
            </button>
            <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 opacity-50 ${borders[type].replace('border-l', 'bg')}`}
            />
        </motion.div>
    )
}

export default function ToastContainer() {
    const { toasts } = useUIStore()
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
                {toasts.map((t) => (
                    <Toast key={t.id} {...t} />
                ))}
            </AnimatePresence>
        </div>
    )
}
