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

  const click = (text) =>
    page.evaluate((t) => {
      const btns = Array.from(document.querySelectorAll('button'))
      const b = btns.find((x) => (x.textContent || '').includes(t))
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return !!b
    }, text)

  // 1. 整页品牌
  await page.screenshot({ path: path.join(out, 'flow-brand.png') })

  // 2. 开始规划 → 3. 加第一天 → 4. 加一个点选华蓥山
  await click('开始规划行程')
  await page.waitForTimeout(500)
  await click('加第一天')
  await page.waitForTimeout(300)
  await click('加一个点')
  await page.waitForTimeout(200)
  await click('华蓥山')
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'flow-trip.png') })

  // 5. 准备出发
  await click('准备出发')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'flow-prep.png') })

  // 6. 勾选全部准备项 → 万事俱备
  const n = await page.locator('button[aria-label="勾选完成"]').count()
  for (let i = 0; i < n; i++) {
    await page.evaluate((idx) => {
      const btns = Array.from(document.querySelectorAll('button[aria-label="勾选完成"]'))
      if (btns[idx]) btns[idx].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, i)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(out, 'flow-ready.png') })

  // 7. 加入待出行
  await click('加入待出行')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'flow-upcoming.png') })

  // 8. 待出行 继续规划
  await click('继续规划')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'flow-continue.png') })

  await browser.close()
  console.log('FLOW_OK')
}
main().catch((e) => { console.error(e); process.exit(1) })
