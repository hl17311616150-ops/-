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
  await p.screenshot({ path: out('v19-brand-empty.png') })
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
  await p.screenshot({ path: out('v19-plan.png') })
  // 返回品牌 → 双按钮
  await p.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await p.waitForTimeout(400)
  await p.screenshot({ path: out('v19-brand-hasdraft.png') })
  // 继续行程→规划→出发进路线
  await click('继续行程')
  await p.waitForTimeout(400)
  await click('出发，看路线')
  await p.waitForTimeout(400)
  await p.screenshot({ path: out('v19-route.png') })
  // 内联编辑路线
  await click('更改路线')
  await p.waitForTimeout(300)
  await p.screenshot({ path: out('v19-route-edit.png') })
  await b.close()
  console.log('done')
})()
