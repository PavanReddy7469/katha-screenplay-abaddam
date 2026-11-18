import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        typewriter: ["var(--font-special-elite)", "Courier New", "monospace"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        telugu: ["var(--font-telugu)", "sans-serif"],
      },
      colors: {
        parchment: {
          50: "#FDF9EE",
          100: "#F7EED6",
          200: "#EFE0B9",
          300: "#E1C890",
          400: "#CFA962",
        },
        booth: {
          950: "#0E0B09",
          900: "#17120E",
          800: "#221B15",
          700: "#32271F",
          600: "#4A3A2E",
        },
        censor: {
          red: "#B91C1C",
          crimson: "#991B1B",
          ink: "#261B12",
          gold: "#D49B35",
          teal: "#1B5E4A",
        },
      },
      keyframes: {
        "stamp-slam": {
          "0%": {
            transform: "scale(2.8) rotate(-20deg)",
            opacity: "0",
          },
          "65%": {
            transform: "scale(0.92) rotate(-6deg)",
            opacity: "1",
          },
          "82%": {
            transform: "scale(1.04) rotate(-8deg)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(1) rotate(-7deg)",
            opacity: "1",
          },
        },
        "screen-shake": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "15%": { transform: "translate(-6px, 4px)" },
          "30%": { transform: "translate(6px, -4px)" },
          "45%": { transform: "translate(-4px, -3px)" },
          "60%": { transform: "translate(4px, 3px)" },
          "75%": { transform: "translate(-2px, 1px)" },
        },
        "reel-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "stamp-slam": "stamp-slam 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "screen-shake": "screen-shake 0.38s ease-in-out",
        "reel-spin": "reel-spin 4s linear infinite",
        "fade-up": "fade-up 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;

