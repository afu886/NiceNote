import { expect, test } from '../fixtures/seed'

test.describe('Sidebar', () => {
  test('collapse and expand', async ({ seededPage: page }) => {
    await expect(page).toHaveScreenshot('sidebar-expanded.png')
    await page.getByRole('button', { name: 'Close sidebar' }).click()
    await expect(page.getByRole('button', { name: 'Open sidebar' })).toBeVisible()
    await expect(page).toHaveScreenshot('sidebar-collapsed.png')
    await page.getByRole('button', { name: 'Open sidebar' }).click()
    await expect(page.getByRole('button', { name: 'Close sidebar' })).toBeVisible()
  })

  test('switch between All Notes and All Tags', async ({ seededPage: page }) => {
    await page.getByRole('button', { name: 'All Tags' }).click()
    await expect(page.getByText('work')).toBeVisible()
    await expect(page.getByText('idea')).toBeVisible()
    await page.getByRole('button', { name: 'All Notes' }).click()
    await expect(page.getByText('Welcome Note')).toBeVisible()
  })
})
