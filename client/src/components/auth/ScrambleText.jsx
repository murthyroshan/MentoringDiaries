import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

const CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHabcdefgh'

/**
 * Renders text with a left-to-right scramble effect.
 * Props:
 *  text     – final string to display
 *  trigger  – flip this to re-run the animation (bool, default true)
 *  delay    – ms before animation starts (default 0)
 *  as       – element tag (default 'span')
 */
export default function ScrambleText({
  text,
  trigger = true,
  delay   = 0,
  as: Tag = 'span',
  className,
  style,
}) {
  const [displayed, setDisplayed] = useState(text)
  const reduced  = useReducedMotion()
  const runRef   = useRef(0)
  const timers   = useRef([])

  // Keep in sync with text prop changes without animation
  useEffect(() => { setDisplayed(text) }, [text])

  useEffect(() => {
    if (reduced || !trigger) return

    // Cancel any previous run
    timers.current.forEach(id => clearTimeout(id))
    timers.current = []
    const id = ++runRef.current

    const chars  = text.split('')
    const result = chars.slice()     // mutable working copy

    const root = setTimeout(() => {
      chars.forEach((targetChar, i) => {
        const charDelay   = i * 28   // 28ms stagger between chars
        const frameMs     = 38       // speed of each scramble frame
        const totalFrames = 6        // how many random frames per char

        const t = setTimeout(() => {
          if (runRef.current !== id) return
          let frame = 0

          const interval = setInterval(() => {
            if (runRef.current !== id) { clearInterval(interval); return }
            frame++
            result[i] = frame < totalFrames
              ? CHARS[Math.floor(Math.random() * CHARS.length)]
              : targetChar
            setDisplayed(result.join(''))
            if (frame >= totalFrames) clearInterval(interval)
          }, frameMs)

          timers.current.push(interval)
        }, charDelay)

        timers.current.push(t)
      })
    }, delay)

    timers.current.push(root)

    return () => {
      timers.current.forEach(id => clearTimeout(id))
      runRef.current++
      setDisplayed(text)
    }
  }, [trigger, text, delay]) // eslint-disable-line react-hooks/exhaustive-deps

  return <Tag className={className} style={style}>{displayed}</Tag>
}
