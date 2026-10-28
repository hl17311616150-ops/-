const { chromium } = require('playwright')
const path = require('path')
const out = 'C:/Users/whitebook/Doubao/chats/2026-10-24/new-chat-3/app-shots'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)

  const click = (t) =>
    page.evaluate((text) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const b = btns.find((x) => (x.textContent || '').includes(text))
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return !!b
    }, t)

  // 滚到推荐
  await page.locator('section#recommend').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  // 点华蓥山卡片
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
    const b = btns.find((x) => (x.textContent || '').includes('华蓥山') && (x.textContent || '').includes('山岳型'))
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'rec-detail.png') })
  // 加入行程
  await click('加入行程')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'rec-joined.png') })
  // 滚回首页看行程第1天
  await page.locator('section#home').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'rec-home-trip.png') })
  await browser.close()
  console.log('REC_OK')
}
main().catch((e) => { console.error(e); process.exit(1) })
