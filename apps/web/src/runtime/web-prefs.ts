import type { KeyValueStore } from '@nicenote/core'

/** Web 偏好键值存储：localStorage（侧栏宽度/开合等纯 UI 偏好）。 */
export const webPrefs: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 忽略（隐私模式/配额）
    }
  },
}
