import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

const DURATION = 4000

export default function ErrorToast({ message, onDismiss }) {
  const [width,   setWidth]   = useState(100)
  const startRef  = useRef(null)
  const rafRef    = useRef(null)
  const reduced   = useReducedMotion()

  useEffect(() => {
    if (!message) return
    setWidth(100)
    startRef.current = performance.now()

    function tick(now) {
      const elapsed   = now - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setWidth(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onDismiss?.()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [message]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={reduced ? {} : { opacity: 0, x: 60, y: -10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={reduced ? {} : { opacity: 0, x: 60 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position:          'fixed',
            top:               '24px',
            right:             '24px',
            zIndex:            9999,
            background:        'rgba(11,11,17,0.95)',
            border:            '1px solid rgba(239,68,68,0.25)',
            backdropFilter:    'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius:      '20px',
            padding:           '16px 20px',
            minWidth:          '260px',
            maxWidth:          '360px',
            overflow:          'hidden',
            boxShadow:         '0 0 30px rgba(239,68,68,0.12), 0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Content row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#EF4444', flexShrink: 0, marginTop: '4px',
            }} />
            <p style={{ fontSize: '13px', color: 'rgba(242,240,232,0.8)', margin: 0, lineHeight: 1.5, flex: 1 }}>
              {message}
            </p>
            <button
              onClick={onDismiss}
              data-cursor="hover"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(242,240,232,0.3)', fontSize: '18px', lineHeight: 1,
                padding: '0 0 0 4px', flexShrink: 0, transition: 'color 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,240,232,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,240,232,0.3)'}
              aria-label="Dismiss"
            >×</button>
          </div>

          {/* Depleting progress bar */}
          <div style={{
            position:     'absolute',
            bottom:       0,
            left:         0,
            height:       '2px',
            background:   'rgba(239,68,68,0.5)',
            width:        `${width}%`,
            transition:   reduced ? 'none' : 'width 0.1s linear',
            borderRadius: '0 0 0 20px',
          }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
