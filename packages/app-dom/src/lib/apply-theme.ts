import type { Theme } from '@nicenote/shared'

/**
 * 将主题应用到 DOM（平台无关）
 *
 * 切换 dark class 和 data-theme 属性。
 */
export function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.classList.toggle('dark', isDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
}
