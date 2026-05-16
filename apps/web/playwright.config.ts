import { defineConfig, devices } from '@playwright/test'

const PORT = 5173

/**
 * Web 视觉 + 交互基线（设计系统切换前必须就绪，阶段 2/3 回归对比基准）。
 * 单 Chromium、禁用动画、固定视口、确定性 localStorage 种子 + 冻结时钟以稳定截图。
 */
export default defineConfig({
  testDir: './e2e/specs',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'pnpm --filter @nicenote/web dev',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
