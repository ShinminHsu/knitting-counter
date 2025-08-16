/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D97398',
          light: '#F5E6ED',
          dark: '#B85A7F'
        },
        background: {
          primary: '#FEFCFA',
          secondary: '#F8F6F4',
          tertiary: '#F2F0EE'
        },
        text: {
          primary: '#2D2D2D',
          secondary: '#666666',
          tertiary: '#999999'
        },
        border: '#E5E5E5',
        shadow: 'rgba(0, 0, 0, 0.1)'
      },
      fontFamily: {
        sans: ['Inter', 'Hiragino Sans CNS', 'system-ui', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}