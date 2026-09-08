/**
 * Renders every documented screen state to a PNG in ./mockups.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/shots.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

// Includes the Pages base path, since `vite preview` honours vite.config's
// `base` and serves the app under /MVP_SUPPLAI/ rather than the root.
const BASE = (process.argv[2] ?? 'http://127.0.0.1:4173/MVP_SUPPLAI').replace(/\/$/, '')
const OUT = 'mockups'

const SHOTS = [
  ['01-inbox', '#/inbox', 'Sales — request queue, default'],
  ['02-inbox-tooltips', '#/inbox?tips=1', 'Sales — status tooltip open'],
  ['03-new-order-empty', '#/inbox?modal=new', 'New order — empty, Submit disabled'],
  ['04-new-order-error', '#/inbox?modal=new&error=1', 'New order — submitted empty, inline validation'],
  ['05-new-order-filled', '#/inbox?modal=new&filled=1', 'New order — text entered, Submit enabled'],
  ['06-new-order-files', '#/inbox?modal=new&files=1', 'New order — file attached, no text needed'],
  ['07-inbox-processing', '#/inbox?processing=1', 'New order — processing toast + new queue row'],
  ['08-order-outstanding', '#/order', 'Order detail — 2 lines outstanding, actions disabled'],
  ['09-order-resolved', '#/order?state=resolved', 'Order detail — all lines matched, actions enabled'],
  ['10-order-create-menu', '#/order?state=resolved&menu=create', 'Order detail — Create Quote dropdown'],
  ['11-order-document', '#/order?tab=document', 'Order detail — attachment tab, inline document'],
  ['12-order-delivery', '#/order?delivery=1', 'Order detail — delivery section expanded'],
  [
    '13-order-showmore',
    '#/order?more=li-4',
    'Order detail — "Show more" matches expanded',
    // Line 4 sits below the fold; scroll it up so the state is actually visible.
    // Match the line item's own wording ("x 45"), not the email body's ("— 45").
    '4-11/16" square boxes, 2-1/8" deep x 45',
  ],
  ['14-trace-connector', '#/order?trace=li-1', 'Order detail — provenance connector, email → matched item'],
  [
    '15-trace-connector-doc',
    '#/order?trace=li-3&tab=document',
    'Order detail — connector from the takeoff row',
  ],
  ['16-find-item', '#/order?find=li-4', 'Find Item — item-master lookup for a line'],
  [
    '17-find-item-grouped',
    '#/order?find=li-4&group=productType',
    'Find Item — grouped by Product Type',
  ],
  ['18-settings', '#/settings', 'Settings — Inbox & Email'],
]

await mkdir(OUT, { recursive: true })
// Use the image's pre-installed Chromium when the pinned Playwright build
// differs from what's on disk, rather than downloading a second copy.
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch(
  existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {},
)
const page = await browser.newPage({
  viewport: { width: 1680, height: 1050 },
  deviceScaleFactor: 2,
})

const errors = []
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`[console] ${m.text()}`))

for (const [name, hash, label, scrollTo] of SHOTS) {
  errors.length = 0
  // Force a clean remount so mount-time effects (toasts, seeded state) re-run.
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  if (scrollTo) {
    await page.getByText(scrollTo, { exact: false }).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`${errors.length ? '✗' : '✓'} ${name.padEnd(22)} ${label}`)
  for (const e of errors) console.log(`    ${e}`)
}

await browser.close()
