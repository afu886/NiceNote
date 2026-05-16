import { expect, test as base } from '@playwright/test'

/** 冻结时钟时刻（固定，使 formatDistanceToNow 相对时间稳定）。 */
const FROZEN_NOW = new Date('2026-05-16T12:00:00.000Z').getTime()

/** 确定性笔记/标签种子（固定时间戳，截图可复现）。 */
const SEED_NOTES = [
  {
    id: 'note-001',
    title: 'Welcome Note',
    content: '# Welcome\n\nThis is the **first** seeded note.',
    folderId: null,
    createdAt: '2026-05-16T10:00:00.000Z',
    updatedAt: '2026-05-16T11:50:00.000Z',
  },
  {
    id: 'note-002',
    title: 'Project Ideas',
    content: '# Ideas\n\n- idea one\n- idea two',
    folderId: null,
    createdAt: '2026-05-16T09:00:00.000Z',
    updatedAt: '2026-05-16T11:00:00.000Z',
  },
  {
    id: 'note-003',
    title: 'Meeting minutes',
    content: 'Discussed the migration roadmap.',
    folderId: null,
    createdAt: '2026-05-16T08:00:00.000Z',
    updatedAt: '2026-05-16T10:30:00.000Z',
  },
]

const SEED_TAGS = [
  { id: 'tag-work', name: 'work', color: null, createdAt: '2026-05-16T08:00:00.000Z' },
  { id: 'tag-idea', name: 'idea', color: null, createdAt: '2026-05-16T08:00:00.000Z' },
]

const SEED_NOTE_TAGS: Record<string, string[]> = {
  'note-001': ['tag-work'],
  'note-002': ['tag-idea'],
}

/**
 * 提供 `seededPage`：导航前注入确定性 localStorage 与冻结时钟，
 * 用例间隔离（每个用例全新 storage）。
 */
export const test = base.extend<{ seededPage: import('@playwright/test').Page }>({
  seededPage: async ({ page }, use) => {
    await page.addInitScript(
      ({ notes, tags, noteTags, now }) => {
        // 冻结 Date.now / new Date()（保持相对时间稳定）
        const Real = Date
        const fixed = now
        class FrozenDate extends Real {
          constructor(...args: unknown[]) {
            if (args.length === 0) {
              super(fixed)
            } else {
              // @ts-expect-error 透传构造参数
              super(...args)
            }
          }
          static now() {
            return fixed
          }
        }
        // @ts-expect-error 覆盖全局 Date
        window.Date = FrozenDate
        localStorage.setItem('nicenote-notes', JSON.stringify(notes))
        localStorage.setItem('nicenote-tags', JSON.stringify(tags))
        localStorage.setItem('nicenote-note-tags', JSON.stringify(noteTags))
        localStorage.setItem('nicenote-lang', 'en')
        localStorage.setItem('nicenote-theme', 'light')
        localStorage.setItem('nicenote-sidebar-open', 'true')
        localStorage.setItem('nicenote-sidebar-width', '320')
      },
      { notes: SEED_NOTES, tags: SEED_TAGS, noteTags: SEED_NOTE_TAGS, now: FROZEN_NOW }
    )
    await page.goto('/')
    await page.getByRole('heading', { name: 'Nicenote' }).waitFor()
    await use(page)
  },
})

export { expect }
