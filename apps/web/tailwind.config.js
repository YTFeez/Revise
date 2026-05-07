/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0f1018",
          card: "#171927",
          soft: "#1f2233",
          ring: "#2a2e44",
        },
        brand: {
          50: "#eef0ff",
          100: "#dadefb",
          200: "#b8bff7",
          300: "#8a8ff0",
          400: "#6b6ee8",
          500: "#5b5fdc",
          600: "#4d4ec5",
          700: "#3f409e",
          800: "#2f3079",
          900: "#212255",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(112, 117, 230, 0.35)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
