import type { SearchHit, SearchQuery } from './types'

/**
 * 搜索服务端口。底层实现可不同（Web 内存扫描 / Desktop 索引），契约统一返回 SearchHit。
 */
export interface SearchService {
  search(query: SearchQuery): Promise<SearchHit[]>
}
