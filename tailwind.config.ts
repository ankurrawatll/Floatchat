import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // School theme colors
        saffron: {
          50: "var(--saffron-50)",
          100: "var(--saffron-100)",
          200: "var(--saffron-200)",
          300: "var(--saffron-300)",
          400: "var(--saffron-400)",
          500: "var(--saffron-500)",
          600: "var(--saffron-600)",
          700: "var(--saffron-700)",
          800: "var(--saffron-800)",
          900: "var(--saffron-900)",
        },
        forest: {
          50: "var(--forest-50)",
          100: "var(--forest-100)",
          200: "var(--forest-200)",
          300: "var(--forest-300)",
          400: "var(--forest-400)",
          500: "var(--forest-500)",
          600: "var(--forest-600)",
          700: "var(--forest-700)",
          800: "var(--forest-800)",
          900: "var(--forest-900)",
        },
        cream: {
          50: "var(--cream-50)",
          100: "var(--cream-100)",
          200: "var(--cream-200)",
          300: "var(--cream-300)",
          400: "var(--cream-400)",
          500: "var(--cream-500)",
          600: "var(--cream-600)",
          700: "var(--cream-700)",
          800: "var(--cream-800)",
          900: "var(--cream-900)",
        },
        chalkboard: {
          50: "var(--chalkboard-50)",
          100: "var(--chalkboard-100)",
          200: "var(--chalkboard-200)",
          300: "var(--chalkboard-300)",
          400: "var(--chalkboard-400)",
          500: "var(--chalkboard-500)",
          600: "var(--chalkboard-600)",
          700: "var(--chalkboard-700)",
          800: "var(--chalkboard-800)",
          900: "var(--chalkboard-900)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
