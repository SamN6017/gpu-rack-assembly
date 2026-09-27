import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/three/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: "#0b0f19",
          850: "#111827",
          800: "#151d2f",
          750: "#1e293b",
          700: "#273449",
          600: "#374151",
          500: "#4b5563",
          400: "#64748b",
          300: "#94a3b8",
          200: "#cbd5e1",
          100: "#f1f5f9",
          accent: "#0ea5e9", // Industrial cyan/blue
          amber: "#f59e0b",
          emerald: "#10b981",
          rose: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
