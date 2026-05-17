import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/editor/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/app-dom/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius-sm)',
        md: 'calc(var(--radius-sm) - 2px)',
        sm: 'calc(var(--radius-sm) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
