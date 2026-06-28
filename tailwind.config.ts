import type { Config } from 'tailwindcss'

/**
 * 番录 设计 Token
 * - 主色：朱红 #E63B2E（明）/ 暖橙 #FF6E5A（暗）
 * - 背景：米白 #F4F1EC（明）/ 深黑 #161616（暗）
 * - 字体：思源宋体 SC（标题）/ 思源黑体 SC（正文）
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 语义化颜色
        bg: 'var(--color-bg)',
        'bg-elevated': 'var(--color-bg-elevated)',
        fg: 'var(--color-fg)',
        'fg-muted': 'var(--color-fg-muted)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        border: 'var(--color-border)',
        link: 'var(--color-link)',
        // 平台品牌色
        bilibili: '#FB7299',
        tencent: '#FF7028',
        iqiyi: '#00BE06',
        youku: '#00B8FF',
        crunchyroll: '#F47521',
        netflix: '#E50914',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // 8px 基准字号体系
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['3rem', { lineHeight: '3.5rem' }],
        '5xl': ['4.5rem', { lineHeight: '5rem' }],
      },
      spacing: {
        // 8px 基准
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        elev: '0 4px 16px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'pulse-slow': 'pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
