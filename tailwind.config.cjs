/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from brand-assets.png
        'mystic-start': '#FF8FDA',
        'mystic-end': '#3700FF',
        'electric-start': '#4100F5', 
        'electric-end': '#CEF564',
        'golden-start': '#FE6901',
        'golden-end': '#FECD07',
        'floral-start': '#EE86DC',
        'floral-end': '#1FE309',
        'rose-start': '#8D0042',
        'rose-end': '#FF8FDA',
        'aurora-start': '#5011FF',
        'aurora-end': '#32FE6B',
        'emerald-start': '#32FE6B',
        'emerald-end': '#064400',
        'celestial-start': '#4F11FA',
        'celestial-end': '#FF7B69',
      },
      backgroundImage: {
        'brand-mystic': 'linear-gradient(135deg, #FF8FDA 0%, #3700FF 100%)',
        'brand-electric': 'linear-gradient(135deg, #4100F5 0%, #CEF564 100%)',
        'brand-golden': 'linear-gradient(135deg, #FE6901 0%, #FECD07 100%)',
        'brand-floral': 'linear-gradient(135deg, #EE86DC 0%, #1FE309 100%)',
        'brand-rose': 'linear-gradient(135deg, #8D0042 0%, #FF8FDA 100%)',
        'brand-aurora': 'linear-gradient(135deg, #5011FF 0%, #32FE6B 100%)',
        'brand-emerald': 'linear-gradient(135deg, #32FE6B 0%, #064400 100%)',
        'brand-celestial': 'linear-gradient(135deg, #4F11FA 0%, #FF7B69 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'gradient': 'gradient 8s ease infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      }
    },
  },
  plugins: [],
}