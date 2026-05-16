import { describe, expect, it } from 'vitest'

import { parseFrontmatter, serializeFrontmatter } from './markdown/frontmatter'
import { asNoteId, tryNoteId } from './note/types'
import { asTagId } from './tag/types'

describe('品牌构造器', () => {
  it('asNoteId 非空通过、空抛错', () => {
    expect(asNoteId('abc')).toBe('abc')
    expect(() => asNoteId('')).toThrow()
  })

  it('tryNoteId 空值返回 null', () => {
    expect(tryNoteId(null)).toBeNull()
    expect(tryNoteId('')).toBeNull()
    expect(tryNoteId('x')).toBe('x')
  })

  it('asTagId 行为一致', () => {
    expect(asTagId('t1')).toBe('t1')
    expect(() => asTagId('')).toThrow()
  })
})

describe('frontmatter 往返保留未知字段', () => {
  it('id / title / tags / created_at / 未知键 全部往返', () => {
    const md = serializeFrontmatter(
      {
        id: 'note-123',
        title: '测试',
        tags: ['rust', 'tauri'],
        createdAt: '2024-01-01T00:00:00Z',
        extra: { author: 'afu', custom_field: 'keep-me' },
      },
      '正文 **内容**'
    )
    const { frontmatter, body } = parseFrontmatter(md)
    expect(frontmatter.id).toBe('note-123')
    expect(frontmatter.title).toBe('测试')
    expect(frontmatter.tags).toEqual(['rust', 'tauri'])
    expect(frontmatter.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(frontmatter.extra.author).toBe('afu')
    expect(frontmatter.extra.custom_field).toBe('keep-me')
    expect(body).toBe('正文 **内容**')
  })

  it('无 frontmatter 文本原样作为正文', () => {
    const { frontmatter, body } = parseFrontmatter('# 普通\n\n内容')
    expect(frontmatter.id).toBeUndefined()
    expect(body).toBe('# 普通\n\n内容')
  })
})
