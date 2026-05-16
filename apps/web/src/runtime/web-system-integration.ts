import type { NoteRepository, SystemCapabilities, SystemIntegration } from '@nicenote/core'

import { downloadBlob } from '../lib/export'
import { parseMarkdownFile } from '../lib/import'

const WEB_CAPABILITIES: SystemCapabilities = {
  revealInExplorer: 'unsupported',
  pickWorkspaceFolder: 'unsupported',
  fileWatch: 'unsupported',
  download: 'available',
  favorites: 'unsupported',
  importExport: 'available',
}

/** Web 系统集成：仅导入/导出可用，其余能力 unsupported（界面按能力位渲染，不 fork）。 */
export class WebSystemIntegration implements SystemIntegration {
  readonly capabilities = WEB_CAPABILITIES
  private readonly notes: NoteRepository

  constructor(notes: NoteRepository) {
    this.notes = notes
  }

  async exportToFile(name: string, markdown: string): Promise<void> {
    downloadBlob(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), name)
  }

  async importMarkdownFiles(files: File[]): Promise<number> {
    let count = 0
    for (const file of files) {
      const parsed = await parseMarkdownFile(file)
      await this.notes.create({ title: parsed.title, content: parsed.content })
      count += 1
    }
    return count
  }
}
