/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          850: '#0f172a',
          900: '#0b1120',
          950: '#060a12',
        },
        solar: {
          yellow: '#f59e0b',
          amber: '#d97706',
          green: '#10b981',
          emerald: '#059669',
          blue: '#0284c7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
