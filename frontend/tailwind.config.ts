import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'pulse-subtle': 'pulse-subtle 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
