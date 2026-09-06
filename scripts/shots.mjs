/**
 * Renders every documented screen state to a PNG in ./mockups.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/shots.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173'
const OUT = 'mockups'

const SHOTS = [
  ['01-inbox', '#/inbox', 'Screen 1 — request queue, default'],
  ['02-inbox-tooltips', '#/inbox?tips=1', 'Screen 1 — status + split-quote tooltips open'],
  ['03-typelist-empty', '#/inbox?modal=typelist', 'Screen 2 — Type List modal, Submit disabled'],
  ['04-typelist-error', '#/inbox?modal=typelist&error=1', 'Screen 2 — submitted empty, inline validation'],
  ['05-typelist-filled', '#/inbox?modal=typelist&filled=1', 'Screen 2 — text entered, Submit enabled'],
  ['06-inbox-processing', '#/inbox?processing=1', 'Screen 2 — processing toast + new queue row'],
  ['07-split-selected', '#/inbox?split=1', 'Screen 4 — related split rows checked, Unsplit action'],
  ['08-order-outstanding', '#/order', 'Screen 3 — 2 lines outstanding, actions disabled'],
  ['09-order-resolved', '#/order?state=resolved', 'Screen 3 — all lines matched, actions enabled'],
  ['10-order-create-menu', '#/order?state=resolved&menu=create', 'Screen 3 — Create Quote dropdown'],
  ['11-order-document', '#/order?tab=document', 'Screen 3 — attachment tab, inline document'],
  ['12-order-delivery', '#/order?delivery=1', 'Screen 3 — delivery address section expanded'],
  ['13-order-showmore', '#/order?more=li-4', 'Screen 3 — "Show more" candidates expanded'],
  ['14-asap-forms', '#/asap', 'ASAP Customer Forms'],
  ['15-product-search', '#/products', 'Product Search'],
  ['16-settings', '#/settings', 'Settings — Inbox & Email'],
]

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1680, height: 1050 },
  deviceScaleFactor: 2,
})

const errors = []
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`))

for (const [name, hash, label] of SHOTS) {
  errors.length = 0
  // Force a clean remount so mount-time effects (toasts, seeded state) re-run.
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`${errors.length ? '✗' : '✓'} ${name.padEnd(22)} ${label}`)
  for (const e of errors) console.log(`    ${e}`)
}

await browser.close()
