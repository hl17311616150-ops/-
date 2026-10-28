import { expect, test, type Page } from '@playwright/test'

// v1.8 验收：总路线模型（出发日期+总天数+出发点+目的地+途经点）→ 规划页完成准备 → 出发进路线页（手账示意图+点详情）。
// 每个测试用全新浏览器上下文 → 独立 localStorage（arch-test-isolation）。
// 点击统一用 dispatchEvent 派发原生 click（与 React onClick 委托等价），避免动画期的 actionability 拦截。

async function clickText(page: Page, text: string) {
  await page.evaluate((t) => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes(t))
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, text)
  await page.waitForTimeout(150)
}

async function switchTo(page: Page, label: string) {
  await page.evaluate((l) => {
    const b = Array.from(document.querySelectorAll('nav button')).find((x) => x.getAttribute('aria-label') === l)
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, label)
  await page.waitForTimeout(380)
}

async function fresh(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
}

async function startPlanning(page: Page) {
  await clickText(page, '开始规划行程')
  await page.waitForTimeout(400)
}

async function setDate(page: Page, d = '2026-11-03') {
  await page.locator('input[type="date"]').fill(d)
  await page.waitForTimeout(150)
}

async function pickDestination(page: Page, name: string) {
  await clickText(page, '选一个最终目的地')
  await clickText(page, name)
  await page.waitForTimeout(150)
}

async function addWaypoint(page: Page, name: string) {
  await clickText(page, '加一个途经点')
  await clickText(page, name)
  await page.waitForTimeout(150)
}

async function planRoute(page: Page) {
  await startPlanning(page)
  await setDate(page)
  await pickDestination(page, '广安·华蓥山')
  await addWaypoint(page, '四川·成都')
}

test('验收1：打开即旅游规划，无广告位，整页品牌区', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  expect(await page.getByText(/广告|推广/).count()).toBe(0)
})

test('验收2：一次显示一页 + 右侧四按钮可切换页面', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  expect(await page.locator('nav button').count()).toBe(5)
  await expect(page.getByRole('button', { name: /回到上一页/ })).toBeAttached()
  await switchTo(page, '推荐')
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toHaveCount(0)
  await switchTo(page, '空间')
  await expect(page.getByText('走过的足迹')).toBeVisible()
  await switchTo(page, '社区')
  await expect(page.getByText(/社区（示例演示/)).toBeVisible()
})

test('验收3：点"开始规划行程"进入规划页（字段表单）', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await expect(page.getByText('出发日期', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /加一个途经点/ })).toBeVisible()
})

test('验收4：可排总路线（日期/天数/出发点/目的地/途经点）', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page)
  // 出发点自动填（模拟定位广安）
  await expect(page.locator('input[list="start-cities"]')).toHaveValue('广安')
  await pickDestination(page, '广安·华蓥山')
  await addWaypoint(page, '四川·成都')
  await expect(page.getByText('广安·华蓥山', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('四川·成都', { exact: true }).first()).toBeVisible()
  // 可出发
  await expect(page.getByRole('button', { name: /出发，看路线/ })).toBeVisible()
})

test('验收5：准备清单自动生成（季节按出发日期）+ 可手动加', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  // 出发日期 11 月 → 按 11 月气候生成（当前月是 10 月，若仍按当前月则无"羽绒"）
  await setDate(page, '2026-11-15')
  await pickDestination(page, '广安·华蓥山')
  await expect(page.getByText(/羽绒/)).toBeVisible()
  await page.getByPlaceholder(/自己再加一件/).fill('记得带充电宝')
  await page.evaluate(() => {
    const form = document.querySelector('form')
    if (form) form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  })
  await expect(page.getByText('记得带充电宝')).toBeVisible()
})

test('验收6：全部勾选→万事俱备，现在就出发', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page)
  await pickDestination(page, '广安·华蓥山')
  const n = await page.locator('button[aria-label="勾选完成"]').count()
  for (let i = 0; i < n; i++) {
    await page.evaluate((idx) => {
      const btns = Array.from(document.querySelectorAll('button[aria-label="勾选完成"]'))
      if (btns[idx]) btns[idx].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, i)
  }
  await expect(page.getByText('万事俱备，现在就出发')).toBeVisible()
})

test('验收7：加入待出行→清空回品牌区，待出行清单出现', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '加入待出行')
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  // 待出行以折叠入口出现；加入后自动展开，可见"继续规划"
  await expect(page.getByText(/你有 1 条待出行规划/)).toBeVisible()
  await expect(page.getByRole('button', { name: /继续规划/ })).toBeVisible()
})

test('验收8：刷新/重开数据不丢（待出行持久化）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '加入待出行')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  // 持久化：reload 后折叠入口仍在（默认收起），点开后见"继续规划"
  await expect(page.getByText(/你有 1 条待出行规划/)).toBeVisible()
  await page.getByText(/你有 1 条待出行规划/).dispatchEvent('click')
  await page.waitForTimeout(200)
  await expect(page.getByRole('button', { name: /继续规划/ })).toBeVisible()
})

test('验收9：推荐页点卡片→详情面板→加入路线→切回首页见目的地', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '推荐')
  // 摘要页：若华蓥山在前 3 则直接点；否则从"查看全部"面板点（不依赖排序）
  await clickText(page, '查看全部目的地')
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) =>
      (x.textContent || '').includes('华蓥山'),
    )
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  await expect(page.getByRole('button', { name: /加入路线/ })).toBeVisible()
  await clickText(page, '加入路线')
  await expect(page.getByText(/已加入路线/)).toBeVisible()
  await switchTo(page, '首页')
  await clickText(page, '开始规划行程')
  await page.waitForTimeout(300)
  await expect(page.getByText('广安·华蓥山', { exact: true }).first()).toBeVisible()
})

test('验收10：首页"去推荐看看吧"切到推荐页', async ({ page }) => {
  await fresh(page)
  await page.getByRole('button', { name: /去推荐看看吧/ }).first().click()
  await page.waitForTimeout(400)
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
})

test('验收11：空间页三个独立入口（足迹/照片/主题），各自进二级页可操作', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '空间')
  // 主页三个入口卡
  await expect(page.getByText('走过的足迹')).toBeVisible()
  await expect(page.getByText('照片墙')).toBeVisible()
  await expect(page.getByText('主题', { exact: true })).toBeVisible()
  // 点"走过的足迹"入口 → 进足迹二级页（上拉面板）
  await clickText(page, '走过的足迹')
  await expect(page.getByRole('dialog', { name: /走过的足迹/ })).toBeVisible()
  // 标记去过可操作：点"广安·华蓥山"按钮后进入已标记态（border-leaf）
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('广安·华蓥山'))
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(200)
  const marked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('广安·华蓥山'))
    return b ? b.className.includes('border-leaf') : false
  })
  expect(marked).toBe(true)
})

test('验收11b：推荐主页一屏不可滚，查看全部面板内滚动+详情再叠', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '推荐')
  // 主页一屏不可滚
  const homeScroll = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="当前页面"]') as HTMLElement
    return el.scrollHeight > el.clientHeight
  })
  expect(homeScroll).toBe(false)
  // 打开查看全部面板 → 面板正文可滚动
  await clickText(page, '查看全部目的地')
  await expect(page.getByRole('dialog', { name: /本月全部目的地/ })).toBeVisible()
  const panelScroll = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')
    const b = d?.querySelector('div.overflow-y-auto') as HTMLElement | null
    return b ? b.scrollHeight > b.clientHeight : false
  })
  expect(panelScroll).toBe(true)
  // 面板内点卡片 → 再叠详情（半屏），见加入路线
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) =>
      (x.textContent || '').includes('华蓥山'),
    )
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('button', { name: /加入路线/ })).toBeVisible()
})

test('验收12：响应式（窄屏）无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await fresh(page)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})

test('验收14：出发→进入路线页（手账示意图），待出行条目移除', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '加入待出行')
  await expect(page.getByRole('button', { name: /继续规划/ })).toBeVisible()
  // 待出行点"出发"：进入路线页（示意图），并从待出行移除
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="出发"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  await expect(page.getByRole('img', { name: /总路线手账示意图/ })).toBeVisible()
  await expect(page.locator('button[aria-label="出发"]')).toHaveCount(0)
})

test('验收15：路线页点节点→显示该点天气与值得玩的景点', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 点华蓥山节点（destination）
  await page.locator('svg g[role="button"][aria-label*="华蓥山"]').evaluate((el) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
  await expect(page.getByText('值得玩的景点', { exact: true })).toBeVisible()
  // 显示按出发日期（11月）气候
  await expect(page.getByText(/11 月/)).toBeVisible()
})

test('验收16：返回=层级返回（route→plan→brand，草稿保留）', async ({ page }) => {
  await fresh(page)
  // 品牌页一级：返回禁用
  await expect(page.getByRole('button', { name: /回到上一页/ })).toBeDisabled()
  // 进入规划（二级）
  await startPlanning(page)
  await expect(page.getByRole('button', { name: /回到上一页/ })).toBeEnabled()
  // 加草稿（目的地）
  await setDate(page)
  await pickDestination(page, '广安·华蓥山')
  // 返回 → 收起规划回品牌页，草稿保留
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /继续行程/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /回到上一页/ })).toBeDisabled()
  // 再进规划，目的地还在
  await clickText(page, '继续行程')
  await page.waitForTimeout(300)
  await expect(page.getByText('广安·华蓥山', { exact: true }).first()).toBeVisible()
  // 出发进路线页（已出发），返回直接回品牌页（不回规划页）
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  // 品牌页显示"继续行程"（已出发；不回规划页）
  await expect(page.getByRole('button', { name: /继续行程/ })).toBeVisible()
  // 点"继续行程"回路线页
  await clickText(page, '继续行程')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
})

test('验收17：二级页面（规划/路线）禁止滑动切到其他主页面', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await expect(page.getByText('规划这趟出发')).toBeVisible()
  // 二级：滚轮向下不应切到推荐
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="当前页面"]')
    if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByText('规划这趟出发')).toBeVisible()
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toHaveCount(0)
  // 返回主页面后可正常滑动切页
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="当前页面"]')
    if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
})

test('验收17b：二级页可点导航切走、切回停在原视图（规划→推荐→回规划）', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page)
  await pickDestination(page, '广安·华蓥山')
  await expect(page.getByText('规划这趟出发')).toBeVisible()
  // 二级页：导航键可点击切到推荐（此前被禁用）
  await switchTo(page, '推荐')
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
  // 切回首页：应停在规划页（草稿+视图记忆），不是品牌页
  await switchTo(page, '首页')
  await expect(page.getByText('规划这趟出发')).toBeVisible()
  await expect(page.getByText('广安·华蓥山', { exact: true }).first()).toBeVisible()
})

test('验收17c：点"开始规划行程"后切走、切回停在规划页（无需填草稿）', async ({ page }) => {
  await fresh(page)
  // 点"开始规划行程"，不填任何字段（无草稿）
  await startPlanning(page)
  await expect(page.getByText('规划这趟出发')).toBeVisible()
  // 切到推荐再切回，应仍停在规划页（点击即视为规划中，不因无草稿回品牌页）
  await switchTo(page, '推荐')
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
  await switchTo(page, '首页')
  await expect(page.getByText('规划这趟出发')).toBeVisible()
})

test('验收15b：滑动切页（滚轮滚到边界切页）', async ({ page }) => {
  await fresh(page)
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="当前页面"]')
    if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('heading', { name: '本月去哪儿' })).toBeVisible()
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="当前页面"]')
    if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true, cancelable: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
})

test('验收13：板块顺序可持久化（右侧按钮顺序=注入顺序）', async ({ page }) => {
  await fresh(page)
  await page.evaluate(() => {
    localStorage.setItem('travel:v1:section-order', JSON.stringify(['home', 'space', 'recommend']))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav button'))
      .map((b) => b.getAttribute('aria-label'))
      .filter((l): l is string => !!l && l !== '回到上一页'),
  )
  expect(labels).toEqual(['首页', '空间', '推荐', '社区'])
})

test('验收18：删除当前行程（二次确认防误触）', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  // 返回品牌页（草稿保留）
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /继续行程/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /删除当前行程/ })).toBeVisible()
  // 点删除 → 弹确认层
  await clickText(page, '删除当前行程')
  await page.waitForTimeout(200)
  await expect(page.getByText('确定删除当前行程？')).toBeVisible()
  // 取消 → 保留行程
  await clickText(page, '取消')
  await page.waitForTimeout(200)
  await expect(page.getByText('确定删除当前行程？')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /继续行程/ })).toBeVisible()
  // 再删除 → 确认删除 → 清空
  await clickText(page, '删除当前行程')
  await page.waitForTimeout(200)
  await clickText(page, '确认删除')
  await page.waitForTimeout(300)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
})

test('验收19：品牌双按钮(继续行程/新的规划)+规划页清空+路线页内联改路线', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  // 返回品牌 → 双按钮（继续行程 + 新的规划）
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /继续行程/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /新的规划/ })).toBeVisible()
  // 新的规划 → 空白规划页（下一次规划）
  await clickText(page, '新的规划')
  await page.waitForTimeout(300)
  await expect(page.getByText('选一个最终目的地')).toBeVisible()
  // 规划页清空：填目的地后再清空
  await pickDestination(page, '广安·华蓥山')
  await expect(page.getByText('广安·华蓥山', { exact: true }).first()).toBeVisible()
  await clickText(page, '清空')
  await page.waitForTimeout(200)
  await expect(page.getByText('确定清空当前规划？')).toBeVisible()
  await clickText(page, '确认清空')
  await page.waitForTimeout(300)
  await expect(page.getByText('选一个最终目的地')).toBeVisible()
  // 重新填并出发进路线页
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 路线页"更改路线"→ 加高上拉面板（不跳回规划页、不撑动主页）
  await clickText(page, '更改路线')
  await page.waitForTimeout(350)
  await expect(page.getByRole('dialog', { name: '更改路线' })).toBeVisible()
  await expect(page.getByText('改动即时生效')).toBeVisible()
  // 完成 → 收起面板回到示意图（在更改路线面板内精确匹配，避免误点主视图"已完成出行"）
  await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"][aria-label="更改路线"]')
    const b = d ? Array.from(d.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === '完成') : null
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(350)
  await expect(page.getByRole('dialog', { name: '更改路线' })).toHaveCount(0)
  await expect(page.getByText('点每个节点，查看这个点的天气与值得玩的景点')).toBeVisible()
})

test('验收20：出发按钮常驻+缺失提示；待出行可删除；路线页可删除当前路线', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  // 出发按钮常驻：未填四要素时也可见，并提示还差什么
  await expect(page.getByRole('button', { name: /出发，看路线/ })).toBeVisible()
  await expect(page.getByText(/还差：.*出发日期/)).toBeVisible()
  // 填齐日期+目的地后提示消失
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  await expect(page.getByText(/还差/)).toHaveCount(0)
  // 加入待出行 → 回品牌，折叠入口出现并自动展开
  await clickText(page, '加入待出行')
  await page.waitForTimeout(300)
  await expect(page.getByText(/你有 1 条待出行规划/)).toBeVisible()
  // 待出行池删除该条（二次确认）
  await page.getByRole('button', { name: /删除待出行/ }).dispatchEvent('click')
  await page.waitForTimeout(200)
  await expect(page.getByText('确定删除这条待出行规划？')).toBeVisible()
  await clickText(page, '确认删除')
  await page.waitForTimeout(300)
  await expect(page.getByText(/你有 1 条待出行规划/)).toHaveCount(0)
  // 重新规划 → 出发 → 路线页
  await startPlanning(page)
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 路线页删除当前路线（二次确认）→ 回品牌空态
  await clickText(page, '删除当前路线')
  await page.waitForTimeout(200)
  await expect(page.getByText('确定删除当前行程？')).toBeVisible()
  await clickText(page, '确认删除')
  await page.waitForTimeout(300)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
})

test('验收21：上拉面板打开时锁定背景滚动，Esc 关闭后恢复', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '加入待出行')
  await page.waitForTimeout(350)
  const dialog = page.getByRole('dialog', { name: /待出行/ })
  await expect(dialog).toBeVisible()
  // 面板打开：背景滚动锁定
  expect(await page.evaluate(() => document.body.style.overflow === 'hidden')).toBe(true)
  // Esc 关闭
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await expect(page.getByRole('dialog', { name: /待出行/ })).toHaveCount(0)
  // 面板关闭：背景滚动恢复
  expect(await page.evaluate(() => document.body.style.overflow !== 'hidden')).toBe(true)
})

test('验收22：路线页点已完成出行→存足迹（只读回顾），当前行程清空回品牌页', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 点"已完成出行" → 确认对话框
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('已完成出行'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('alertdialog', { name: /已完成出行/ })).toBeVisible()
  // 确认 → 存入足迹、清空当前行程、回品牌页
  await clickText(page, '完成并存入足迹')
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  // 归档落地：travel:v1:trips 有且仅有一条 departed=true
  const trips = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trips') || '[]'))
  expect(trips.length).toBe(1)
  expect(trips[0].departed).toBe(true)
  // 空间 → 足迹二级页：出现"已出发的行程"只读回顾，含路线节点
  await switchTo(page, '空间')
  await clickText(page, '走过的足迹')
  await page.waitForTimeout(300)
  await expect(page.getByText('已出发的行程')).toBeVisible()
  // 只读回顾卡：出发点 → 途经点 → 目的地
  await expect(page.getByText('广安 → 四川·成都 → 广安·华蓥山')).toBeVisible()
})

// ---------- v1.14：路线日记 + 相册库 ----------
const TEST_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

test('验收23：路线页路线日记：记录→编辑→删除', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 打开路线日记面板
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  // 记一条文字
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('登顶华蓥山，云雾缭绕')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await expect(page.getByText('登顶华蓥山，云雾缭绕')).toBeVisible()
  // 编辑
  await clickText(page, '编辑')
  await page.locator('textarea[placeholder="写点什么…"]').fill('改：晚霞特别美')
  await clickText(page, '保存')
  await page.waitForTimeout(200)
  await expect(page.getByText('改：晚霞特别美')).toBeVisible()
  // 删除（精确匹配日记删除按钮，避免误命中主视图"删除当前路线"）
  await page.getByRole('button', { name: /删除这条日记/ }).dispatchEvent('click')
  await page.waitForTimeout(200)
  await expect(page.getByText('改：晚霞特别美')).not.toBeVisible()
  // 进行中行程日记已持久化到 active trip（travel:v1:trip）
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trip') || '{}'))
  expect(Array.isArray(active.diary)).toBe(true)
  expect(active.diary.length).toBe(0)
})

test('验收23b：路线日记插照片→完成出行→足迹点开回顾→续写日记', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 打开路线日记并插一张照片（进相册库）
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'dashan.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TEST_PNG, 'base64'),
  })
  await page.waitForTimeout(800)
  await expect(page.getByRole('dialog').locator('img').first()).toBeVisible()
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('配上华蓥山云海照')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  // 完成出行 → 存足迹（含日记与照片引用）
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('已完成出行'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('alertdialog', { name: /已完成出行/ })).toBeVisible()
  await clickText(page, '完成并存入足迹')
  await page.waitForTimeout(400)
  // 归档含日记
  const trips = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trips') || '[]'))
  expect(trips.length).toBe(1)
  expect(trips[0].diary.length).toBe(1)
  expect(trips[0].diary[0].photoIds.length).toBe(1)
  expect(trips[0].departedAt).toBeGreaterThan(0)
  // 足迹点开回顾 → 日记可见，且可继续编辑（归档后仍可编辑）
  await switchTo(page, '空间')
  await clickText(page, '走过的足迹')
  await page.waitForTimeout(300)
  await clickText(page, '广安 → 四川·成都 → 广安·华蓥山')
  await page.waitForTimeout(300)
  await expect(page.getByText('配上华蓥山云海照')).toBeVisible()
  // 续写
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('回来补一句：还想去第二次')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await expect(page.getByText('回来补一句：还想去第二次')).toBeVisible()
  // 归档更新已持久化
  const trips2 = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trips') || '[]'))
  expect(trips2[0].diary.length).toBe(2)
})

test('验收23c：照片墙展示最近一次已出发行程的照片', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  // 空间 → 照片墙：加一张照片（入库关联最近行程）
  await switchTo(page, '空间')
  await clickText(page, '照片墙')
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog', { name: /照片墙/ })).toBeVisible()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mountain.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TEST_PNG, 'base64'),
  })
  await page.waitForTimeout(900)
  // 最近行程标签可见，照片展示
  await expect(page.getByText(/最近出行/)).toBeVisible()
  await expect(page.getByRole('dialog', { name: /照片墙/ }).locator('img')).toHaveCount(1)
  // 入口副标题照片数同步
  await expect(page.getByText('1 张照片')).toBeVisible()
})

// ---------- v1.15：日记多照片 + 足迹回收站 + 分享快照地基 ----------
test('验收24：日记追加区一次多选+编辑态追加/移除照片（无确认），相册库照片保留', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  const pick = (name: string) => ({ name, mimeType: 'image/png', buffer: Buffer.from(TEST_PNG, 'base64') })
  // 追加区一次多选两张 → 记下 → 该条目含 2 张
  await page.getByLabel('相册选照片').setInputFiles([pick('a.png'), pick('b.png')])
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('一下传两张')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await expect(page.getByRole('dialog').locator('img')).toHaveCount(2)
  // 编辑 → 编辑态照片行：已有 2 张 + "＋"追加
  await page.getByRole('button', { name: /编辑这条日记/ }).dispatchEvent('click')
  await page.waitForTimeout(200)
  // 追加第三张（无确认，即时生效）
  await page.getByLabel('编辑追加照片').setInputFiles([pick('c.png')])
  await page.waitForTimeout(800)
  await expect(page.getByLabel('追加照片到这条日记')).toBeVisible()
  await expect(page.getByRole('dialog').locator('img')).toHaveCount(3)
  // 移除一张（无确认）→ 该条剩 2 张
  await page.getByRole('button', { name: /移除这张照片/ }).first().dispatchEvent('click')
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog').locator('img')).toHaveCount(2)
  // 保存文字 → 照片引用持久化到 active trip（剩 2 张）
  await clickText(page, '保存')
  await page.waitForTimeout(200)
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trip') || '{}'))
  expect(active.diary.length).toBe(1)
  expect(active.diary[0].photoIds.length).toBe(2)
  // 相册库照片仍在（移除的是引用，照片不级联删）：a+b+c 共 3 张
  const albumCount = await page.evaluate(async () => {
    const req = indexedDB.open('guiye')
    return await new Promise<number>((res) => {
      req.onsuccess = () => {
        const tx = req.result.transaction('album', 'readonly').objectStore('album').count()
        tx.onsuccess = () => res(tx.result)
        tx.onerror = () => res(-1)
      }
      req.onerror = () => res(-1)
    })
  })
  expect(albumCount).toBe(3)
})

test('验收25：足迹删除进回收站→恢复→彻底删除（二次确认）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  // 已完成出行 → 存足迹 1 条
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('已完成出行'))
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('alertdialog', { name: /已完成出行/ })).toBeVisible()
  await clickText(page, '完成并存入足迹')
  await page.waitForTimeout(400)
  // 空间 → 足迹：删除归档卡 → 二次确认 → 移入回收站
  await switchTo(page, '空间')
  await clickText(page, '走过的足迹')
  await page.waitForTimeout(300)
  await expect(page.getByText('广安 → 四川·成都 → 广安·华蓥山')).toBeVisible()
  await page.getByRole('button', { name: /删除这条行程记录/ }).dispatchEvent('click')
  await expect(page.getByRole('alertdialog', { name: '删除这条行程记录？' })).toBeVisible()
  await page.getByRole('alertdialog', { name: '删除这条行程记录？' }).getByRole('button', { name: /^删除$/ }).dispatchEvent('click')
  await page.waitForTimeout(300)
  // 足迹列表消失（归档卡删除按钮不可见），回收站出现该项
  await expect(page.getByRole('button', { name: /删除这条行程记录/ })).not.toBeVisible()
  await expect(page.getByText(/回收站（1）/)).toBeVisible()
  // 恢复 → 回足迹（含原内容）
  await page.getByRole('button', { name: /恢复这条行程/ }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await expect(page.getByText(/回收站/)).not.toBeVisible()
  await expect(page.getByRole('button', { name: /删除这条行程记录/ })).toBeVisible()
  await expect(page.getByText('广安 → 四川·成都 → 广安·华蓥山')).toBeVisible()
  // 再删除 → 回收站 → 彻底删除（二次确认）→ 永久消失
  await page.getByRole('button', { name: /删除这条行程记录/ }).dispatchEvent('click')
  await page.getByRole('alertdialog', { name: '删除这条行程记录？' }).getByRole('button', { name: /^删除$/ }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /彻底删除这条行程/ }).dispatchEvent('click')
  await expect(page.getByRole('alertdialog', { name: '彻底删除这条行程？' })).toBeVisible()
  await page.getByRole('alertdialog', { name: '彻底删除这条行程？' }).getByRole('button', { name: /^彻底删除$/ }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await expect(page.getByText('广安 → 四川·成都 → 广安·华蓥山')).not.toBeVisible()
  await expect(page.getByText(/回收站/)).not.toBeVisible()
  // 数据层核对：trips 与 recycled 都为空
  const trips = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:trips') || '[]'))
  const recycled = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:recycled') || '[]'))
  expect(trips.length).toBe(0)
  expect(recycled.length).toBe(0)
})

test('验收26：社区分享快照导出在浏览器落地 travel:v1:snapshots', async ({ page }) => {
  await fresh(page)
  // 通过 Vite 动态 import 调用库函数，验证真实浏览器环境导出+存储
  const len = await page.evaluate(async () => {
    const { createTrip } = await import('/src/types.ts')
    const { exportTripSnapshot, saveSnapshot, getSnapshots } = await import('/src/lib/snapshot.ts')
    const t = createTrip()
    t.departed = true
    t.departedAt = Date.now()
    t.startPoint = '广安'
    t.waypoints = ['dest_chengdu']
    t.destinationId = 'dest_huaying'
    t.totalDays = 2
    t.diary = [{ id: 'd1', text: '云海', photoIds: ['photo_x'], nodeId: 'dest_dest_huaying', createdAt: 1, updatedAt: 1 }]
    const snap = exportTripSnapshot(t)
    saveSnapshot(snap)
    return getSnapshots().length
  })
  expect(len).toBe(1)
  // 独立存储 key 已落地，且不影响 live 行程
  const snapRaw = await page.evaluate(() => localStorage.getItem('travel:v1:snapshots'))
  expect(snapRaw).not.toBeNull()
  const snapshots = JSON.parse(snapRaw!)
  expect(snapshots[0].title).toBe('广安 → 四川·成都 → 广安·华蓥山')
  expect(snapshots[0].diary[0].photoIds).toEqual(['photo_x'])
})

test('验收27：社区广场渲染 + 帖子详情 + 点赞收藏切换并持久化', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '社区')
  // 示例标注 + 广场信息流（作者名可见）
  await expect(page.getByText(/社区（示例演示/)).toBeVisible()
  await expect(page.getByText('山野老周')).toBeVisible()
  await expect(page.getByText('广安 → 广安·华蓥山').first()).toBeVisible()
  // 打开帖子详情
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('早起爬华蓥山'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const dialog = page.getByRole('dialog', { name: '帖子详情' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/云海里若隐若现/)).toBeVisible()
  // 点赞：42 → 43；收藏：18 → 19
  await dialog.getByRole('button', { name: '点赞' }).dispatchEvent('click')
  await expect(dialog.getByRole('button', { name: '点赞' })).toContainText('43')
  await dialog.getByRole('button', { name: '收藏' }).dispatchEvent('click')
  await expect(dialog.getByRole('button', { name: '收藏' })).toContainText('19')
  // 关闭详情，刷新后状态保留
  await page.getByRole('button', { name: '返回' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  await switchTo(page, '社区')
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('早起爬华蓥山'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const dialog2 = page.getByRole('dialog', { name: '帖子详情' })
  await expect(dialog2.getByRole('button', { name: '点赞' })).toContainText('43')
  await expect(dialog2.getByRole('button', { name: '收藏' })).toContainText('19')
})

test('验收28：复用他人路线导入规划页（预填节点+天数，可改）', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '社区')
  // 打开带途经点的帖子（广安 → 四川·成都 → 四川·青城山—都江堰，3 天）
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('成都先吃两天'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('dialog', { name: '帖子详情' })).toBeVisible()
  // 用这条路线规划 → 回首页规划页预填
  await page.getByRole('button', { name: '用这条路线规划' }).dispatchEvent('click')
  await page.waitForTimeout(500)
  await expect(page.locator('input[list="start-cities"]')).toHaveValue('广安')
  await expect(page.getByText('四川·成都', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('四川·青城山—都江堰', { exact: true }).first()).toBeVisible()
  await expect(page.locator('input[type="number"]').first()).toHaveValue('3')
  // 天数仅默认值，可改
  await page.locator('input[type="number"]').first().fill('4')
  await expect(page.locator('input[type="number"]').first()).toHaveValue('4')
})

test('验收29：收藏闭环（社区收藏→空间收藏夹→取消收藏，刷新保留）', async ({ page }) => {
  await fresh(page)
  // 社区收藏第一篇（广安 → 广安·华蓥山）
  await switchTo(page, '社区')
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('早起爬华蓥山'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const dialog = page.getByRole('dialog', { name: '帖子详情' })
  await dialog.getByRole('button', { name: '收藏' }).dispatchEvent('click')
  await expect(dialog.getByRole('button', { name: '收藏' })).toContainText('19')
  // 关闭 → 空间页收藏入口显示 1 条
  await page.getByRole('button', { name: '返回' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await switchTo(page, '空间')
  await expect(page.getByText('1 条收藏')).toBeVisible()
  // 打开收藏夹 → 列表含该帖
  await clickText(page, '收藏')
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog', { name: '收藏' })).toBeVisible()
  await expect(page.getByText('广安 → 广安·华蓥山').first()).toBeVisible()
  // 刷新后收藏保留
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  await switchTo(page, '空间')
  await clickText(page, '收藏')
  await page.waitForTimeout(300)
  await expect(page.getByText('广安 → 广安·华蓥山').first()).toBeVisible()
  // 点开详情 → 取消收藏 → 空态
  await clickText(page, '广安 → 广安·华蓥山')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '取消收藏' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await expect(page.getByText('还没有收藏的帖子，去社区逛逛吧')).toBeVisible()
})

test('验收30：足迹回顾分享卡下载（无照片占位兜底）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  // 已完成出行 → 存足迹
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('已完成出行'))
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('alertdialog', { name: /已完成出行/ })).toBeVisible()
  await clickText(page, '完成并存入足迹')
  await page.waitForTimeout(400)
  // 空间 → 足迹 → 打开行程回顾
  await switchTo(page, '空间')
  await clickText(page, '走过的足迹')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('广安 → 四川·成都 → 广安·华蓥山'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('dialog', { name: '行程回顾' })).toBeVisible()
  // 点分享 → 捕获下载（该行程无照片 → 占位兜底仍可下载）
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '分享' }).dispatchEvent('click')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('归野分享图')
  await expect(page.getByText('已生成分享图，开始下载')).toBeVisible()
})

test('验收31：社区广场一屏完整 2 帖且密度可露出第 3 帖', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '社区')
  // 第 1、2 帖作者可见
  await expect(page.getByText('山野老周')).toBeVisible()
  await expect(page.getByText('锦里闲人')).toBeVisible()
  // 第 2 帖完整可见：其互动条（第 2 个收藏按钮）底部在首屏(844)内
  const save2 = page.locator('button[aria-label="收藏"]').nth(1)
  const b2 = await save2.boundingBox()
  expect(b2).not.toBeNull()
  if (b2) expect(b2.y + b2.height).toBeLessThanOrEqual(844)
  // 密度：压缩后第 3 帖作者顶部上移到首屏中上部（<700），信息流更紧凑
  const third = page.getByText('川藏线小柒')
  const b3 = await third.boundingBox()
  expect(b3).not.toBeNull()
  if (b3) expect(b3.y).toBeLessThan(700)
})

test('验收33：帖子详情为全屏覆盖层（返回可用，复用按钮不被遮挡）', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '社区')
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('早起爬华蓥山'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const dialog = page.getByRole('dialog', { name: '帖子详情' })
  await expect(dialog).toBeVisible()
  // 返回按钮在详情层内（全屏覆盖页顶部）
  await expect(dialog.getByRole('button', { name: '返回' })).toBeVisible()
  // 复用按钮在详情层内且可见（不再被遮罩/下层遮挡，根因修复）
  await expect(dialog.getByRole('button', { name: '用这条路线规划' })).toBeVisible()
  // 返回回广场
  await dialog.getByRole('button', { name: '返回' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog', { name: '帖子详情' })).not.toBeVisible()
  await expect(page.getByText('山野老周')).toBeVisible()
})

test('验收32：发评论→评论数同步→刷新保留', async ({ page }) => {
  await fresh(page)
  await switchTo(page, '社区')
  // 打开 post_chengdu 详情（seed 3 条评论）
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('成都先吃两天'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  const dialog = page.getByRole('dialog', { name: '帖子详情' })
  await expect(dialog).toBeVisible()
  // seed 评论可见
  await expect(dialog.getByText('成都先吃三天才够味')).toBeVisible()
  // 发评论（前后空格应被 trim）
  await dialog.getByRole('textbox', { name: '写评论' }).fill('  好想去，收藏了  ')
  await dialog.getByRole('button', { name: '发送评论' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  // 新评论出现在列表顶部，作者为"我"
  await expect(dialog.getByText('好想去，收藏了')).toBeVisible()
  await expect(dialog.getByText('我', { exact: true }).first()).toBeVisible()
  // 评论数 3 → 4（评论区标题）
  await expect(dialog.getByText('评论（4）')).toBeVisible()
  // 返回 → 广场该卡评论数同步为 4
  await dialog.getByRole('button', { name: '返回' }).dispatchEvent('click')
  await page.waitForTimeout(300)
  const card = page.locator('article').filter({ hasText: '锦里闲人' })
  await expect(card.getByText('4', { exact: true })).toBeVisible()
  // 刷新后保留
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  await switchTo(page, '社区')
  const card2 = page.locator('article').filter({ hasText: '锦里闲人' })
  await expect(card2.getByText('4', { exact: true })).toBeVisible()
})

// ---------- v1.18：边走边发（ongoing） ----------
test('验收34a：路线页日记可发布到社区（写入 ongoing store + 已发布态）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await expect(page.getByText('你的路线')).toBeVisible()
  // 写一条日记
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('云海太美了')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await expect(page.getByText('云海太美了')).toBeVisible()
  // 发布到社区
  await page.getByRole('button', { name: '发布到社区', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page.getByText('已发布')).toBeVisible()
  // ongoing 已写入 store（travel:v1:community-ongoing）
  const og = await page.evaluate(() => JSON.parse(localStorage.getItem('travel:v1:community-ongoing') || '[]'))
  expect(og.length).toBe(1)
  expect(og[0].tripId).toBeTruthy()
  expect(og[0].publishedEntryIds.length).toBe(1)
})

test('验收34b：社区广场 ongoing 卡（进行中标记）+ 详情聚合时间轴', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  // 两条日记，逐条发布
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('云海太美了')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '发布到社区', exact: true }).click()
  await page.waitForTimeout(200)
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('天池边发呆')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '发布到社区', exact: true }).click()
  await page.waitForTimeout(200)
  // 关面板，切社区
  await page.keyboard.press('Escape')
  await switchTo(page, '社区')
  // ongoing 卡：进行中标记 + 目的地名 + 最新摘要
  await expect(page.getByText('进行中', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/广安·华蓥山/).first()).toBeVisible()
  await expect(page.getByText('天池边发呆').first()).toBeVisible()
  // 点开详情（定位 ongoing 卡：含最新摘要'天池边发呆'，避免误中同路线的 seed 帖）→ 聚合时间轴两条
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      (x.textContent || '').includes('天池边发呆'),
    )
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.getByRole('dialog', { name: '帖子详情' })).toBeVisible()
  await expect(page.getByText('云海太美了').first()).toBeVisible()
  await expect(page.getByText('天池边发呆').first()).toBeVisible()
})

test('验收35：社区追更弹窗（收藏的 ongoing → 上拉列出 → 点进详情）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('云海太美了')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '发布到社区', exact: true }).click()
  await page.waitForTimeout(200)
  await page.keyboard.press('Escape')
  await switchTo(page, '社区')
  // ongoing 卡收藏
  await expect(page.getByText('进行中', { exact: true }).first()).toBeVisible()
  await page.evaluate(() => {
    const article = Array.from(document.querySelectorAll('article')).find((a) =>
      (a.textContent || '').includes('进行中'),
    )
    if (article) {
      const btn = Array.from(article.querySelectorAll('button')).find((b) =>
        (b.getAttribute('aria-label') || '') === '收藏',
      )
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
  })
  await page.waitForTimeout(300)
  // 顶部"追更(1)"
  await expect(page.getByRole('button', { name: '追更(1)' })).toBeVisible()
  // 点开 → 弹窗列出 ongoing
  await page.getByRole('button', { name: '追更(1)' }).click()
  await expect(page.getByRole('dialog', { name: '追更' })).toBeVisible()
  await expect(page.getByText('广安 → 广安·华蓥山').first()).toBeVisible()
  // 点进详情
  await page.getByRole('dialog', { name: '追更' }).getByText('云海太美了').click()
  await page.waitForTimeout(300)
  await expect(page.getByRole('dialog', { name: '帖子详情' })).toBeVisible()
  await expect(page.getByText('云海太美了').first()).toBeVisible()
})

test('验收36：已完成出行自动收尾 ongoing → completed（进行中消失、帖仍在）', async ({ page }) => {
  await fresh(page)
  await planRoute(page)
  await clickText(page, '出发，看路线')
  await page.waitForTimeout(400)
  await clickText(page, '路线日记')
  await expect(page.getByRole('dialog', { name: /路线日记/ })).toBeVisible()
  await page.locator('textarea[placeholder="写下此刻的见闻…"]').fill('云海太美了')
  await clickText(page, '记下')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: '发布到社区', exact: true }).click()
  await page.waitForTimeout(200)
  await page.keyboard.press('Escape')
  // 已完成出行 → 确认存足迹
  await clickText(page, '已完成出行')
  await expect(page.getByRole('button', { name: /完成并存入足迹/ })).toBeVisible()
  await clickText(page, '完成并存入足迹')
  await page.waitForTimeout(300)
  // 回品牌页
  await expect(page.getByRole('button', { name: /开始规划行程/ })).toBeVisible()
  // 切社区：ongoing 已收尾 → 无"进行中"标记，追更按钮无计数（0 个 ongoing）
  await switchTo(page, '社区')
  await expect(page.getByText('进行中', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^追更$/ })).toBeVisible()
  // 帖仍在广场（completed，含发布摘要）
  await expect(page.getByText('云海太美了').first()).toBeVisible()
})

test('验收37：dialog 焦点复位（打开聚焦入内、关闭归还触发元素）', async ({ page }) => {
  await fresh(page)
  await startPlanning(page)
  await setDate(page, '2026-11-03')
  await pickDestination(page, '广安·华蓥山')
  // 返回品牌页（草稿保留），露出"删除当前行程"
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button[aria-label="回到上一页"]'))[0]
    if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /删除当前行程/ })).toBeVisible()
  // 打开确认层：焦点应进入 dialog 内
  await clickText(page, '删除当前行程')
  await page.waitForTimeout(200)
  await expect(page.getByRole('alertdialog')).toBeVisible()
  const focusedIn = await page.evaluate(() => {
    const d = document.querySelector('[role="alertdialog"]')
    return !!d && d.contains(document.activeElement)
  })
  expect(focusedIn).toBe(true)
  // 取消关闭：焦点归还到触发按钮
  await clickText(page, '取消')
  await page.waitForTimeout(300)
  const label = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el ? (el.getAttribute('aria-label') ?? el.textContent ?? '').trim() : ''
  })
  expect(label).toContain('删除当前行程')
})

