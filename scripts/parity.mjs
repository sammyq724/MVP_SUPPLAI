/**
 * PARSER PARITY CHECK — src/live/parse.js vs webapp/public/inbox.html.
 *
 *   npm run parity                       # expects HQPSPLBAI at ../plumbing-data
 *   npm run parity -- --repo /path/to/HQPSPLBAI
 *
 * $0, offline, no API key, read-only. It never writes to the HQPSPLBAI repo.
 *
 * The live UI reproduces /inbox's table parsing from scratch in React. If the
 * two ever disagree, a row silently changes number — and a row number is what
 * a Split Quote names, what webapp/rows.js counts for the "must leave at least
 * one item" guardrail, and what a "Row 12: Not lead free?" follow-up points at.
 * So rather than trust that the port stayed a port, this runs BOTH
 * implementations over every real `predicted` payload in inbox_log.csv and
 * diffs them.
 *
 * inbox.html's three functions are extracted from the page's <script> and
 * evaluated directly, so the reference side is the live code itself rather
 * than a copy of it that could drift. webapp/rows.js is required as a third
 * opinion on row identity, since the server's split guardrail depends on it.
 *
 * Asserted per payload: row count, the # of every row, split-off hiding, the
 * table labels, trailing text, and the " OR " choice split (ids AND the
 * descriptions paired with them).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { parseResult, tablesForJob, parseChoiceCell } from '../src/live/parse.js'

const argv = process.argv.slice(2)
const repoArg = argv.indexOf('--repo')
const REPO = path.resolve(
  repoArg !== -1 ? argv[repoArg + 1] : process.env.HQPS_REPO ?? '../plumbing-data',
)
const INBOX_HTML = path.join(REPO, 'webapp', 'public', 'inbox.html')
const LOG = path.join(REPO, 'inbox_log.csv')
const ROWS_JS = path.join(REPO, 'webapp', 'rows.js')

for (const p of [INBOX_HTML, LOG]) {
  if (!existsSync(p)) {
    console.error(`Not found: ${p}\nPoint --repo at an HQPSPLBAI checkout.`)
    process.exit(2)
  }
}

/* ------------------------------------------- the reference implementation */

/**
 * Lift a `function name(...) { ... }` out of inbox.html by brace matching.
 * Brace counting is enough here and a parser would be overkill: these three
 * functions contain no braces inside string or regex literals except balanced
 * ones, and the check below fails loudly if an extraction comes back wrong.
 */
function lift(src, name) {
  const start = src.indexOf(`function ${name}(`)
  if (start === -1) throw new Error(`inbox.html no longer defines ${name}()`)
  let depth = 0
  let i = src.indexOf('{', start)
  const open = i
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) break
  }
  if (depth !== 0) throw new Error(`could not find the end of ${name}() in inbox.html`)
  return src.slice(start, i + 1)
}

const html = readFileSync(INBOX_HTML, 'utf8')
const refSrc = ['parseResult', 'tablesForJob', 'parseChoiceCell'].map((n) => lift(html, n)).join('\n')
const ref = new Function(`${refSrc}\nreturn { parseResult, tablesForJob, parseChoiceCell };`)()

// The server's own copy, which the split guardrail counts rows with.
const serverRows = existsSync(ROWS_JS) ? createRequire(import.meta.url)(ROWS_JS) : null

/* ----------------------------------------------------------- the corpus */

/** inbox_log.csv is RFC-4180: payload_json is quoted and contains commas. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const csv = parseCsv(readFileSync(LOG, 'utf8'))
const header = csv[0]
const events = csv.slice(1).filter((r) => r.length >= header.length).map((r) =>
  Object.fromEntries(header.map((h, i) => [h, r[i]])),
)

/**
 * Rebuild just enough of inbox.js's replay to get the job shapes the detail
 * view renders: `predicted` supplies parts, `split_created` supplies a child's
 * own rows, `split_off` hides rows on the parent.
 */
const jobs = new Map()
const ensure = (id) => {
  if (!jobs.has(id)) jobs.set(id, { id, parts: [], rows: null, split_off_rows: [], follow_up_notes: '' })
  return jobs.get(id)
}
for (const e of events) {
  let p
  try { p = JSON.parse(e.payload_json) } catch { continue }
  const job = ensure(e.job_id)
  if (e.event === 'predicted' || e.event === 'failed') {
    if (Array.isArray(p.parts) && p.parts.length) job.parts = p.parts
  } else if (e.event === 'split_created') {
    job.rows = p.rows || null
    job.follow_up_notes = p.follow_up_notes || ''
  } else if (e.event === 'split_off') {
    job.split_off_rows = [...new Set([...job.split_off_rows, ...(p.row_numbers || [])])]
  }
}

const corpus = [...jobs.values()].filter((j) => (j.parts && j.parts.length) || Array.isArray(j.rows))

/* ------------------------------------------------------------- the check */

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const failures = []
const stats = {
  jobs: 0, rows: 0, multiPart: 0, split: 0, choiceRows: 0, threeWay: 0,
  noPrediction: 0, makeup: 0, fab: 0, rowFollowUps: 0, mismatchedDescs: 0,
}

for (const job of corpus) {
  stats.jobs++
  const mine = tablesForJob(job)
  const theirs = ref.tablesForJob(job)

  if (Array.isArray(job.rows)) stats.split++
  if ((job.parts || []).length > 1) stats.multiPart++

  const shape = (tables) =>
    tables.map((t) => ({
      label: t.label,
      sawTable: t.parsed.sawTable,
      trailing: t.parsed.trailing,
      rows: t.parsed.rows.map((r) => ({
        n: r.n,
        quantity: r.quantity,
        predicted_item_id: r.predicted_item_id,
        item_description: r.item_description,
        input_text: r.input_text,
        // The choice split is part of row identity for submission: an
        // unresolved choice blocks submit, and the chosen ID is what reaches
        // review_queue2.csv.
        choices: parseChoiceCell(r.predicted_item_id, r.item_description),
      })),
    }))
  const refShape = (tables) =>
    tables.map((t) => ({
      label: t.label,
      sawTable: t.parsed.sawTable,
      trailing: t.parsed.trailing,
      rows: t.parsed.rows.map((r) => ({
        n: r.n,
        quantity: r.quantity,
        predicted_item_id: r.predicted_item_id,
        item_description: r.item_description,
        input_text: r.input_text,
        choices: ref.parseChoiceCell(r.predicted_item_id, r.item_description),
      })),
    }))

  const a = shape(mine)
  const b = refShape(theirs)
  if (!eq(a, b)) {
    failures.push({ job: job.id, why: 'tablesForJob differs from inbox.html', mine: a, theirs: b })
    continue
  }

  // Third opinion: the server numbers rows for the split guardrail. It has no
  // concept of table labels, so only the row list is comparable.
  if (serverRows) {
    const serverSide = serverRows.currentRowsOf(job).map((r) => r.n)
    const mineNs = a.flatMap((t) => t.rows.map((r) => r.n))
    if (!eq(serverSide, mineNs)) {
      failures.push({ job: job.id, why: 'row numbering differs from webapp/rows.js', mine: mineNs, theirs: serverSide })
    }
  }

  for (const t of a) {
    for (const r of t.rows) {
      stats.rows++
      const id = String(r.predicted_item_id).toUpperCase()
      if (r.choices) {
        stats.choiceRows++
        if (r.choices.length >= 3) stats.threeWay++
        if (r.choices.some((c) => !c.desc)) stats.mismatchedDescs++
      }
      if (id === 'NO_PREDICTION' || id === 'NO_MATCH') stats.noPrediction++
      if (id === 'FAB') stats.fab++
      if (r.predicted_item_id.includes(' & ')) stats.makeup++
    }
    for (const line of t.trailing) if (/^\s*(?:[-*•]\s*)?Row\s*#?\s*\d+\b/i.test(line)) stats.rowFollowUps++
  }
}

/* -------------------------------------------------- synthetic edge cases */
// Shapes rules.md defines that the 23 real payloads happen not to contain yet.
// They are run through BOTH implementations too, so "the port handles a
// make-up" is a tested claim rather than a hopeful one.
const SYNTHETIC = [
  {
    name: 'make-up (" & ") stays one row, as /inbox treats it',
    job: { parts: [{ from: 1, to: 1, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 2 | VPPL2 & VPPFGR21H | 2 PP ELL 90 / 2X1-1/2 PP FTG REDUCER | 2 x 1-1/2 pro press elbows |' }] },
  },
  {
    name: 'choice whose description count does not match — bare IDs',
    job: { parts: [{ from: 1, to: 1, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 4 | STMPC1 OR STMP1 | only one description | 4 - 1" plugs |' }] },
  },
  {
    name: 'two parts, rows numbered continuously across the boundary',
    job: { parts: [
      { from: 1, to: 2, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 1 | AAA | a | one |\n| 2 | 1 | BBB | b | two |' },
      { from: 3, to: 4, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 1 | CCC | c | three |\n| 2 | 1 | DDD | d | four |\nRow 3: check this one.' },
    ] },
  },
  {
    name: 'a part emptied entirely by a split is dropped',
    job: { split_off_rows: [1, 2], parts: [
      { from: 1, to: 2, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 1 | AAA | a | one |\n| 2 | 1 | BBB | b | two |' },
      { from: 3, to: 3, result: '| # | Quantity | Predicted Item ID | Item Description | Input Description |\n|---|---|---|---|---|\n| 1 | 1 | CCC | c | three |' },
    ] },
  },
  {
    name: 'no table at all (a prediction that returned prose)',
    job: { parts: [{ from: 1, to: 1, result: 'No item lines found in this email — nothing to predict' }] },
  },
]

for (const { name, job } of SYNTHETIC) {
  const mine = JSON.stringify(tablesForJob({ rows: null, split_off_rows: [], ...job }))
  const theirs = JSON.stringify(ref.tablesForJob({ rows: null, split_off_rows: [], ...job }))
  if (mine !== theirs) failures.push({ job: `synthetic: ${name}`, why: 'differs from inbox.html', mine, theirs })
}

/* ------------------------------------------------------------- reporting */

console.log(`reference: ${path.relative(process.cwd(), INBOX_HTML)}`)
console.log(`corpus:    ${path.relative(process.cwd(), LOG)}\n`)
console.log(`  payloads with a prediction   ${stats.jobs}`)
console.log(`  rows parsed                  ${stats.rows}`)
console.log(`  multi-part jobs              ${stats.multiPart}`)
console.log(`  split jobs                   ${stats.split}`)
console.log(`  " OR " choice rows           ${stats.choiceRows}  (${stats.threeWay} three-way, ${stats.mismatchedDescs} with unpairable descriptions)`)
console.log(`  NO_PREDICTION / NO_MATCH     ${stats.noPrediction}`)
console.log(`  FAB                          ${stats.fab}`)
console.log(`  make-up (" & ")              ${stats.makeup}`)
console.log(`  "Row N" follow-ups           ${stats.rowFollowUps}`)
console.log(`  synthetic edge cases         ${SYNTHETIC.length}`)
console.log(`  server rows.js cross-check   ${serverRows ? 'on' : 'SKIPPED (rows.js not found)'}\n`)

// The brief asks for at least 20 real payloads, including a two-choice row, a
// NO_PREDICTION, a multi-part job and a split job. Assert that rather than
// assume it — the log grows, and a future trim could quietly drop coverage.
const REQUIRED = [
  ['at least 20 predicted payloads', stats.jobs >= 20],
  ['at least one two-choice row', stats.choiceRows > 0],
  ['at least one NO_PREDICTION / NO_MATCH', stats.noPrediction > 0],
  ['at least one multi-part job', stats.multiPart > 0],
  ['at least one split job', stats.split > 0],
]
let short = false
for (const [label, ok] of REQUIRED) {
  if (!ok) { console.log(`  ✗ coverage: ${label}`); short = true }
}

if (failures.length) {
  console.log(`\n✗ ${failures.length} mismatch(es):\n`)
  for (const f of failures.slice(0, 5)) {
    console.log(`  ${f.job} — ${f.why}`)
    console.log(`    live UI : ${JSON.stringify(f.mine).slice(0, 400)}`)
    console.log(`    inbox   : ${JSON.stringify(f.theirs).slice(0, 400)}\n`)
  }
  process.exit(1)
}
if (short) {
  console.log('\n✗ parser matches inbox.html, but the corpus no longer covers every required shape.')
  process.exit(1)
}
console.log('✓ every payload parses identically to inbox.html (and numbers rows identically to rows.js)')
