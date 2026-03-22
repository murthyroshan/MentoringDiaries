import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

export default function CustomCursor() {
  const prefersReduced = useReducedMotion();

  const dotX   = useMotionValue(-200);
  const dotY   = useMotionValue(-200);
  const ringX  = useMotionValue(-200);
  const ringY  = useMotionValue(-200);

  const springCfg = { stiffness: 150, damping: 15, mass: 0.5 };
  const sRingX = useSpring(ringX, springCfg);
  const sRingY = useSpring(ringY, springCfg);

  const [state, setState] = useState('default'); // default | hover | button | text
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(any-hover: hover)');
    if (!mq.matches || prefersReduced) return;

    const move = (e) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      ringX.set(e.clientX);
      ringY.set(e.clientY);

      // Determine cursor state from data-cursor attribute or element type
      let el = e.target;
      let found = 'default';
      while (el && el !== document.body) {
        const dc = el.getAttribute?.('data-cursor');
        if (dc) { found = dc; break; }
        const tag = el.tagName?.toLowerCase();
        if (tag === 'button' || tag === 'a') { found = 'button'; break; }
        if (tag === 'input' || tag === 'textarea') { found = 'text'; break; }
        const cs = window.getComputedStyle(el).cursor;
        if (cs === 'pointer') { found = 'hover'; break; }
        el = el.parentElement;
      }
      setState(found);
    };

    const click = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 350);
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('click',     click);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('click',     click);
    };
  }, [dotX, dotY, ringX, ringY, prefersReduced]);

  // Don't render on touch devices or if reduced motion
  if (prefersReduced) return null;
  if (typeof window !== 'undefined' && !window.matchMedia('(any-hover: hover)').matches) return null;

  // State-driven ring styles
  const ringSize    = clicked ? 120 : state === 'button' ? 80 : state === 'hover' ? 60 : 36;
  const ringOpacity = state === 'button' ? 0.2 : state === 'hover' ? 0.1 : 0;
  const ringBorder  = state === 'text'   ? '1.5px solid rgba(232,184,75,0.5)' : '1.5px solid rgba(232,184,75,0.45)';
  const ringW       = state === 'text'   ? 2    : ringSize;
  const ringH       = state === 'text'   ? 24   : ringSize;
  const dotVisible  = state !== 'hover' && state !== 'button';

  return (
    <>
      {/* Ring */}
      <motion.div
        className="hidden md:block"
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          x:             sRingX,
          y:             sRingY,
          translateX:    `-50%`,
          translateY:    `-50%`,
          width:         ringW,
          height:        ringH,
          borderRadius:  state === 'text' ? '2px' : '50%',
          border:        ringBorder,
          background:    state === 'button' ? `rgba(232,184,75,${ringOpacity})` : 'transparent',
          pointerEvents: 'none',
          zIndex:        9998,
          mixBlendMode:  state === 'hover' ? 'difference' : 'normal',
        }}
        animate={{
          width:        ringW,
          height:       ringH,
          borderRadius: state === 'text' ? '2px' : '50%',
          scale:        clicked ? [1, 3.3, 1] : 1,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, duration: clicked ? 0.3 : undefined }}
      />

      {/* Dot */}
      {dotVisible && (
        <motion.div
          className="hidden md:block"
          style={{
            position:      'fixed',
            top:           0,
            left:          0,
            x:             dotX,
            y:             dotY,
            translateX:    '-50%',
            translateY:    '-50%',
            width:         8,
            height:        8,
            borderRadius:  '50%',
            background:    '#E8B84B',
            pointerEvents: 'none',
            zIndex:        9999,
          }}
          animate={{ scale: clicked ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        />
      )}
    </>
  );
}
