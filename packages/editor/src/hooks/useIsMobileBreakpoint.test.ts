import { describe, expect, it } from 'vitest'

import { getMobileMediaQuery } from './useIsMobileBreakpoint'

describe('getMobileMediaQuery', () => {
  it('生成 max-width = maxWidth - 1 的媒体查询', () => {
    expect(getMobileMediaQuery(768)).toBe('(max-width: 767px)')
    expect(getMobileMediaQuery(1024)).toBe('(max-width: 1023px)')
  })
})
