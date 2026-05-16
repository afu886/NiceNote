import { expect, test } from '../fixtures/seed'

test.describe('Note CRUD', () => {
  test('seeded notes render and select shows editor', async ({ seededPage: page }) => {
    await expect(page.getByText('Welcome Note')).toBeVisible()
    await expect(page.getByText('Project Ideas')).toBeVisible()
    await expect(page.getByText('Meeting minutes')).toBeVisible()

    await page.getByText('Project Ideas').click()
    await expect(page.locator('.nn-editor-shell, [contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page).toHaveScreenshot('note-selected.png')
  })

  test('create a new note grows the list', async ({ seededPage: page }) => {
    const before = await page.getByRole('listitem').count()
    await page.getByRole('button', { name: 'New note' }).first().click()
    await expect.poll(async () => page.getByRole('listitem').count()).toBeGreaterThan(before)
  })

  test('delete a note shrinks the list', async ({ seededPage: page }) => {
    const before = await page.getByRole('listitem').count()
    const row = page.getByRole('listitem').filter({ hasText: 'Meeting minutes' })
    await row.hover()
    await row.getByRole('button', { name: /Delete note/ }).click()
    await expect.poll(async () => page.getByRole('listitem').count()).toBeLessThan(before)
  })
})
