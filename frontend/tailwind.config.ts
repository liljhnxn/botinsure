import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080b11",
        surface: "#0e1420",
        surfaceBorder: "#1e293b",
        surfaceHover: "#162032",
        botCyan: "#06b6d4",
        botBlue: "#3b82f6",
        botPurple: "#8b5cf6",
        botGreen: "#10b981",
        botAmber: "#f59e0b",
        botRose: "#f43f5e",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cyber-grid": "linear-gradient(to right, #1e293b15 1px, transparent 1px), linear-gradient(to bottom, #1e293b15 1px, transparent 1px)",
      },
      boxShadow: {
        cyanGlow: "0 0 20px -3px rgba(6, 182, 212, 0.25)",
        blueGlow: "0 0 20px -3px rgba(59, 130, 246, 0.25)",
        purpleGlow: "0 0 20px -3px rgba(139, 92, 246, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
