/**
 * 轻量键值偏好端口（同步）。
 *
 * 用于侧栏宽度/开合等纯 UI 偏好持久化。app-dom 不直接访问 localStorage，
 * 由各 app 的 runtime 注入实现（Web=localStorage，Desktop=localStorage）。
 */
export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
}
