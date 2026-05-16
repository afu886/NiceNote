import { useSyncExternalStore } from 'react'

export const MINUTE_TICK_INTERVAL_MS = 60_000

let tick = 0
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function emitTick() {
  tick += 1
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // 单个 listener 异常不影响其他 listener 的通知
    }
  })
}

function startTicker() {
  if (timer !== null) return
  timer = setInterval(emitTick, MINUTE_TICK_INTERVAL_MS)
}

function stopTicker() {
  if (timer === null) return
  clearInterval(timer)
  timer = null
}

/** 外部 store 订阅函数（供 useSyncExternalStore 和测试使用） */
export function subscribe(listener: () => void) {
  listeners.add(listener)
  startTicker()

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopTicker()
    }
  }
}

/** 外部 store 快照函数（供 useSyncExternalStore 和测试使用） */
export function getSnapshot() {
  return tick
}

/** 重置内部状态（仅供测试使用） */
export function _resetForTesting() {
  tick = 0
  listeners.clear()
  stopTicker()
}

export function useMinuteTicker() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
