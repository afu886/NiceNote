/**
 * 持久化不变量（集中声明，供 runtime 实现与契约套件引用）。
 */

/** 笔记正文只持久化 Markdown 字符串；禁止持久化 ProseMirror JSON。 */
export const NOTE_BODY_FORMAT = 'markdown' as const

/** 合成稳定 id 的持久化位置：Desktop 在 frontmatter；Web 为 localStorage 记录 id 字段。 */
export const NOTE_ID_LOCATION = 'frontmatter-or-record-id' as const

/** 用户/未来未知 frontmatter 字段必须往返保留。 */
export const PRESERVE_UNKNOWN_FRONTMATTER = true as const
