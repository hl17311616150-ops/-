const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const out = 'C:/Users/whitebook/Doubao/chats/2026-10-24/new-chat-3/app-shots'
fs.mkdirSync(out, { recursive: true })

const routes = [
  ['home', '/', 390, 844],
  ['recommend', '/recommend', 390, 844],
  ['trip', '/trip', 390, 844],
  ['space', '/space', 390, 844],
  ['destination', '/destination/dest_huaying', 390, 844],
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  for (const [name, route, w, h] of routes) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false })
    console.log('shot', name)
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
