const { chromium } = require('playwright')
const path = require('path')

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const out = 'C:/Users/whitebook/Doubao/chats/2026-10-24/new-chat-3/app-shots'
  await page.screenshot({ path: path.join(out, 'shell-home.png') })
  // 推荐板块
  await page.locator('section#recommend').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'shell-recommend.png') })
  // 空间板块
  await page.locator('section#space').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'shell-space.png') })
  await browser.close()
  console.log('SHOTS_OK')
}
main().catch((e) => { console.error(e); process.exit(1) })
