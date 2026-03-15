import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const GrowthRadarChart = React.memo(function GrowthRadarChart({ 
  labels = [], 
  datasets = [], 
  options = {} 
}) {
  const [pulseScale, setPulseScale] = useState(1);

  // Biometric radar chart configuration
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart', // Smooth morphing
    },
    scales: {
      r: {
        angleLines: {
          color: 'rgba(139, 92, 246, 0.15)',
        },
        grid: {
          color: 'rgba(139, 92, 246, 0.15)',
          circular: true, // Radar style
        },
        pointLabels: {
          color: 'rgba(148, 163, 184, 0.9)',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        },
        ticks: {
          display: false, // hide internal numbers for cleaner biometric look
          backdropColor: 'transparent',
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgb(148, 163, 184)',
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        intersect: false,
        usePointStyle: true,
        // Glassmorphism feel
        callbacks: {
          label: function(context) {
            return ` ${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    ...options
  };

  return (
    <motion.div
      className="relative w-full h-full glass-card p-4 rounded-3xl"
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="absolute inset-0 rounded-3xl pointer-events-none border border-purple-500/20 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]" />
      <Radar data={{ labels, datasets }} options={defaultOptions} />
    </motion.div>
  );
});

export default GrowthRadarChart;
