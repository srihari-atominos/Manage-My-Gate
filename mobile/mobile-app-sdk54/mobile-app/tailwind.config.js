const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['HankenGrotesk_400Regular', 'sans-serif'],
        medium: ['HankenGrotesk_500Medium', 'sans-serif'],
        semibold: ['HankenGrotesk_600SemiBold', 'sans-serif'],
        bold: ['HankenGrotesk_700Bold', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        status: {
          success: { DEFAULT: '#10b981', light: '#dcfce7', foreground: '#059669', dark: '#34d399' }, /* Emerald */
          warning: { DEFAULT: '#f59e0b', light: '#fef3c7', foreground: '#d97706', dark: '#fbbf24' }, /* Amber */
          danger:  { DEFAULT: '#f43f5e', light: '#ffe4e6', foreground: '#e11d48', dark: '#fb7185' }, /* Rose */
          info:    { DEFAULT: '#3b82f6', light: '#dbeafe', foreground: '#2563eb', dark: '#60a5fa' }, /* Sapphire */
          neutral: { DEFAULT: '#71717a', light: '#f4f4f5', foreground: '#52525b', dark: '#a1a1aa' }, /* Zinc */
          critical:{ DEFAULT: '#8b5cf6', light: '#f5f3ff', foreground: '#7c3aed', dark: '#a78bfa' }, /* Violet */
          gold:    { DEFAULT: '#c5a059', light: '#fbf7ee', foreground: '#997328', dark: '#d4af37' }, /* Champagne */
        },
      },
      borderRadius: {
        '3xl': 'calc(var(--radius) + 8px)',
        '2xl': 'calc(var(--radius) + 4px)',
        xl: 'var(--radius)',
        lg: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 6px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
