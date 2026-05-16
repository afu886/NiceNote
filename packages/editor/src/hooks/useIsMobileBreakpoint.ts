import { useEffect, useState } from 'react'

/** 移动端断点媒体查询（max-width: maxWidth-1）。纯函数便于单测。 */
export function getMobileMediaQuery(maxWidth: number): string {
  return `(max-width: ${maxWidth - 1}px)`
}

/**
 * 编辑器移动端断点检测（替代原 UI 包的 useIsBreakpoint('max',768)）。
 * editor 专属，非通用 primitive；SSR 安全。
 */
export function useIsMobileBreakpoint(maxWidth = 768): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(getMobileMediaQuery(maxWidth)).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(getMobileMediaQuery(maxWidth))
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [maxWidth])

  return matches
}
