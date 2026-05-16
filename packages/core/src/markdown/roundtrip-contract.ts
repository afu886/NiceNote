import type { ContractHarness } from '../contract-testing'

export interface MarkdownRoundtripContractOptions {
  /**
   * 注入一次"写入再读出"的 Markdown 往返（editor: writeEditorMarkdown→readEditorMarkdown；
   * editor-bridge: 模板 setContent→getMarkdown）。返回往返后的 Markdown。
   */
  roundtrip: (markdown: string) => string | Promise<string>
  /** 某些实现会规范化空白；提供归一化以做语义等价比较（默认按行 trimEnd） */
  normalize?: (markdown: string) => string
}

const SAMPLES = [
  '# 标题\n\n普通段落',
  '**加粗** 与 *斜体* 与 `代码`',
  '- 项目一\n- 项目二\n- 项目三',
  '1. 第一\n2. 第二',
  '> 引用块',
  '[链接](https://example.com)',
  '```\nconst a = 1\n```',
  '段落一\n\n段落二\n\n段落三',
]

/**
 * 可复用的 Markdown round-trip 契约套件（覆盖 editor 与 editor-bridge）。
 * 不变量：用户笔记正文只以 Markdown 持久化，往返语义不丢。
 */
export function createMarkdownRoundtripContract(
  harness: ContractHarness,
  options: MarkdownRoundtripContractOptions
): void {
  const { describe, it, expect } = harness
  const norm =
    options.normalize ??
    ((md: string) =>
      md
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n+$/, ''))

  describe('Markdown round-trip 契约', () => {
    for (const sample of SAMPLES) {
      it(`保持语义: ${JSON.stringify(sample.slice(0, 24))}`, async () => {
        const out = await options.roundtrip(sample)
        expect(norm(out)).toBe(norm(sample))
      })
    }
  })
}
