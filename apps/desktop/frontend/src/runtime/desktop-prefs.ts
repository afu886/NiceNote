import type { KeyValueStore } from '@nicenote/core'

/** Desktop 偏好键值存储：WebView localStorage（侧栏宽度/开合等纯 UI 偏好）。 */
export const desktopPrefs: KeyValueStore = {
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
      // 忽略
    }
  },
}
