const { chromium } = require('@playwright/test')
const path = require('path')

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  const click = (t) =>
    p.evaluate((tt) => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes(tt))
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, t)
  const out = (n) => path.join('app-shots', n)
  // 品牌页
  await p.screenshot({ path: out('v18-brand.png') })
  // 规划页
  await click('开始规划行程')
  await p.waitForTimeout(500)
  await p.locator('input[type="date"]').fill('2026-11-03')
  await p.waitForTimeout(200)
  await click('选一个最终目的地')
  await click('广安·华蓥山')
  await p.waitForTimeout(200)
  await click('加一个途经点')
  await click('四川·成都')
  await p.waitForTimeout(200)
  await click('四川·峨眉山')
  await p.waitForTimeout(300)
  await p.screenshot({ path: out('v18-plan.png') })
  // 路线页（示意图）
  await click('出发，看路线')
  await p.waitForTimeout(500)
  await p.screenshot({ path: out('v18-route.png') })
  // 点华蓥山节点看详情
  await p
    .locator('svg g[role="button"][aria-label*="华蓥山"]')
    .evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await p.waitForTimeout(400)
  await p.screenshot({ path: out('v18-route-detail.png') })
  await b.close()
  console.log('done')
})()
