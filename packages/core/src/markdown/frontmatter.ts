/**
 * Markdown frontmatter 契约（镜像 Desktop Rust services/frontmatter.rs 的形态）。
 *
 * 不变量：正文只持久化 Markdown 字符串；合成 id 存于 frontmatter；
 * 用户未知 frontmatter 字段必须原样保留（extra）。
 */
export interface Frontmatter {
  /** 合成稳定 id（NoteId 的持久化载体） */
  id?: string
  title?: string
  tags: string[]
  createdAt?: string
  /** 用户/未来未知字段，必须往返保留 */
  extra: Record<string, unknown>
}

const KNOWN_KEYS = new Set(['id', 'title', 'tags', 'created_at', 'createdAt'])

/** 创建空 frontmatter */
export function emptyFrontmatter(): Frontmatter {
  return { tags: [], extra: {} }
}

/**
 * 解析 Markdown 文本，分离 frontmatter 与正文。
 * 仅作 round-trip 契约与 Web 适配的参考实现；Desktop 以 Rust 为准。
 */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const text = raw.replace(/^\uFEFF/, '')
  if (!text.startsWith('---')) {
    return { frontmatter: emptyFrontmatter(), body: text }
  }
  const afterFirst = text.slice(3)
  const endIdx = afterFirst.indexOf('\n---')
  if (endIdx === -1) {
    return { frontmatter: emptyFrontmatter(), body: text }
  }
  const yamlStr = afterFirst.slice(0, endIdx).replace(/^\n+/, '')
  const body = afterFirst.slice(endIdx + 4).replace(/^\n+/, '')
  return { frontmatter: parseYamlSubset(yamlStr), body }
}

/** 序列化 frontmatter + 正文为完整 Markdown 文本（id 排首位，diff 友好）。 */
export function serializeFrontmatter(fm: Frontmatter, body: string): string {
  const lines: string[] = []
  if (fm.id != null) lines.push(`id: ${escapeScalar(fm.id)}`)
  if (fm.title != null) lines.push(`title: ${escapeScalar(fm.title)}`)
  if (fm.tags.length > 0) {
    lines.push('tags:')
    for (const t of fm.tags) lines.push(`  - ${escapeScalar(t)}`)
  }
  if (fm.createdAt != null) lines.push(`created_at: ${escapeScalar(fm.createdAt)}`)
  for (const [k, v] of Object.entries(fm.extra)) {
    lines.push(`${k}: ${escapeScalar(String(v))}`)
  }
  return `---\n${lines.join('\n')}\n---\n\n${body}`
}

/**
 * 极简 YAML 子集解析（仅覆盖本项目 frontmatter 形态：标量 + tags 列表 + 未知标量键）。
 * 复杂 YAML 由 Rust serde_yaml 负责；此处仅为 round-trip 契约与 Web 参考实现。
 */
function parseYamlSubset(yaml: string): Frontmatter {
  const fm = emptyFrontmatter()
  const rows = yaml.split('\n')
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i]
    if (line == null) continue
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const rest = line.slice(colon + 1).trim()
    if (key === 'tags') {
      const tags: string[] = []
      if (rest.startsWith('[')) {
        for (const part of rest.slice(1, -1).split(',')) {
          const v = unescapeScalar(part.trim())
          if (v.length > 0) tags.push(v)
        }
      } else {
        while (i + 1 < rows.length) {
          const next = rows[i + 1]
          if (next == null) break
          const m = next.match(/^\s*-\s+(.*)$/)
          if (!m || m[1] == null) break
          tags.push(unescapeScalar(m[1].trim()))
          i++
        }
      }
      fm.tags = tags
      continue
    }
    const value = unescapeScalar(rest)
    if (key === 'id') fm.id = value
    else if (key === 'title') fm.title = value
    else if (key === 'created_at' || key === 'createdAt') fm.createdAt = value
    else if (!KNOWN_KEYS.has(key)) fm.extra[key] = value
  }
  return fm
}

function escapeScalar(v: string): string {
  if (v.length === 0) return "''"
  if (/^[\w@./:\- ]+$/.test(v) && !/^\s|\s$/.test(v)) return v
  return `'${v.replace(/'/g, "''")}'`
}

function unescapeScalar(v: string): string {
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
    return v.slice(1, -1).replace(/''/g, "'")
  }
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    return v.slice(1, -1)
  }
  return v
}
