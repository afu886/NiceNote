import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 类名合并（clsx + tailwind-merge，解析 Tailwind 冲突）。
 * 等价原通用 UI 包的 cn；topicly-ui 的 mergeClassNames 仅空格拼接，不解析冲突，不可替代。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
