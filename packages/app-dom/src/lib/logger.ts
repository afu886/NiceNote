/**
 * 应用内统一错误日志出口。
 *
 * 收敛分散在组件/状态层的 console.error：提供单一改写点，
 * 便于后续接入错误追踪服务；当前实现仅透传到 console，保留可见性。
 */
export function logError(scope: string, error: unknown, ...extra: unknown[]): void {
  console.error(`[${scope}]`, error, ...extra)
}
