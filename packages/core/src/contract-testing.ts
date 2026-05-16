/**
 * 契约测试运行器注入接口。
 *
 * core 不依赖 vitest。各 app 在自己的 .test.ts 里注入 { describe, it, expect }
 * （vitest 全局结构性兼容此子集），对本地实现运行 core 导出的契约套件。
 */

export interface ContractExpectation {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeNull(): void
  toBeTruthy(): void
}

export interface ContractExpect {
  (actual: unknown): ContractExpectation
}

export interface ContractHarness {
  describe(name: string, fn: () => void): void
  it(name: string, fn: () => void | Promise<void>): void
  expect: ContractExpect
}
