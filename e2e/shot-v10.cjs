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
      const btn = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes(tt))
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, t)
  const out = (n) => path.join('app-shots', n)
  // 规划一条并加入待出行
  await click('开始规划行程')
  await p.waitForTimeout(500)
  await p.locator('input[type="date"]').fill('2026-11-03')
  await p.waitForTimeout(200)
  await click('选一个最终目的地')
  await click('广安·华蓥山')
  await p.waitForTimeout(200)
  await click('加入待出行')
  await p.waitForTimeout(700)
  // 加入后自动展开并滚动到列表
  await p.screenshot({ path: out('v10-upcoming-open.png') })
  // reload 后默认折叠
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await p.screenshot({ path: out('v10-upcoming-folded.png') })
  // 点击折叠入口展开（自动滚动）
  await click('你有 1 条待出行规划')
  await p.waitForTimeout(700)
  await p.screenshot({ path: out('v10-upcoming-tap.png') })
  await b.close()
  console.log('done')
})()
