/**
 * 安全高亮组件：在文本中查找关键词并用 <mark> 渲染，不使用 dangerouslySetInnerHTML
 */

export interface HighlightSnippetProps {
  /** 要显示的文本 */
  text: string
  /** 搜索关键词（高亮匹配部分） */
  query: string
}

export function HighlightSnippet({ text, query }: HighlightSnippetProps) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
