import type { AppRuntime } from '../app-runtime'
import type { SaveState } from '../save-state'

import type { Note, NoteDraft, NoteId, NotePatch, NoteSummary } from './types'

export interface NoteUsecases {
  /** 列出全部笔记摘要（聚合分页，统一供 UI 用） */
  list(): Promise<NoteSummary[]>
  get(id: NoteId): Promise<Note | null>
  create(draft?: NoteDraft): Promise<Note>
  update(id: NoteId, patch: NotePatch): Promise<Note>
  remove(id: NoteId): Promise<void>
}

/**
 * 笔记 usecase 工厂（纯函数 + 端口，无 React/Zustand）。
 * 统一封装"列表聚合"等领域编排，Web/Desktop 行为一致。
 */
export function createNoteUsecases(runtime: Pick<AppRuntime, 'notes'>): NoteUsecases {
  return {
    async list() {
      const items: NoteSummary[] = []
      const seen = new Set<string>()
      let cursor = null as Awaited<ReturnType<typeof runtime.notes.list>>['nextCursor']
      // 聚合所有分页（Desktop 一次性返回；Web 游标分页）。
      // 防御：当底层游标因时间戳并列无法推进时（已知 localStorage 精度限制），
      // 以"本页无新增 id"或重复游标为终止条件，避免死循环。
      for (let guard = 0; guard < 10_000; guard++) {
        const page = await runtime.notes.list(cursor ? { cursor } : {})
        let added = 0
        for (const it of page.items) {
          if (seen.has(it.id)) continue
          seen.add(it.id)
          items.push(it)
          added++
        }
        const next = page.nextCursor
        if (!next || added === 0) break
        if (cursor && next.id === cursor.id && next.updatedAt === cursor.updatedAt) break
        cursor = next
      }
      return items
    },
    get: (id) => runtime.notes.get(id),
    create: (draft) => runtime.notes.create(draft ?? {}),
    update: (id, patch) => runtime.notes.update(id, patch),
    remove: (id) => runtime.notes.delete(id),
  }
}

/** 保存态投影：领域语义的统一保存态（UI 只读，不分叉）。 */
export type { SaveState }
