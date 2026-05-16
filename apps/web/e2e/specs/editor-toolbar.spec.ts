import { expect, test } from '../fixtures/seed'

/**
 * 编辑器工具栏/链接/下拉视觉与交互基线 —— 阶段 2（editor 解耦 @nicenote/ui）
 * 的回归对比基准，必须在切换前建立并提交。
 */
test.describe('Editor toolbar', () => {
  test('toolbar renders for a selected note', async ({ seededPage: page }) => {
    await page.getByText('Welcome Note').click()
    const toolbar = page.getByRole('toolbar', { name: 'Formatting toolbar' })
    await expect(toolbar).toBeVisible({ timeout: 15_000 })
    // 工具栏含多个可交互按钮
    await expect(toolbar.getByRole('button').first()).toBeVisible()
    await expect(page).toHaveScreenshot('editor-toolbar.png')
  })

  test('heading dropdown opens', async ({ seededPage: page }) => {
    await page.getByText('Welcome Note').click()
    const toolbar = page.getByRole('toolbar', { name: 'Formatting toolbar' })
    await expect(toolbar).toBeVisible({ timeout: 15_000 })

    // 标题菜单触发器（CommandDropdownMenu，aria-label 含 "Heading"）
    await toolbar
      .getByRole('button', { name: /Heading/ })
      .first()
      .click()
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page).toHaveScreenshot('editor-heading-menu.png')
    await page.keyboard.press('Escape')
  })

  test('source mode toggle reveals markdown textarea', async ({ seededPage: page }) => {
    await page.getByText('Welcome Note').click()
    const toolbar = page.getByRole('toolbar', { name: 'Formatting toolbar' })
    await expect(toolbar).toBeVisible({ timeout: 15_000 })
    await toolbar.getByRole('button', { name: 'Source' }).first().click()
    await expect(page.getByRole('textbox', { name: 'Note content' })).toBeVisible()
  })
})
