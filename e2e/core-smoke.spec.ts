import { expect, test } from '@playwright/test'

test('core smoke: onboarding and auth guard flow', async ({ page }) => {
  await page.goto('/#/')

  await expect(page.getByRole('heading', { name: '欢迎来到宝宝助手' })).toBeVisible()
  await page.getByRole('button', { name: '跳过' }).click()

  await expect(page.getByRole('heading', { name: '宝宝助手' })).toBeVisible()

  await page.goto('/#/history')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible()

  await page.goto('/#/auth/register')
  await expect(page.getByRole('heading', { name: '注册 BabyCare' })).toBeVisible()
})
