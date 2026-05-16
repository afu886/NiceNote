import { enUS, zhCN } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'

import { getDateLocale } from './date-locale'

describe('getDateLocale', () => {
  it('返回中文 locale', () => {
    expect(getDateLocale('zh')).toBe(zhCN)
  })

  it('返回英文 locale', () => {
    expect(getDateLocale('en')).toBe(enUS)
  })

  it('未知语言回退到英文', () => {
    expect(getDateLocale('fr')).toBe(enUS)
    expect(getDateLocale('')).toBe(enUS)
  })
})
