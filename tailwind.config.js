/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Restricted to Google Sans as requested
        'sans': ['Google Sans', 'sans-serif'],
        'mono': ['Google Sans Mono', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#133954',    // Primary Deep Blue
          slate: '#628290',   // Secondary Slate
          green: '#468902',   // Dark Green
          lime: '#b1de00',    // Bright Accent
          black: '#000000',   // Pure Black
        }
      }
    },
  },
  plugins: [],
}