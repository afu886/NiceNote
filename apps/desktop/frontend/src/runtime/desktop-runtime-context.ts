import type { NoteId } from '@nicenote/core'
import { asNoteId } from '@nicenote/core'

import type { NoteFile } from '../bindings/tauri'

/**
 * Desktop runtime 共享上下文。
 *
 * 持有当前工作区、path ↔ NoteId 映射、按笔记的 frontmatter 标签缓存，
 * 以及防抖保存/重命名调度。path 只活在 runtime 内，绝不外泄进 app-dom。
 */
export class DesktopRuntimeContext {
  currentFolder: string | null = null

  private readonly pathToId = new Map<string, NoteId>()
  private readonly idToPath = new Map<string, string>()
  /** 按 NoteId 的 frontmatter 标签名缓存（来自 NoteFile.tags，避免逐文件再读） */
  private readonly tagsById = new Map<string, string[]>()

  /** 记录一条笔记的 path↔id 与标签缓存（在 list/get/create 时刷新） */
  remember(file: Pick<NoteFile, 'id' | 'path' | 'tags'>): NoteId {
    const id = asNoteId(file.id)
    this.pathToId.set(file.path, id)
    this.idToPath.set(id, file.path)
    this.tagsById.set(id, [...file.tags])
    return id
  }

  forgetPath(path: string): void {
    const id = this.pathToId.get(path)
    this.pathToId.delete(path)
    if (id) {
      this.idToPath.delete(id)
      this.tagsById.delete(id)
    }
  }

  pathOf(id: NoteId): string | null {
    return this.idToPath.get(id) ?? null
  }

  idOf(path: string): NoteId | null {
    return this.pathToId.get(path) ?? null
  }

  tagsOf(id: NoteId): string[] {
    return this.tagsById.get(id) ?? []
  }

  setTags(id: NoteId, tags: string[]): void {
    this.tagsById.set(id, [...tags])
  }

  /** 当前缓存中所有不重复标签名（来自各笔记 frontmatter） */
  allTagNames(): string[] {
    const set = new Set<string>()
    for (const tags of this.tagsById.values()) {
      for (const t of tags) set.add(t)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }

  allNoteIds(): NoteId[] {
    return [...this.idToPath.keys()].map((k) => k as NoteId)
  }
}

/**
 * 单笔记防抖写入器：合并高频写入，返回随实际 IPC 完成而 resolve 的 promise，
 * 用于把保存态保持在 'saving' 直到真正持久化（等价原 useDesktopStore 行为）。
 */
export class DebouncedWriter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: (() => Promise<void>) | null = null
  private waiters: Array<{ resolve: () => void; reject: (e: unknown) => void }> = []

  constructor(private readonly delayMs: number) {}

  schedule(op: () => Promise<void>): Promise<void> {
    this.pending = op
    if (this.timer) clearTimeout(this.timer)
    const p = new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject })
    })
    this.timer = setTimeout(() => void this.run(), this.delayMs)
    return p
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.pending) await this.run()
  }

  private async run(): Promise<void> {
    this.timer = null
    const op = this.pending
    this.pending = null
    const waiters = this.waiters
    this.waiters = []
    if (!op) {
      waiters.forEach((w) => w.resolve())
      return
    }
    try {
      await op()
      waiters.forEach((w) => w.resolve())
    } catch (e) {
      waiters.forEach((w) => w.reject(e))
    }
  }
}
