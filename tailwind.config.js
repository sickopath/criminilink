/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0a0e1a',
        panel: '#111827',
        line: '#1f2937',
        cyan: '#00d4ff',
        violet: '#7c3aed',
        danger: '#ef4444',
        success: '#10b981',
      },
      fontFamily: {
        heading: ['Rajdhani', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        cyan: '0 0 28px rgba(0, 212, 255, 0.26)',
        panel: '0 18px 60px rgba(0,0,0,0.35)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1.12)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        slideIn: 'slideIn 180ms ease-out',
      },
    },
  },
  plugins: [],
};
