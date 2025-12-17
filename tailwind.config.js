/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        gravity: {
          dark: '#121317',
          light: '#FFFFFF',
          'surface-light': '#F8F9FC',
          'surface-dark': '#202124',
          'text-main-light': '#202124',
          'text-main-dark': '#E8EAED',
          'text-sub-light': '#5F6368',
          'text-sub-dark': '#9AA0A6',
          'border-light': '#E8EAED',
          'border-dark': '#3C4043',
          blue: '#1A73E8',
          blueDark: '#8AB4F8',
          accent: '#FBBC04',
          success: '#34A853',
          danger: '#EA4335',
          // Keep nested structure for backwards compatibility
          surface: {
            dark: '#202124',
            light: '#F8F9FC'
          },
          text: {
            main: {
              light: '#202124',
              dark: '#E8EAED'
            },
            sub: {
              light: '#5F6368',
              dark: '#9AA0A6'
            }
          },
          border: {
            light: '#E8EAED',
            dark: '#3C4043'
          }
        }
      },
      animation: {
        float: 'float 10s ease-in-out infinite',
        bounce: 'bounce 1s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        }
      }
    }
  },
  plugins: []
};