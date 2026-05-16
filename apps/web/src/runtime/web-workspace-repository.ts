import type { Workspace, WorkspaceRef, WorkspaceRepository } from '@nicenote/core'

/**
 * Web 无工作区概念：current/recent 恒空，不实现 watch。
 * 平台差异只走能力位（pickWorkspaceFolder=unsupported），界面不 fork。
 */
export class WebWorkspaceRepository implements WorkspaceRepository {
  async current(): Promise<Workspace | null> {
    return null
  }

  async recent(): Promise<Workspace[]> {
    return []
  }

  async open(_ref: WorkspaceRef): Promise<Workspace> {
    throw new Error('Web 不支持工作区')
  }
}
