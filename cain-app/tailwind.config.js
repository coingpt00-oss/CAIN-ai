/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cain: { cyan: "#00F5FF", dark: "#0B0E13", text: "#E6F7F8" },
      },
      fontFamily: {
        cain: ['"CAIN 로고 글씨체"', "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "1rem", "2xl": "1.5rem" },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.25)" },
    },
  },
  plugins: [],
}
