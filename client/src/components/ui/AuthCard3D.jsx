import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function AuthCard3D({ children, className = "" }) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for tracking cursor position relative to center of the card
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Apply spring physics for smooth return and movement
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  // Transform coordinates to rotation values (max tilt 10 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    
    // Normalize coordinates to a range of -0.5 to 0.5
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Dynamic shadow based on tilt
  const shadowX = useTransform(mouseXSpring, [-0.5, 0.5], [-20, 20]);
  const shadowY = useTransform(mouseYSpring, [-0.5, 0.5], [-20, 20]);
  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([xVal, yVal]) => `
      ${xVal}px ${yVal}px 40px rgba(0,0,0,0.1),
      0 4px 24px rgba(0,0,0,0.06),
      0 1px 4px rgba(0,0,0,0.04)
    `
  );

  return (
    <div className="perspective-1000 w-full" style={{ perspective: "1000px" }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          boxShadow: isHovered ? boxShadow : "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          transformStyle: "preserve-3d"
        }}
        className={`glass-card p-8 relative rounded-2xl ${className}`}
      >
        {/* Adds an interactive highlight overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(
              circle at ${useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%'])} ${useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%'])},
              rgba(255,255,255,0.1) 0%,
              transparent 60%
            )`,
            opacity: isHovered ? 1 : 0,
          }}
        />
        {/* Child content, slightly popped out */}
        <div style={{ transform: "translateZ(30px)" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
