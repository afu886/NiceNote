/**
 * 能力发现模型。
 *
 * UI 只读 capabilities 判别状态来渲染统一界面（按钮 disabled/隐藏/引导授权），
 * 不通过 optional 方法存在与否分叉 UI，也不 fork 组件。平台差异只走能力位。
 */
export type CapabilityState = 'available' | 'unsupported' | 'requiresWorkspacePermission'

export interface SystemCapabilities {
  revealInExplorer: CapabilityState
  pickWorkspaceFolder: CapabilityState
  fileWatch: CapabilityState
  download: CapabilityState
  /** 收藏（§统一领域模型一等概念；Web 报 unsupported，模型先统一） */
  favorites: CapabilityState
  /** 导入/导出（Web available；Desktop 阶段 1 unsupported） */
  importExport: CapabilityState
}
