import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { K } from './storage/keys'
import { load, save } from './storage/store'

/**
 * 主题系统：按风景分类内置多套主题，每套 = 配色 tokens + 主题壁纸。
 * 运行时在 <html> 上覆盖 --color-* 同名 CSS 变量完成切换（Tailwind v4 @theme 默认森林为基线）。
 * 全局壁纸与主题色解耦：壁纸只是背景层，蒙层保证 UI 可读，不改动配色 tokens。
 */

export type ThemeId = 'forest' | 'ocean'

export interface AppTheme {
  id: ThemeId
  label: string
  /** 主题自带壁纸：CSS background 值（v1 不引外部图，用渐模拟氛围） */
  wallpaper: string
  /** 覆盖在 --color-* 上的 token 值 */
  tokens: Record<string, string>
}

export const THEMES: Record<ThemeId, AppTheme> = {
  forest: {
    id: 'forest',
    label: '森林',
    wallpaper:
      'radial-gradient(120% 90% at 20% 0%, #cfe0bd 0%, #e6ecda 45%, #d8e0c4 100%)',
    tokens: {
      '--color-background': '#e9ecdf',
      '--color-foreground': '#22301f',
      '--color-card': '#f4f6ec',
      '--color-card-foreground': '#22301f',
      '--color-muted': '#e2e6d6',
      '--color-muted-foreground': '#6c7a63',
      '--color-primary': '#33503a',
      '--color-primary-foreground': '#f4f6ec',
      '--color-accent': '#8aa470',
      '--color-accent-foreground': '#22301f',
      '--color-leaf': '#6f8f5c',
      '--color-sun': '#c99a3e',
      '--color-border': '#d6dcc8',
      '--color-ring': '#6f8f5c',
    },
  },
  ocean: {
    id: 'ocean',
    label: '海洋',
    wallpaper:
      'radial-gradient(120% 90% at 25% 0%, #c8e0e6 0%, #dfe9ea 45%, #cfe3e4 100%)',
    tokens: {
      '--color-background': '#dde6e9',
      '--color-foreground': '#1b3135',
      '--color-card': '#eef2f2',
      '--color-card-foreground': '#1b3135',
      '--color-muted': '#d9e2e2',
      '--color-muted-foreground': '#6a7c7e',
      '--color-primary': '#1f5363',
      '--color-primary-foreground': '#eef4f4',
      '--color-accent': '#7fa3ab',
      '--color-accent-foreground': '#10282c',
      '--color-leaf': '#4f7d74',
      '--color-sun': '#cf9f4a',
      '--color-border': '#c6d4d6',
      '--color-ring': '#7fa3ab',
    },
  },
}

const ThemeContext = createContext<{
  theme: AppTheme
  themes: AppTheme[]
  setTheme: (id: ThemeId) => void
}>({ theme: THEMES.forest, themes: Object.values(THEMES), setTheme: () => {} })

function applyTheme(t: AppTheme) {
  const el = document.documentElement
  for (const [k, v] of Object.entries(t.tokens)) el.style.setProperty(k, v)
  // 主题氛围背景：渐变直接作为 body 背景（不涉及用户照片壁纸层）
  document.body.style.background = t.wallpaper
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const stored = load<ThemeId>(K.theme, 'forest')
    return stored && THEMES[stored] ? stored : 'forest'
  })

  const setTheme = useCallback((id: ThemeId) => {
    save(K.theme, id)
    setThemeId(id)
  }, [])

  useEffect(() => {
    applyTheme(THEMES[themeId])
  }, [themeId])

  return <ThemeContext.Provider value={{ theme: THEMES[themeId], themes: Object.values(THEMES), setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
