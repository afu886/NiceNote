/**
 * 统一保存态。由 core usecase 暴露（阶段 1 接入 usecase），UI 只读不分叉。
 * Web 端恒 'saved'；Desktop 端经 debounce 保存生命周期切换。
 */
export type SaveState = 'saved' | 'saving' | 'unsaved'
