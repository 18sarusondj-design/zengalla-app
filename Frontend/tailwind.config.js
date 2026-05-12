/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#16A34A',
          greenLight: '#DCFCE7',
          orange: '#0ea5e9',
          primary: '#0ea5e9', // Mapped to blue
          primaryLight: '#f0f9ff', 
          yellow: '#FACC15',
        },
        background: '#F9FAFB', // Light gray background
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

