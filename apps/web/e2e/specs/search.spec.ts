import { expect, test } from '../fixtures/seed'

test.describe('Search', () => {
  test('Cmd+K opens search dialog and finds by content', async ({ seededPage: page }) => {
    await page.keyboard.press('Meta+k')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.type('migration')
    await expect(page.getByText('Meeting minutes')).toBeVisible()
    await expect(page).toHaveScreenshot('search-results.png')
  })
})
