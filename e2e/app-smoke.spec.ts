import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const E2E_API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'https://baby-care.chuhaibox.com'
const E2E_ADMIN_API_KEY = process.env.E2E_ADMIN_API_KEY

function buildPhone(seed: number): string {
  return `13${String(seed).slice(-9)}`
}

async function createInviteCode(request: APIRequestContext): Promise<string> {
  if (!E2E_ADMIN_API_KEY) {
    throw new Error('Missing E2E_ADMIN_API_KEY')
  }

  const response = await request.post(`${E2E_API_BASE_URL}/v1/admin/invites`, {
    headers: {
      'x-admin-key': E2E_ADMIN_API_KEY,
      'content-type': 'application/json',
    },
    data: { count: 1 },
  })

  expect(response.ok(), `Create invite failed: ${response.status()}`).toBeTruthy()
  const payload = (await response.json()) as { codes?: string[] }
  const code = payload.codes?.[0]
  expect(code).toBeTruthy()
  return code!
}

async function registerAndBindInvite(
  page: Page,
  params: { phone: string; password: string; nickname: string; inviteCode: string },
): Promise<void> {
  await page.goto('/#/auth/register?next=%2Fhistory')
  await expect(page.getByRole('heading', { name: '注册 BabyCare' })).toBeVisible()

  await page.getByLabel('昵称（可选）').fill(params.nickname)
  await page.getByLabel('手机号').fill(params.phone)
  await page.getByLabel('密码').fill(params.password)
  await page.getByRole('button', { name: '注册并继续' }).click()

  await expect(page.getByRole('heading', { name: '输入邀请码解锁完整功能' })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByLabel('邀请码').fill(params.inviteCode)
  await page.getByRole('button', { name: '验证并继续' }).click()
  await expect(page.getByRole('heading', { name: '记录' })).toBeVisible({ timeout: 30_000 })
}

async function logoutFromSettings(page: Page): Promise<void> {
  await navigateInApp(page, '/settings')
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible()
  await page.getByRole('button', { name: '退出登录' }).click()
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
}

async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.location.hash = target
  }, `#${path}`)
}

async function loginWithPassword(page: Page, phone: string, password: string): Promise<void> {
  await page.goto('/#/auth/login?next=%2Fhistory')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await page.getByLabel('手机号').fill(phone)
  await page.getByLabel('密码').fill(password)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '记录' })).toBeVisible({ timeout: 30_000 })
}

test('full e2e journey: onboarding -> auth+invite -> tools -> account isolation', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)
  test.skip(!E2E_ADMIN_API_KEY, 'Missing E2E_ADMIN_API_KEY for invite creation')

  const baseSeed = Date.now()
  const password = 'BabyCare#2026'

  const userA = {
    phone: buildPhone(baseSeed),
    password,
    nickname: 'E2E妈妈A',
    inviteCode: await createInviteCode(request),
  }

  const userB = {
    phone: buildPhone(baseSeed + 1),
    password,
    nickname: 'E2E妈妈B',
    inviteCode: await createInviteCode(request),
  }

  await test.step('onboarding and auth guard redirect', async () => {
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: '欢迎来到宝宝助手' })).toBeVisible()
    await page.getByRole('button', { name: '跳过' }).click()
    await expect(page.getByRole('heading', { name: '宝宝助手' })).toBeVisible()

    await page.goto('/#/history')
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  })

  await test.step('register and bind invite for user A', async () => {
    await registerAndBindInvite(page, userA)
  })

  await test.step('user A records feeding and kick sessions, and opens reminder center', async () => {
    await navigateInApp(page, '/tools/feeding-log')
    await expect(page.getByRole('heading', { name: '喂奶记录' })).toBeVisible()
    await page.getByRole('button', { name: '奶瓶' }).click()
    await expect(page.getByRole('heading', { name: '奶瓶喂养' })).toBeVisible()
    await page.getByRole('button', { name: '记录完成' }).click()
    await expect(page.getByText('60ml').first()).toBeVisible()

    await page.getByRole('button', { name: '← 返回' }).click()
    await expect(page.getByRole('heading', { name: '宝宝助手' })).toBeVisible()
    await page.locator('button:has-text("数胎动")').first().click()
    await expect(page.getByRole('heading', { name: '数胎动' })).toBeVisible()
    const startButton = page.locator('button:has-text("开始数胎动")').first()
    if ((await startButton.count()) > 0) {
      await startButton.click()
      await expect(page.getByText('随时离开，稍后继续')).toBeVisible()
      await page.getByRole('button', { name: '← 返回' }).click()
      await expect(page.getByRole('button', { name: /继续记录/ })).toBeVisible()
    } else {
      await expect(page.getByText('随时离开，稍后继续')).toBeVisible()
      await page.getByRole('button', { name: '← 返回' }).click()
      await expect(page.getByRole('heading', { name: '数胎动' })).toBeVisible()
    }

    await navigateInApp(page, '/tools/reminders')
    await expect(page.getByRole('heading', { name: '提醒中心' })).toBeVisible()
    await expect(page.getByRole('button', { name: '请求通知权限' })).toBeVisible()
  })

  await test.step('switch to user B and verify data isolation', async () => {
    await logoutFromSettings(page)
    await registerAndBindInvite(page, userB)

    await navigateInApp(page, '/tools/feeding-log')
    await expect(page.getByRole('heading', { name: '喂奶记录' })).toBeVisible()
    await expect(page.getByText('今天还没有喂奶记录')).toBeVisible()
    await expect(page.getByText('60ml')).toHaveCount(0)
  })

  await test.step('login back user A and verify own data retained', async () => {
    await logoutFromSettings(page)
    await loginWithPassword(page, userA.phone, userA.password)

    await navigateInApp(page, '/tools/feeding-log')
    await expect(page.getByRole('heading', { name: '喂奶记录' })).toBeVisible()
    await expect(page.getByText('60ml').first()).toBeVisible()
  })
})
