/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f7ff",
          100: "#bae7ff",
          200: "#91d5ff",
          300: "#69c0ff",
          400: "#40a9ff",
          500: "#1890ff", // Primary brand color (vivid blue)
          600: "#096dd9",
          700: "#0050b3",
          800: "#003a8c",
          900: "#002766", // Darker blue for sidebar
        },
        blue: {
          50: "#e6f7ff",
          100: "#bae7ff",
          200: "#91d5ff",
          300: "#69c0ff",
          400: "#40a9ff",
          500: "#1890ff",
          600: "#096dd9",
          700: "#0050b3",
          800: "#003a8c",
          900: "#002766",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(24, 144, 255, 0.1)',
        input: '0 2px 8px rgba(24, 144, 255, 0.1)',
        button: '0 2px 5px rgba(24, 144, 255, 0.25)',
        'button-hover': '0 4px 12px rgba(24, 144, 255, 0.3)',
        sidebar: '0 0 30px rgba(24, 144, 255, 0.15)',
        glow: '0 0 15px rgba(24, 144, 255, 0.5)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        typing: 'typing 1.5s steps(40) infinite alternate',
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s infinite ease-in-out',
        'float': 'float 3s infinite ease-in-out',
      },
      keyframes: {
        typing: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(24, 144, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(24, 144, 255, 0.7)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
}; 