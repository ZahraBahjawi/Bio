/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Google Sans', 'sans-serif'],
        'mono': ['Google Sans Mono', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#133954',    // Deep Blue Background
          slate: '#628290',   // Muted Blue/Grey
          green: '#468902',   // Dark Green
          lime: '#b1de00',    // Bright Lime Accent
          black: '#000000',   // Pure Black
        }
      }
    },
  },
  plugins: [],
}