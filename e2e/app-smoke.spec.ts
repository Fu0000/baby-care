import { expect, test } from '@playwright/test'

test('can start a kick session and resume it from kick home', async ({ page }) => {
  await page.goto('/#/')

  await expect(page.getByRole('heading', { name: '宝宝助手' })).toBeVisible()
  await page.locator('button:has-text("数胎动")').first().click()
  await expect(page.getByRole('heading', { name: '数胎动' })).toBeVisible()

  await page.getByRole('button', { name: /开始数胎动/ }).click()
  await expect(page.getByText('随时离开，稍后继续')).toBeVisible()

  await page.getByRole('button', { name: '← 返回' }).click()
  await expect(page.getByRole('button', { name: /继续记录/ })).toBeVisible()
})

test('can add a bottle feeding record from feeding flow', async ({ page }) => {
  await page.goto('/#/tools/feeding-log')

  await expect(page.getByRole('heading', { name: '喂奶记录' })).toBeVisible()
  await page.getByRole('button', { name: '奶瓶' }).click()

  await expect(page.getByRole('heading', { name: '奶瓶喂养' })).toBeVisible()
  await page.getByRole('button', { name: '记录完成' }).click()

  await expect(page.getByRole('heading', { name: '喂奶记录' })).toBeVisible()
  await expect(page.locator('text=60ml').first()).toBeVisible()
})
