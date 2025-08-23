/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        frontier: {
          50: '#f3f0ff',
          100: '#e8ddff',
          200: '#d4c2ff',
          300: '#b99bff',
          400: '#9866ff',
          500: '#7C3AED',
          600: '#6c2bd9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3c1877',
          950: '#1e1b4b',
        }
      }
    },
  },
  plugins: [],
}