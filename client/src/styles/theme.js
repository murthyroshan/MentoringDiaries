/**
 * Design-system tokens — single source of truth for JS contexts.
 *
 * Use these in:
 *   - Chart.js dataset colours / grid config
 *   - Framer-motion variants (color, boxShadow, etc.)
 *   - Conditional inline styles
 *   - Any non-CSS place that needs a design value
 *
 * Tailwind utility classes are generated from the matching `@theme {}` block
 * in globals.css — you do NOT need to import this file to use `bg-primary-600`.
 */

// ── Colour Palette ────────────────────────────────────────────────────────────

/** Primary brand: Deep Indigo. Base = #4F46E5 (primary-600). */
export const primary = {
  50:  '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1',
  600: '#4F46E5', // ← base
  700: '#4338CA',
  800: '#3730A3',
  900: '#312E81',
  950: '#1E1B4B',
};

/** Accent: Warm Amber. Base = #F59E0B (accent-500). */
export const accent = {
  50:  '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B', // ← base
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
  950: '#451A03',
};

/** Neutral: Warm Stone (not cool gray). */
export const neutral = {
  50:  '#FAFAF9', // surface / warm white
  100: '#F5F5F4',
  200: '#E7E5E4',
  300: '#D6D3D1',
  400: '#A8A29E',
  500: '#78716C',
  600: '#57534E',
  700: '#44403C',
  800: '#292524',
  900: '#1C1917',
  950: '#0C0A09',
};

/** Success: Emerald. */
export const success = {
  50:  '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981', // ← base
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
  950: '#022C22',
};

/** Warning: Amber (alias of accent). */
export const warning = accent;

/** Danger: Rose. */
export const danger = {
  50:  '#FFF1F2',
  100: '#FFE4E6',
  200: '#FECDD3',
  300: '#FDA4AF',
  400: '#FB7185',
  500: '#F43F5E', // ← base
  600: '#E11D48',
  700: '#BE123C',
  800: '#9F1239',
  900: '#881337',
  950: '#4C0519',
};

/** Flat colour map — handy for chart datasets and conditional logic. */
export const colors = { primary, accent, neutral, success, warning, danger };

/** Surface tokens. */
export const surface = {
  background: neutral[50],  // #FAFAF9 — warm white page background
  card:       '#FFFFFF',    // pure white card surface
  overlay:    'rgba(0,0,0,0.45)',
};

// ── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  fonts: {
    sans:    "'Inter', system-ui, -apple-system, sans-serif",
    display: "'Sora', 'Inter', system-ui, sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  },

  /** px sizes mapped to rem — matches Tailwind's default type scale exactly. */
  sizes: {
    xs:   { px: 12, rem: '0.75rem',   lineHeight: '1rem'    },
    sm:   { px: 14, rem: '0.875rem',  lineHeight: '1.25rem' },
    base: { px: 16, rem: '1rem',      lineHeight: '1.5rem'  },
    lg:   { px: 18, rem: '1.125rem',  lineHeight: '1.75rem' },
    xl:   { px: 20, rem: '1.25rem',   lineHeight: '1.75rem' },
    '2xl':{ px: 24, rem: '1.5rem',    lineHeight: '2rem'    },
    '3xl':{ px: 30, rem: '1.875rem',  lineHeight: '2.25rem' },
    '4xl':{ px: 36, rem: '2.25rem',   lineHeight: '2.5rem'  },
    '5xl':{ px: 48, rem: '3rem',      lineHeight: '1'       },
    '6xl':{ px: 60, rem: '3.75rem',   lineHeight: '1'       },
  },

  weights: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
};

// ── Spacing (4 px base unit) ──────────────────────────────────────────────────

/** Maps Tailwind spacing scale to pixel values for JS use. */
export const spacing = {
  0:  '0px',
  px: '1px',
  0.5:'2px',
  1:  '4px',   // base unit
  1.5:'6px',
  2:  '8px',
  2.5:'10px',
  3:  '12px',
  3.5:'14px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  9:  '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
};

// ── Border Radius ─────────────────────────────────────────────────────────────

export const radius = {
  none: '0px',
  sm:   '6px',
  md:   '10px',
  lg:   '16px',
  xl:   '24px',
  '2xl':'32px',
  full: '9999px',
};

// ── Shadows (soft layered — no hard drop shadows) ─────────────────────────────

export const shadows = {
  xs:   '0 1px 2px rgba(0,0,0,0.05)',
  sm:   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md:   '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
  lg:   '0 8px 28px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
  xl:   '0 16px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
  '2xl':'0 24px 64px rgba(0,0,0,0.12), 0 12px 24px rgba(0,0,0,0.07)',
  // Coloured glows
  glowPrimary: '0 4px 20px rgba(79,70,229,0.35)',
  glowAccent:  '0 4px 20px rgba(245,158,11,0.35)',
  glowDanger:  '0 4px 20px rgba(244,63,94,0.35)',
  glowSuccess: '0 4px 20px rgba(16,185,129,0.35)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.06)',
};

// ── Transitions ───────────────────────────────────────────────────────────────

export const transitions = {
  fast:   '150ms ease',
  base:   '250ms ease',
  slow:   '400ms ease',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ── Component Tokens ──────────────────────────────────────────────────────────

/** Button variant style objects — use as spread in inline-style or motion props. */
export const button = {
  primary: {
    background: `linear-gradient(135deg, ${primary[600]}, ${primary[700]})`,
    color:      '#ffffff',
    boxShadow:  shadows.glowPrimary,
    borderRadius: radius.md,
  },
  secondary: {
    background: neutral[100],
    color:      neutral[800],
    border:     `1px solid ${neutral[200]}`,
    boxShadow:  shadows.sm,
    borderRadius: radius.md,
  },
  ghost: {
    background: 'transparent',
    color:      neutral[600],
    border:     '1px solid transparent',
    borderRadius: radius.md,
  },
  danger: {
    background: `rgba(244,63,94,0.08)`,
    color:      danger[600],
    border:     `1px solid rgba(244,63,94,0.25)`,
    borderRadius: radius.md,
  },
  accent: {
    background: `linear-gradient(135deg, ${accent[500]}, ${accent[600]})`,
    color:      '#ffffff',
    boxShadow:  shadows.glowAccent,
    borderRadius: radius.md,
  },
};

/** Input state style objects. */
export const input = {
  default: {
    background:   neutral[100],
    border:       `1px solid ${neutral[200]}`,
    color:        neutral[900],
    borderRadius: radius.md,
  },
  focus: {
    background:   '#ffffff',
    border:       `1px solid ${primary[600]}`,
    boxShadow:    `0 0 0 3px rgba(79,70,229,0.15)`,
    color:        neutral[900],
  },
  error: {
    background:   danger[50],
    border:       `1px solid ${danger[400]}`,
    boxShadow:    `0 0 0 3px rgba(244,63,94,0.12)`,
    color:        neutral[900],
  },
  disabled: {
    background:   neutral[100],
    border:       `1px solid ${neutral[200]}`,
    color:        neutral[400],
    cursor:       'not-allowed',
    opacity:      0.65,
  },
};

/** Card style objects. */
export const card = {
  flat: {
    background:   '#ffffff',
    border:       'none',
    boxShadow:    'none',
    borderRadius: radius.lg,
  },
  elevated: {
    background:   '#ffffff',
    boxShadow:    shadows.md,
    borderRadius: radius.lg,
  },
  bordered: {
    background:   '#ffffff',
    border:       `1px solid ${neutral[200]}`,
    boxShadow:    shadows.sm,
    borderRadius: radius.lg,
  },
};

// ── Framer-motion Presets ─────────────────────────────────────────────────────

/** Ready-made framer-motion `variants` objects. */
export const motion = {
  fadeUp: {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.07 } },
  },
};

// ── Chart.js Defaults ─────────────────────────────────────────────────────────

/** Palette for Chart.js datasets — ordered by visual priority. */
export const chartPalette = [
  primary[600],   // indigo
  accent[500],    // amber
  success[500],   // emerald
  danger[500],    // rose
  primary[400],   // indigo light
  accent[300],    // amber light
  neutral[400],   // stone mid
  primary[800],   // indigo dark
];

export const chartDefaults = {
  gridColor:   `rgba(${parseInt(neutral[200].slice(1,3),16)},${parseInt(neutral[200].slice(3,5),16)},${parseInt(neutral[200].slice(5,7),16)},0.6)`,
  tickColor:   neutral[400],
  legendColor: neutral[600],
  tooltipBg:   neutral[900],
  tooltipText: '#ffffff',
};

// ── Default export (convenience) ─────────────────────────────────────────────

const theme = {
  colors,
  surface,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
  button,
  input,
  card,
  motion,
  chartPalette,
  chartDefaults,
};

export default theme;
