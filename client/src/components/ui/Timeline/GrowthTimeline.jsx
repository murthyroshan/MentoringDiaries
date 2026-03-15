import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { SPRING_PHYSICS } from '../../../constants/animations';
import { ChevronDown, Calendar } from 'lucide-react';

const GrowthTimeline = React.memo(function GrowthTimeline({ items = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const containerRef = useRef(null);

  // SVG Drawing Scroll Logic
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  if (!items || items.length === 0) {
    return <div className="text-[rgb(var(--text-muted))]">No timeline data available.</div>;
  }

  return (
    <div ref={containerRef} className="relative py-10 px-4 md:px-8 max-w-3xl mx-auto w-full">
      {/* Dynamic SVG Background Path */}
      <div className="absolute left-[39px] md:left-[50px] top-0 bottom-0 w-1 pointer-events-none z-0">
        <svg viewBox="0 0 4 1000" preserveAspectRatio="none" className="w-full h-full">
          <motion.line
            x1="2"
            y1="0"
            x2="2"
            y2="1000"
            stroke="rgba(139, 92, 246, 0.2)"
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
          />
          <motion.line
            x1="2"
            y1="0"
            x2="2"
            y2="1000"
            stroke="url(#gradientUrl)"
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
            style={{ pathLength }}
          />
          <defs>
            <linearGradient id="gradientUrl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" />
              <stop offset="100%" stopColor="rgb(236, 72, 153)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="space-y-8 relative z-10 w-full">
        <AnimatePresence>
          {items.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const isActive = item.active || isExpanded;

            return (
              <motion.div
                layout
                key={item.id}
                className="relative flex items-start gap-6 group"
              >
                {/* Timeline node */}
                <motion.div
                  layout
                  className="flex-shrink-0 mt-1 relative z-20"
                  whileHover={{ scale: 1.3 }}
                  transition={SPRING_PHYSICS}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-4 transition-colors duration-300 flex items-center justify-center
                    ${isActive ? 'bg-purple-500 border-purple-200 neon-glow-active' : 'bg-[rgb(var(--bg-secondary))] border-[rgb(var(--border-color))]'}`}
                  >
                    {isActive && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  </div>
                </motion.div>

                {/* Content Card container with layoutId for orchestration */}
                <motion.div
                  layoutId={`card-${item.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className={`flex-grow glass-card p-5 cursor-pointer transition-all duration-300 overflow-hidden
                    ${isExpanded ? 'ring-2 ring-purple-500/50 shadow-[0_8px_30px_rgba(139,92,246,0.15)] bg-white/50 dark:bg-slate-900/80 backdrop-blur-xl' : 'hover:bg-[rgb(var(--bg-secondary))]'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div layout className="flex justify-between items-start">
                    <div>
                      <motion.h3 layout className="text-lg font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                        {item.title}
                      </motion.h3>
                      <motion.div layout className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                        <Calendar size={14} />
                        <span>{item.date}</span>
                      </motion.div>
                    </div>
                    <motion.div
                      layout
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={SPRING_PHYSICS}
                    >
                      <ChevronDown className="text-[rgb(var(--text-muted))]" size={20} />
                    </motion.div>
                  </motion.div>

                  {/* Mask Content Reveal via clip-path animation */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, clipPath: 'inset(100% 0 0 0)' }}
                        animate={{ opacity: 1, height: 'auto', clipPath: 'inset(0 0 0 0)' }}
                        exit={{ opacity: 0, height: 0, clipPath: 'inset(100% 0 0 0)' }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <motion.div layout className="pt-4 mt-4 border-t" style={{ borderColor: 'rgb(var(--border-color))' }}>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                            {item.description || "No detailed content provided for this entry."}
                          </p>
                          {item.metrics && (
                            <div className="flex gap-4 mt-4">
                              {Object.entries(item.metrics).map(([key, value]) => (
                                <div key={key} className="px-3 py-1.5 rounded-lg bg-[rgb(var(--bg-secondary))] text-xs font-semibold">
                                  <span className="text-[rgb(var(--text-muted))] capitalize mr-2">{key}:</span>
                                  {value}
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default GrowthTimeline;
