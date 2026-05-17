/**
 * debounce.ts — 防抖
 */

// 约束必须用 (...args: any[]) => any：以保留被包裹函数 T 的完整签名，
// 换成 unknown[] 会破坏对 Parameters<T> / ReturnType<T> 的推导。
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastContext: unknown = null
  let result: ReturnType<T>

  function invokeFunc(context: unknown, args: Parameters<T>) {
    result = fn.apply(context, args)
    lastArgs = null
    lastContext = null
  }

  function debounced(this: unknown, ...args: Parameters<T>) {
    lastArgs = args
    // eslint-disable-next-line
    lastContext = this

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      if (lastArgs !== null) {
        invokeFunc(lastContext, lastArgs)
      }
    }, wait)

    return result
  }

  /** 取消待执行的调用 */
  debounced.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
    lastContext = null
  }

  /** 立即执行待处理的调用（如果有） */
  debounced.flush = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (lastArgs !== null) {
      invokeFunc(lastContext, lastArgs)
    }
  }

  return debounced as T & { cancel: () => void; flush: () => void }
}
