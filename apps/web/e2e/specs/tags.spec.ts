import { expect, test } from '../fixtures/seed'

test.describe('Tags', () => {
  test('tag list shows seeded tags with counts and filters notes', async ({ seededPage: page }) => {
    await page.getByRole('button', { name: 'All Tags' }).click()
    await expect(page.getByText('work')).toBeVisible()
    await expect(page.getByText('idea')).toBeVisible()
    await expect(page).toHaveScreenshot('tags-panel.png')

    // 点击 work 标签 → 回到笔记视图并按标签过滤
    await page.getByRole('button', { name: /work/ }).click()
    await expect(page.getByText('Welcome Note')).toBeVisible()
    await expect(page.getByText('Project Ideas')).toHaveCount(0)
    await expect(page).toHaveScreenshot('tags-filtered.png')
  })
})
