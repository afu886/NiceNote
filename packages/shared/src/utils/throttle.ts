/**
 * throttle.ts — 节流
 */

interface ThrottleOptions {
  /** 是否在开始时立即执行，默认 true */
  leading?: boolean
  /** 是否在结束时执行最后一次，默认 true */
  trailing?: boolean
}

/**
 * 节流函数
 * 在固定时间窗口内最多执行一次
 *
 * @example
 *   const onScroll = throttle(() => {
 *     updatePosition();
 *   }, 100);
 *
 *   window.addEventListener('scroll', onScroll);
 *   // 卸载时记得取消
 *   onScroll.cancel();
 */
// 约束必须用 (...args: any[]) => any：以保留被包裹函数 T 的完整签名，
// 换成 unknown[] 会破坏对 Parameters<T> / ReturnType<T> 的推导。
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options

  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let result: ReturnType<T>

  function throttled(this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - lastTime)

    if (remaining <= 0 || remaining > wait) {
      // 超过时间窗口
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (leading || lastTime !== 0) {
        lastTime = now
        result = fn.apply(this, args)
      } else {
        // 首次调用且 leading=false：标记窗口开始，设置 trailing 定时器
        lastTime = now
        if (trailing && timer === null) {
          // eslint-disable-next-line
          const ctx = this
          const capturedArgs = args
          timer = setTimeout(() => {
            lastTime = Date.now()
            timer = null
            result = fn.apply(ctx, capturedArgs)
          }, wait)
        }
      }
    } else if (trailing && timer === null) {
      // 窗口内，设置 trailing 定时器
      // 需要捕捉当前调用的 this 和 args，用立即执行闭包隔离
      // eslint-disable-next-line
      const ctx = this
      const capturedArgs = args
      timer = setTimeout(() => {
        lastTime = Date.now()
        timer = null
        result = fn.apply(ctx, capturedArgs)
      }, remaining)
    }

    return result
  }

  /** 取消待执行的调用 */
  throttled.cancel = function () {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    lastTime = 0
  }

  return throttled as T & { cancel: () => void }
}
