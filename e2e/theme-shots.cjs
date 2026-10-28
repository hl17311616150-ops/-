const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const out = 'C:/Users/whitebook/Doubao/chats/2026-10-24/new-chat-3/app-shots'

  // 森林（默认）
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/theme-forest-home.png`, fullPage: true })

  // 海洋
  await page.addInitScript(() => localStorage.setItem('travel:v1:theme', 'ocean'))
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/theme-ocean-home.png`, fullPage: true })

  // 空间：主题切换 + 壁纸设置区
  await page.goto('http://localhost:5173/space', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/theme-space.png`, fullPage: true })

  await browser.close()
  console.log('OK')
})()
