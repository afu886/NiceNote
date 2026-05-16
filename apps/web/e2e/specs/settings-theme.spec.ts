import { expect, test } from '../fixtures/seed'

test.describe('Settings & theme', () => {
  test('switch to dark theme applies DOM theme', async ({ seededPage: page }) => {
    const root = page.locator('html')
    await expect(root).toHaveAttribute('data-theme', 'light')

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Dark' }).click()

    await expect(root).toHaveAttribute('data-theme', 'dark')
    await expect(root).toHaveClass(/dark/)
    await expect(page).toHaveScreenshot('theme-dark.png')
  })
})
