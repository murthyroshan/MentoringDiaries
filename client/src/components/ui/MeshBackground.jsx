import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Generates an animated mesh background
export default function MeshBackground() {
  const [mousePos, setMousePos] = useState({ x: "50%", y: "50%" });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Smooth movement tracking
      setMousePos({
        x: `${(e.clientX / window.innerWidth) * 100}%`,
        y: `${(e.clientY / window.innerHeight) * 100}%`
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[rgb(var(--bg-primary))]">
      {/* Dynamic base gradient reacting to mouse */}
      <motion.div 
        className="absolute inset-0 opacity-40 transition-all duration-700 ease-out"
        animate={{
          background: `radial-gradient(circle at ${mousePos.x} ${mousePos.y}, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.1) 40%, transparent 60%)`
        }}
      />
      
      {/* Animated abstract orbs (CSS animation based) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[100px] animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/20 blur-[120px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[100px] animate-blob animation-delay-4000" />
      
      {/* Optional faint overlay mesh grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
    </div>
  );
}
