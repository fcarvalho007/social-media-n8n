import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Newsletter (ported) palette
        'ds-bg': 'var(--color-ds-bg)',
        'ds-shell': 'var(--color-ds-shell)',
        'ds-card': 'var(--color-ds-card)',
        'ds-card-hover': 'var(--color-ds-card-hover)',
        'ds-line': 'var(--color-ds-line)',
        'ds-line-strong': 'var(--color-ds-line-strong)',
        'ds-ink': 'var(--color-ds-ink)',
        'ds-muted': 'var(--color-ds-muted)',
        'ds-faint': 'var(--color-ds-faint)',
        'ds-primary': 'var(--color-ds-primary)',
        'ds-violet': 'var(--color-ds-violet)',
        'ds-pink': 'var(--color-ds-pink)',
        'ds-ok': 'var(--color-ds-ok)',
        'ds-warn': 'var(--color-ds-warn)',
        'ds-danger': 'var(--color-ds-danger)',
        'ds-gold': 'var(--color-ds-gold)',
        'rw-void': 'var(--color-rw-void)',
        'rw-navy': 'var(--color-rw-navy)',
        'rw-navy-2': 'var(--color-rw-navy-2)',
        'rw-paper': 'var(--color-rw-paper)',
        'rw-panel': 'var(--color-rw-panel)',
        'rw-ink': 'var(--color-rw-ink)',
        'rw-ink-2': 'var(--color-rw-ink-2)',
        'rw-chalk': 'var(--color-rw-chalk)',
        'rw-chalk-2': 'var(--color-rw-chalk-2)',
        'rw-ciano': 'var(--color-rw-ciano)',
        'rw-blue': 'var(--color-rw-blue)',
        'rw-blue-2': 'var(--color-rw-blue-2)',
        'rw-blue-soft': 'var(--color-rw-blue-soft)',
        'rw-amarelo': 'var(--color-rw-amarelo)',
        'rw-hairline': 'var(--color-rw-hairline)',
        'rw-rule': 'var(--color-rw-rule)',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          secondary: "hsl(var(--background-secondary))",
        },
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
        },
        'iconosquare-blue': "hsl(var(--iconosquare-blue))",
        'iconosquare-bg': "hsl(var(--iconosquare-bg))",
        'iconosquare-inactive': "hsl(var(--iconosquare-inactive))",
        'iconosquare-alert': "hsl(var(--iconosquare-alert))",
        'iconosquare-accent': "hsl(var(--iconosquare-accent))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
          foreground: "hsl(var(--success-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          light: "hsl(var(--destructive-light))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        aviso: {
          texto: "hsl(var(--aviso-texto))",
          borda: "hsl(var(--aviso-borda))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light: "hsl(var(--warning-light))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          purple: "hsl(var(--accent-purple))",
          mint: "hsl(var(--accent-mint))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          hover: "hsl(var(--card-hover))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          border: "hsl(var(--sidebar-border))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: {
            DEFAULT: "hsl(var(--sidebar-muted))",
            foreground: "hsl(var(--sidebar-muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--sidebar-muted))",
            foreground: "hsl(var(--sidebar-foreground))",
          },
          primary: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            foreground: "hsl(var(--sidebar-foreground))",
          },
          ring: "hsl(var(--sidebar-ring))",
        },
        'template-a': {
          primary: "hsl(var(--template-a-primary))",
          secondary: "hsl(var(--template-a-secondary))",
        },
        'template-b': {
          primary: "hsl(var(--template-b-primary))",
          secondary: "hsl(var(--template-b-secondary))",
        },
        // Chart gradients
        chart: {
          video: {
            from: "hsl(var(--chart-video-from))",
            to: "hsl(var(--chart-video-to))",
          },
          carrossel: {
            from: "hsl(var(--chart-carrossel-from))",
            to: "hsl(var(--chart-carrossel-to))",
          },
          image: {
            from: "hsl(var(--chart-image-from))",
            to: "hsl(var(--chart-image-to))",
          },
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        mono: ['DM Sans', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'manual-card': '24px',
        'manual-card-inner': '20px',
        'manual-field-group': '16px',
        'manual-label-field': '8px',
        'manual-gap-desktop': '32px',
        'manual-gap-tablet': '24px',
        'manual-preview-min': '360px',
      },
      fontSize: {
        'manual-section': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'manual-description': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'manual-label': ['13px', { lineHeight: '1.35', fontWeight: '500' }],
        'manual-hint': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'manual-micro': ['12px', { lineHeight: '1.35', fontWeight: '400' }],
      },
      transitionDuration: {
        'manual-color': '150ms',
        'manual-expand': '200ms',
      },
      screens: {
        '2xs': '320px',
        xs: '360px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
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
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "ripple": {
          "0%": {
            width: "0",
            height: "0",
            opacity: "0.5"
          },
          "100%": {
            width: "500px",
            height: "500px",
            opacity: "0"
          }
        },
        "pulse-subtle": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.25)" },
          "50%": { boxShadow: "0 0 0 6px hsl(var(--primary) / 0)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "ripple": "ripple 0.6s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
