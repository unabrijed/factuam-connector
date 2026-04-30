import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#1f2937",
        surface: "#0f172a",
        accent: "#38bdf8"
      }
    }
  },
  plugins: []
} satisfies Config;
