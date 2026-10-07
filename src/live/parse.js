/**
 * PREDICTION TABLE PARSER — a port of webapp/public/inbox.html.
 *
 * A predicted email is stored as `parts`: the model's raw markdown answers,
 * one per chunk, in the mandatory 5-column format rules.md fixes:
 *
 *   # | Quantity | Predicted Item ID | Item Description | Input Description
 *
 * The three functions in the first section below — `parseResult`,
 * `tablesForJob`, `parseChoiceCell` — are LINE-FOR-LINE PORTS of the functions
 * of the same names in `webapp/public/inbox.html`, which `webapp/rows.js`
 * already mirrors on the server. Three implementations of one parser is one
 * too many, but the alternative is the dashboard, the server's split guardrail
 * and this UI disagreeing about which rows exist and how they are numbered —
 * and a split names rows by number.
 *
 * **If you change parseResult in inbox.html, change it here and in rows.js.**
 * `npm run parity` re-checks all three against every real `predicted` payload
 * in inbox_log.csv and fails on any disagreement.
 *
 * The second section is live-UI-only: how a parsed cell is DISPLAYED (one
 * candidate, a pick between several, a make-up, a missing prediction) and how
 * trailing follow-up text is routed to a line. None of it feeds the parity
 * check, because none of it changes which rows exist.
 */

/* ======================================================================== */
/* PORTED FROM inbox.html — do not change independently                     */
/* ======================================================================== */

/**
 * One markdown answer -> { rows, trailing, sawTable }.
 *
 * A table starts at a "|" line immediately followed by a separator line; every
 * following "|" line is a row; any other non-blank line is trailing text (the
 * follow-up questions the rules append below the table). Cells are read by
 * POSITION, not by header text.
 */
export function parseResult(text) {
  const lines = String(text || '').split(/\r?\n/)
  const rows = []
  const trailing = []
  let i = 0
  let sawTable = false
  while (i < lines.length) {
    if (lines[i].trim().startsWith('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
      sawTable = true
      i += 2 // skip header + separator row
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((s) => s.trim())
        rows.push({
          quantity: cells[1] || '',
          predicted_item_id: cells[2] || '',
          item_description: cells[3] || '',
          input_text: cells[4] || '',
        })
        i++
      }
    } else {
      if (lines[i].trim().length) trailing.push(lines[i])
      i++
    }
  }
  return { rows, trailing, sawTable }
}

/**
 * The tables an entry shows, as [{label, parsed}].
 *
 * - A Split Quote entry holds its own structured rows (original numbers kept).
 * - Any other entry parses its markdown parts, numbering rows continuously
 *   across parts — the SAME numbering webapp/rows.js uses on the server, which
 *   is what lets a split name rows by number — and hides rows already split off.
 */
export function tablesForJob(job) {
  if (Array.isArray(job.rows)) {
    const trailing = job.follow_up_notes ? String(job.follow_up_notes).split('\n') : []
    return [
      {
        label: 'Split Quote — ' + job.rows.length + ' line' + (job.rows.length === 1 ? '' : 's'),
        parsed: { rows: job.rows, trailing: trailing, sawTable: true },
      },
    ]
  }
  const parts = job.parts || []
  const gone = new Set(job.split_off_rows || [])
  let n = 0
  const out = []
  parts.forEach((part, i) => {
    const parsed = parseResult(part.result)
    const rows = parsed.rows.map((r) => Object.assign({ n: ++n }, r)).filter((r) => !gone.has(r.n))
    // Every line of this part was split away: nothing left to show.
    if (parsed.rows.length && !rows.length) return
    const label =
      parts.length === 1
        ? 'Lines ' + part.from + '–' + part.to
        : 'Part ' + (i + 1) + ' of ' + parts.length + ' — lines ' + part.from + '–' + part.to
    out.push({ label: label, parsed: { rows: rows, trailing: parsed.trailing, sawTable: parsed.sawTable } })
  })
  return out
}

/**
 * Two-choice equivalent-option parsing, per rules.md's "Two-choice
 * equivalent-option output" section: the model joins candidate IDs with a
 * literal " OR " when the stocked items are confirmed-equivalent substitutes
 * and no brand was stated, with the descriptions joined by " / " in the same
 * order. If the counts don't line up, show bare IDs rather than risk pairing an
 * ID with the wrong description. (rules.md also defines 3-way options — the
 * IPS/sweat ball-valve rows — so this is never assumed to be exactly two.)
 */
export function parseChoiceCell(idCell, descCell) {
  if (!idCell || idCell.indexOf(' OR ') === -1) return null
  const ids = idCell.split(' OR ').map((s) => s.trim()).filter(Boolean)
  if (ids.length < 2) return null
  const descs = (descCell || '').split(' / ').map((s) => s.trim())
  const descsMatch = descs.length === ids.length
  return ids.map((id, i) => ({ id, desc: descsMatch ? descs[i] : '' }))
}

/* ======================================================================== */
/* LIVE UI ONLY — display classification, not row identity                  */
/* ======================================================================== */

/** IDs that mean "no item was predicted" rather than naming one. */
const NO_ANSWER = new Set(['NO_PREDICTION', 'NO_MATCH'])

/**
 * Make-up (M/U) parsing. Per rules.md's delimiter convention, " & " joins the
 * two-or-more fittings that TOGETHER make up one requested item when the exact
 * item is not stocked (a 2" elbow + a 2x1-1/2 reducer). Unlike " OR " this is
 * not a choice — every part is ordered — so the row resolves immediately and
 * submits the joined string exactly as /inbox does. Splitting it here is a
 * display decision only: the rep needs to see both IDs.
 */
export function parseMakeupCell(idCell, descCell) {
  if (!idCell || idCell.indexOf(' & ') === -1) return null
  const ids = idCell.split(' & ').map((s) => s.trim()).filter(Boolean)
  if (ids.length < 2) return null
  // Descriptions follow the same shape as a choice cell: joined with " / " in
  // the same order. Fall back to bare IDs rather than mispair them.
  const descs = (descCell || '').split(' / ').map((s) => s.trim())
  const descsMatch = descs.length === ids.length
  return ids.map((id, i) => ({ id, desc: descsMatch ? descs[i] : '' }))
}

/**
 * How one parsed row should render, and what it submits.
 *
 * `kind`:
 *   'choice'  — " OR ": one radio per ID, NOTHING preselected, outstanding
 *               until the rep picks. `submitId` is null until then.
 *   'makeup'  — " & ": every ID is ordered. Resolved on arrival; `submitId` is
 *               the joined cell, byte-identical to what /inbox submits.
 *   'none'    — NO_PREDICTION / NO_MATCH: no candidates. `reason` is the
 *               Item Description, which per rules.md states what is missing.
 *               Resolved (it does not block submit, matching /inbox) but the
 *               rep can type an ID over it.
 *   'fab'     — FAB: rules.md's fabrication-required answer. A real answer, not
 *               a missing one, so it resolves and submits as "FAB".
 *   'single'  — one ID, preselected.
 */
export function classifyRow(row) {
  const id = String(row.predicted_item_id || '').trim()
  const desc = String(row.item_description || '')

  const choices = parseChoiceCell(id, desc)
  if (choices) {
    return { kind: 'choice', candidates: choices, submitId: null, submitDesc: null }
  }

  const makeup = parseMakeupCell(id, desc)
  if (makeup) {
    return { kind: 'makeup', candidates: makeup, submitId: id, submitDesc: desc }
  }

  if (NO_ANSWER.has(id.toUpperCase())) {
    return { kind: 'none', candidates: [], submitId: id, submitDesc: desc, reason: desc }
  }

  if (id.toUpperCase() === 'FAB') {
    return { kind: 'fab', candidates: [{ id, desc }], submitId: id, submitDesc: desc }
  }

  return { kind: 'single', candidates: [{ id, desc }], submitId: id, submitDesc: desc }
}

/** `- Row 12:` / `Row 12:` / `Row #3 (…)` — a follow-up aimed at one line. */
const ROW_REF = /^\s*(?:[-*•]\s*)?Row\s*#?\s*(\d+)\b/i

/**
 * A bare heading the model wrote above a list whose items all turned out to be
 * row-specific ("Notes:" followed by "- Row 9: …"). Once the items have moved
 * to their rows the heading is left alone in the notes box, labelling nothing.
 * Narrow on purpose: only a lone Note/Notes, with or without a colon.
 */
const BARE_HEADING = /^(notes?)\s*:?$/i

/**
 * Routes the trailing text under a table. Per the spec: a note that STARTS
 * WITH "Row N" shows under line N; anything else goes in the notes box above
 * the products.
 *
 * Deliberately literal. Real payloads also contain "Note for row 1: …" and
 * "Note row 1: …", which do not start with a row reference and so land in the
 * notes box — alongside the model's own narration ("All confirmed. Final table
 * below."), which is the bulk of what trailing text actually holds.
 */
export function splitFollowUps(trailing) {
  const byRow = new Map()
  const general = []
  for (const raw of trailing || []) {
    const line = String(raw)
    const m = line.match(ROW_REF)
    if (m) {
      const n = Number(m[1])
      if (!byRow.has(n)) byRow.set(n, [])
      // Keep the text as written, minus only a leading bullet marker.
      byRow.get(n).push(line.replace(/^\s*[-*•]\s*/, '').trim())
    } else if (line.trim() && !BARE_HEADING.test(line.trim())) {
      general.push(line.trim())
    }
  }
  return { byRow, general }
}

/**
 * Every renderable line on a job, flattened across parts, each carrying its
 * table label so the UI can draw a divider when the label changes.
 */
export function linesForJob(job) {
  const tables = tablesForJob(job)
  const out = []
  const general = []
  // Row references are resolved ACROSS parts, not within one: row numbers run
  // continuously over the whole email, so part 1's trailing text can name a row
  // that lives in part 2.
  const byRowAll = new Map()
  for (const t of tables) {
    const { byRow, general: g } = splitFollowUps(t.parsed.trailing)
    general.push(...g)
    for (const [n, notes] of byRow) {
      if (!byRowAll.has(n)) byRowAll.set(n, [])
      byRowAll.get(n).push(...notes)
    }
    for (const row of t.parsed.rows) {
      out.push({ ...row, n: row.n, label: t.label, classified: classifyRow(row) })
    }
  }
  for (const row of out) row.followUps = byRowAll.get(row.n) || []
  // A follow-up naming a row that was split away (or never existed) must not
  // vanish silently — it moves to the notes box instead.
  const shown = new Set(out.map((r) => r.n))
  for (const [n, notes] of byRowAll) if (!shown.has(n)) general.push(...notes)
  return { lines: out, notes: general, tables, sawTable: tables.some((t) => t.parsed.sawTable) }
}
