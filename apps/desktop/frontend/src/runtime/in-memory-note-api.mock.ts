import { parseFrontmatter, serializeFrontmatter } from '@nicenote/core'

import type { NoteContent, NoteFile } from '../bindings/tauri'

import type { DesktopNoteApi } from './tauri-note-repository.adapter'

/**
 * 内存版 DesktopNoteApi，忠实模拟 Rust services/note_io + frontmatter 行为：
 * - frontmatter id 缺失时回填并写回（read/save）
 * - rename 保持 id 不变、保留未知字段
 * 仅用于契约测试注入（非 .test 文件，可复用）。
 */
export class InMemoryNoteApi implements DesktopNoteApi {
  private readonly files = new Map<string, string>()
  private clock = 1_700_000_000_000

  constructor(private readonly folderPath = '/ws') {}

  reset(): void {
    this.files.clear()
  }

  private now(): string {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }

  private stem(path: string): string {
    const base = path.slice(path.lastIndexOf('/') + 1)
    return base.endsWith('.md') ? base.slice(0, -3) : base
  }

  private uniquePath(name: string): string {
    let candidate = `${this.folderPath}/${name}.md`
    let i = 2
    while (this.files.has(candidate)) {
      candidate = `${this.folderPath}/${name} ${i}.md`
      i += 1
    }
    return candidate
  }

  private ensureId(path: string): {
    raw: string
    fm: ReturnType<typeof parseFrontmatter>['frontmatter']
    body: string
  } {
    const raw = this.files.get(path) ?? ''
    const { frontmatter, body } = parseFrontmatter(raw)
    if (frontmatter.id == null || frontmatter.id.length === 0) {
      frontmatter.id = crypto.randomUUID()
      const rewritten = serializeFrontmatter(frontmatter, body)
      this.files.set(path, rewritten)
      return { raw: rewritten, fm: frontmatter, body }
    }
    return { raw, fm: frontmatter, body }
  }

  private meta(path: string): NoteFile {
    const { fm, body } = this.ensureId(path)
    const title = fm.title && fm.title.length > 0 ? fm.title : this.stem(path)
    const summaryLine =
      body.split('\n').find((l) => l.trim().length > 0 && !l.trimStart().startsWith('#')) ?? ''
    return {
      id: fm.id!,
      path,
      title,
      summary: summaryLine.trim().slice(0, 120),
      tags: fm.tags,
      createdAt: fm.createdAt ?? new Date(this.clock).toISOString(),
      updatedAt: new Date(this.clock).toISOString(),
    }
  }

  async listNotes(folderPath: string): Promise<NoteFile[]> {
    return [...this.files.keys()].filter((p) => p.startsWith(folderPath)).map((p) => this.meta(p))
  }

  async getNoteContent(path: string): Promise<NoteContent> {
    if (!this.files.has(path)) throw new Error(`不存在: ${path}`)
    const { body } = this.ensureId(path)
    const meta = this.meta(path)
    return { ...meta, content: body, rawContent: this.files.get(path) ?? '' }
  }

  async saveNote(path: string, content: string, tags: string[]): Promise<void> {
    const { fm } = this.ensureId(path)
    fm.tags = tags
    if (fm.createdAt == null) fm.createdAt = this.now()
    this.files.set(path, serializeFrontmatter(fm, content))
  }

  async createNote(folderPath: string): Promise<NoteFile> {
    const path = this.uniquePath('Untitled')
    const id = crypto.randomUUID()
    this.files.set(
      path,
      serializeFrontmatter(
        { id, title: this.stem(path), tags: [], createdAt: this.now(), extra: {} },
        ''
      )
    )
    void folderPath
    return this.meta(path)
  }

  async renameNote(oldPath: string, newTitle: string): Promise<NoteFile> {
    const { fm, body } = this.ensureId(oldPath)
    fm.title = newTitle
    const newPath = this.uniquePath(newTitle.replace(/[/\\:*?"<>|]/g, '-'))
    this.files.set(newPath, serializeFrontmatter(fm, body))
    if (newPath !== oldPath) this.files.delete(oldPath)
    return this.meta(newPath)
  }

  async deleteNote(path: string): Promise<void> {
    this.files.delete(path)
  }
}
