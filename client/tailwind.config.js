/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
          blue: '#3b82f6',
        },
        brand: {
          dark: '#0f172a',
          navy: '#1e293b',
          accent: '#dc2626',
          teal: '#0d9488'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
