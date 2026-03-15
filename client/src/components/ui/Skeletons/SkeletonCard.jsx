import { motion } from "framer-motion";

export const GhostWrapper = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.5, delay: delay * 0.05, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export function SkeletonCard({ delay = 0 }) {
  return (
    <GhostWrapper delay={delay}>
      <div className="glass-card p-6 w-full relative overflow-hidden h-32 flex flex-col justify-between">
        <div className="skeleton h-4 w-1/3 rounded-full mb-4"></div>
        <div className="skeleton h-8 w-1/2 rounded-full mb-2"></div>
        <div className="skeleton h-3 w-1/4 rounded-full"></div>
      </div>
    </GhostWrapper>
  );
}
