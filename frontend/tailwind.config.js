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
        app: 'rgb(var(--bg-app) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        borderToken: 'rgb(var(--border-token) / <alpha-value>)',
        
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
        
        hover: 'rgb(var(--bg-hover) / <alpha-value>)',
        focusRing: 'rgb(var(--ring-focus) / <alpha-value>)',
        
        sidebar: 'rgb(var(--bg-sidebar) / <alpha-value>)',
        header: 'rgb(var(--bg-header) / <alpha-value>)',
        footer: 'rgb(var(--bg-footer) / <alpha-value>)',
        
        btnPrimary: 'rgb(var(--bg-btn-primary) / <alpha-value>)',
        input: 'rgb(var(--bg-input) / <alpha-value>)',
        
        chart: {
          1: 'rgb(var(--chart-1) / <alpha-value>)',
          2: 'rgb(var(--chart-2) / <alpha-value>)',
          3: 'rgb(var(--chart-3) / <alpha-value>)',
          4: 'rgb(var(--chart-4) / <alpha-value>)',
        },
        
        main: 'rgb(var(--text-main) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        premium: 'var(--shadow-premium)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
      spacing: {
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-6': 'var(--space-6)',
        'space-8': 'var(--space-8)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
