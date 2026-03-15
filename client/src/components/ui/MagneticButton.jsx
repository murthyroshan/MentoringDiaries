import { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function MagneticButton({ children, className = "", ...props }) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const { clientX, clientY } = e;

    // Check if cursor is within 50px of the center
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    
    // Magnetic pull (shift slightly towards cursor)
    setPosition({ x: x * 0.1, y: y * 0.1 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative overflow-hidden group ${className}`}
      {...props}
    >
      {/* Shine streak animation element */}
      <span className="absolute inset-0 block w-full h-full pointer-events-none rounded-[inherit]">
        <span className="absolute top-0 left-[-100%] w-1/2 h-full block bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine" />
      </span>
      {children}
    </motion.button>
  );
}
