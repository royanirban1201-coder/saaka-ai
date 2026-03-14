/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:      '#07070F',
        bg2:     '#0D0D1A',
        bg3:     '#121224',
        card:    '#141428',
        card2:   '#1A1A32',
        primary: '#6C63FF',
        accent:  '#00D4AA',
        text1:   '#F0EFFE',
        text2:   '#A09DC0',
        text3:   '#5C5A7A',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        'float':   'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 0.7s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { from: {opacity:'0', transform:'translateY(16px)'}, to: {opacity:'1', transform:'translateY(0)'} },
        fadeIn:    { from: {opacity:'0'}, to: {opacity:'1'} },
        float:     { '0%,100%': {transform:'translateY(0)'}, '50%': {transform:'translateY(-6px)'} },
        'spin-slow':{ to: {transform:'rotate(360deg)'} },
        'pulse-glow':{ '0%,100%': {boxShadow:'0 0 20px rgba(108,99,255,0.2)'}, '50%': {boxShadow:'0 0 40px rgba(108,99,255,0.4)'} },
      },
      borderRadius: { DEFAULT: '12px', md: '12px', lg: '16px', xl: '20px' },
    },
  },
  plugins: [],
}
