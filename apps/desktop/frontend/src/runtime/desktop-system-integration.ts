import type { NoteRef, SystemCapabilities, SystemIntegration, WorkspaceRef } from '@nicenote/core'
import { asWorkspaceId } from '@nicenote/core'

import type { DesktopRuntimeContext } from './desktop-runtime-context'

/** Desktop 系统集成 IPC 子集 */
export interface DesktopSystemApi {
  openFolderDialog(): Promise<string>
  revealInExplorer(path: string): Promise<void>
  toggleFavorite(path: string): Promise<void>
  getFavorites(): Promise<string[]>
}

const DESKTOP_CAPABILITIES: SystemCapabilities = {
  revealInExplorer: 'available',
  pickWorkspaceFolder: 'available',
  fileWatch: 'available',
  download: 'unsupported',
  favorites: 'available',
  importExport: 'unsupported',
}

/** Desktop 系统集成：除导入/导出外能力均 available（界面按能力位渲染，不 fork）。 */
export class DesktopSystemIntegration implements SystemIntegration {
  readonly capabilities = DESKTOP_CAPABILITIES

  constructor(
    private readonly api: DesktopSystemApi,
    private readonly ctx: DesktopRuntimeContext
  ) {}

  async revealItem(ref: NoteRef): Promise<void> {
    const path = this.ctx.pathOf(ref.id)
    if (path) await this.api.revealInExplorer(path)
  }

  async pickWorkspaceFolder(): Promise<WorkspaceRef | null> {
    const path = await this.api.openFolderDialog()
    if (!path) return null
    return { id: asWorkspaceId(path) }
  }

  async toggleFavorite(ref: NoteRef): Promise<void> {
    const path = this.ctx.pathOf(ref.id)
    if (path) await this.api.toggleFavorite(path)
  }

  async listFavorites(): Promise<readonly NoteRef[]> {
    const paths = await this.api.getFavorites().catch(() => [])
    const refs: NoteRef[] = []
    for (const p of paths) {
      const id = this.ctx.idOf(p)
      if (id) refs.push({ id })
    }
    return refs
  }
}
