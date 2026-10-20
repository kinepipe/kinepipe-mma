/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        biomech: {
          bg: "#0B0E14",
          surface: "#121722",
          card: "#18202F",
          border: "#243044",
          primary: "#00FF88",
          secondary: "#00E5FF",
          accent: "#FFD600",
          danger: "#FF3D00",
          text: "#E2E8F0",
          muted: "#94A3B8"
        }
      }
    },
  },
  plugins: [],
}
