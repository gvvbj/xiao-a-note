/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Source Han Sans CN"',
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif'
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        thinking: {
          bg: "hsl(var(--thinking-bg))",
          text: "hsl(var(--thinking-text))",
          border: "hsl(var(--thinking-border))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          active: "hsl(var(--sidebar-active))",
          hover: "hsl(var(--sidebar-hover))",
        },
        header: {
          DEFAULT: "hsl(var(--header-background))",
          foreground: "hsl(var(--header-foreground))",
        },
        editor: {
          DEFAULT: "hsl(var(--editor-background))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // 自定义 Typography 样式
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'hsl(var(--foreground))',
            h1: { color: 'hsl(var(--foreground))' },
            h2: { color: 'hsl(var(--foreground))' },
            h3: { color: 'hsl(var(--foreground))' },
            strong: { color: 'hsl(var(--foreground))' },
            a: { color: 'hsl(var(--primary))', textDecoration: 'underline' },
            // 行内代码（非代码块内）
            'code': {
              color: 'hsl(var(--foreground))',
              backgroundColor: 'hsl(var(--muted))',
              borderRadius: '0.25rem',
              padding: '0.125rem 0.25rem',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            // 代码块样式（深色背景）
            'pre': {
              backgroundColor: '#282c34',
              borderRadius: '0.5rem',
              padding: '1rem',
              color: '#abb2bf',
            },
            'pre code': {
              backgroundColor: 'transparent',
              borderRadius: '0',
              padding: '0',
              color: '#abb2bf',
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
              fontSize: '0.9em',
            },
            blockquote: { borderLeftColor: 'hsl(var(--primary))', color: 'hsl(var(--muted-foreground))' },
            'ul > li::marker': { color: 'hsl(var(--muted-foreground))' },
            'ol > li::marker': { color: 'hsl(var(--muted-foreground))' },
            // 任务列表复选框
            'input[type="checkbox"]': {
              appearance: 'none',
              width: '1.125rem',
              height: '1.125rem',
              border: '2px solid #6b7280',
              borderRadius: '0.25rem',
              marginRight: '0.5rem',
              verticalAlign: 'middle',
              cursor: 'pointer',
              backgroundColor: 'transparent',
            },
            'input[type="checkbox"]:checked': {
              backgroundColor: '#10b981',
              borderColor: '#10b981',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 关键插件
  ],
}
