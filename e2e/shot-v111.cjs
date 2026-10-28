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
  const nav = (label) =>
    p.evaluate((l) => {
      const b = document.querySelector(`nav button[aria-label="${l}"]`)
      if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, label)
  const esc = () => p.keyboard.press('Escape')
  const out = (n) => path.join('app-shots', n)

  // 1. 品牌空态（满屏固定）
  await p.screenshot({ path: out('v111-brand-empty.png') })

  // 规划并加入待出行
  await click('开始规划行程')
  await p.waitForTimeout(450)
  await p.locator('input[type="date"]').fill('2026-11-03')
  await p.waitForTimeout(150)
  await click('选一个最终目的地')
  await p.waitForTimeout(350)
  await click('广安·华蓥山')
  await p.waitForTimeout(350)
  await click('加一个途经点')
  await p.waitForTimeout(350)
  await click('四川·成都')
  await p.waitForTimeout(400)
  await esc() // 关闭途经点选择面板
  await p.waitForTimeout(350)
  await click('加入待出行')
  await p.waitForTimeout(450)
  // 待出行面板加入后自动打开，先关掉看悬浮入口
  await esc()
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-upcoming-entry.png') })
  // 点开悬浮入口 → 半屏面板
  await click('你有 1 条待出行规划')
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-upcoming-sheet.png') })
  await esc()
  await p.waitForTimeout(400)

  // 2. 推荐详情半屏
  await nav('推荐')
  await p.waitForTimeout(500)
  await click('华蓥山')
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-recommend-detail.png') })
  await esc()
  await p.waitForTimeout(300)

  // 3. 全新规划 → 选点面板（搜索）
  await p.evaluate(() => localStorage.clear())
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(300)
  await click('开始规划行程')
  await p.waitForTimeout(450)
  await click('选一个最终目的地')
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-picker.png') })
  await esc()
  await p.waitForTimeout(300)

  // 4. 填好出发 → 路线节点详情半屏
  await p.locator('input[type="date"]').fill('2026-11-03')
  await p.waitForTimeout(150)
  await click('选一个最终目的地')
  await p.waitForTimeout(350)
  await click('广安·华蓥山')
  await p.waitForTimeout(350)
  await click('加一个途经点')
  await p.waitForTimeout(350)
  await click('四川·成都')
  await p.waitForTimeout(300)
  await esc()
  await p.waitForTimeout(350)
  await click('出发，看路线')
  await p.waitForTimeout(500)
  await p.locator('svg g[role="button"][aria-label*="华蓥山"]').evaluate((el) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-node-detail.png') })
  await esc()
  await p.waitForTimeout(300)

  // 5. 更改路线加高面板
  await click('更改路线')
  await p.waitForTimeout(450)
  await p.screenshot({ path: out('v111-route-edit.png') })

  await b.close()
  console.log('done')
})()
