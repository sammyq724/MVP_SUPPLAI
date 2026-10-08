/**
 * Shape translation: what the HQPSPLBAI backend returns -> what these screens
 * already render. Kept in one file so the mapping is reviewable in one place
 * rather than scattered through JSX.
 */

/**
 * `source` on a job created from the Build New Quote/PO box. The server stores
 * whatever it is given; this is the one value the UI writes, and it is what
 * tells a typed order apart from an email on the card and in review_queue2.csv.
 */
export const MANUAL_SOURCE = 'manual_app'

/* --------------------------------------------------------------- statuses */

/**
 * The five real job statuses (inbox.js), mapped onto pills.
 *
 * `tab` is which of the queue's All / New / In Progress tabs the row counts
 * towards. A gate skip is deliberately NOT "in progress": nothing was
 * predicted, so there is nothing to work on — the salesman converts the
 * existing quote in the ERP. It is reachable under All, like a submitted one.
 */
export const STATUS = {
  pending: {
    label: 'Predicting',
    tone: 'amber',
    spinner: true,
    tab: 'In Progress',
    help: 'The prediction is running on the server. It usually takes 20–90 seconds; you can leave this page and the result will be waiting here.',
  },
  ready: {
    label: 'Needs review',
    tone: 'green',
    tab: 'New',
    help: 'Predicted and waiting on you. Check each line, mark anything wrong, then submit it to the review queue.',
  },
  error: {
    label: 'Failed',
    tone: 'red',
    tab: 'In Progress',
    help: 'The prediction did not finish. Open it to see what went wrong and retry.',
  },
  skipped: {
    label: 'Skipped — quote match',
    tone: 'violet',
    // Deliberately NOT in the inbox at all (Sam, 2026-10-08). A gate skip never
    // left the salesman's Gmail inbox — nothing was predicted and nothing was
    // moved — so a card in THIS inbox claimed an action that had not happened.
    // It is a record of a decision, so it lives in History's Skipped tab.
    tab: null,
    inInbox: false,
    help: 'Not predicted: the quote gate judged this a release against a quote we already priced. Convert that quote in the ERP — or open it from History and predict anyway if the gate got it wrong.',
  },
  // Derived, not a server status: a `ready` email with unfinished work saved
  // against it in this browser. See src/live/useDraft.js.
  in_progress: {
    label: 'In progress',
    tone: 'amber',
    tab: 'In Progress',
    help: 'You have started reviewing this one and your progress is saved in this browser. Open it to carry on where you left off.',
  },
  submitted: {
    label: 'Submitted',
    tone: 'slate',
    tab: null,
    help: 'Already submitted to the review queue. Read-only.',
  },
}

export const statusMeta = (s) => STATUS[s] ?? { label: s || 'unknown', tone: 'slate', tab: null }

/** Does this status belong in the inbox at all? Only `skipped` does not. */
export const showsInInbox = (s) => statusMeta(s).inInbox !== false

/**
 * What the queue should SAY a row is. The server knows five statuses; the
 * sixth, In progress, exists only in this browser — it is `ready` plus a
 * saved draft.
 */
export const displayStatus = (row, draftIds) =>
  row.status === 'ready' && draftIds?.has(row.id) ? 'in_progress' : row.status

/* ------------------------------------------------------------------ dates */

const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric' }
const TIME_FMT = { hour: 'numeric', minute: '2-digit' }

export function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '', full: '' }
  return {
    date: d.toLocaleDateString('en-US', DATE_FMT),
    time: d.toLocaleTimeString('en-US', TIME_FMT),
    full: d.toLocaleString('en-US'),
  }
}

/** inbox.html's own relative clock, for the banners that use one. */
export function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!then) return ''
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.round(hrs / 24)
  if (days < 7) return days + 'd ago'
  return new Date(iso).toLocaleDateString()
}

/* ------------------------------------------------------------- queue rows */

/**
 * One `/api/inbox/list` summary -> one queue row.
 *
 * Customer falls back twice because `createJob()` never sets customer_id — only
 * a gate skip and a submitted job carry one — so for an ordinary predicted
 * email the sender address IS the only customer identity we have. PO Number has
 * no source on this path at all and is always "—".
 */
export function summaryToRow(job) {
  const { date, time, full } = formatDate(job.received_at)
  return {
    id: job.id,
    customer: job.customer_name || job.customer_id || job.from || null,
    contact: job.from || '',
    subject: job.subject || '(no subject)',
    status: job.status,
    orderNumber: job.order_ref || null,
    poNumber: '—',
    date,
    time,
    dateFull: full,
    receivedAt: job.received_at,
    lines: job.row_count ?? job.line_count ?? null,
    attachmentCount: job.attachment_count || 0,
    flagged: !!job.flagged,
    unread: job.status === 'ready',
    potentialMatch: job.potential_match || null,
    noQuoteFound: !!job.no_quote_found,
    splitLabel: job.split_label || '',
    splitFrom: job.split_from_job_id || '',
    splitOffCount: job.split_off_count || 0,
    partOf: job.part_of || '',
    partIndex: job.part_index ?? null,
    partTotal: job.part_total ?? null,
    overturned: !!job.overturned,
    // Typed in through Build New Quote/PO rather than arriving by email.
    manual: job.source === MANUAL_SOURCE,
    matchedQuote: job.matched_quote || '',
    customerId: job.customer_id || '',
    confidence: job.confidence || '',
    error: job.error || '',
    raw: job,
  }
}

/* ------------------------------------------------------------ email body */

const SECTION = /^---\s*(.+?)\s*---\s*$/

/**
 * Make's envelope -> something readable.
 *
 * It arrives as `Subject:` / `From:` header lines, a blank line, then
 * `--- Email body ---` and four `--- Read from … attachments ---` sections,
 * each of which is literally "(none)" when there was nothing to read. 29 of 37
 * real bodies have that shape; the other 8 are raw order text with no envelope
 * at all, which is why `ok` exists — the caller renders those as preformatted
 * text rather than inventing structure that is not there.
 */
export function parseEmailBody(body) {
  const text = String(body || '')
  if (!text.trim()) return { ok: false, raw: text, headers: [], body: '', sections: [] }

  const lines = text.split(/\r?\n/)
  const headers = []
  let i = 0
  // Header lines only count before the first blank line, so a "Subject:" quoted
  // further down inside a forwarded thread stays part of the body.
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) break
    const m = line.match(/^(Subject|From|To|Cc|Date|Reply-To):\s*(.*)$/i)
    if (!m) break
    headers.push({ key: m[1], value: m[2] })
  }

  const sections = []
  let current = null
  for (; i < lines.length; i++) {
    const m = lines[i].match(SECTION)
    if (m) {
      current = { title: m[1], lines: [] }
      sections.push(current)
    } else if (current) {
      current.lines.push(lines[i])
    } else if (lines[i].trim() && headers.length === 0) {
      // Text before any section marker and with no headers above it: this is
      // not an envelope.
      return { ok: false, raw: text, headers: [], body: '', sections: [] }
    }
  }

  const bodySection = sections.find((s) => /^email body$/i.test(s.title))
  if (!bodySection) return { ok: false, raw: text, headers, body: '', sections: [] }

  const clean = (s) => s.lines.join('\n').replace(/^\n+|\n+$/g, '')
  const extracted = sections
    .filter((s) => s !== bodySection)
    .map((s) => ({ title: s.title, text: clean(s) }))
    // "(none)" is the overwhelmingly common value and says nothing — showing
    // four of them pushes the actual order off the top of the pane.
    .filter((s) => s.text && s.text.trim() !== '(none)')

  return { ok: true, raw: text, headers, body: clean(bodySection), sections: extracted }
}

/** "Sam Quentzel <sam@quentzel.com>" -> { name, email }. */
export function parseAddress(from) {
  const s = String(from || '').trim()
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() }
  return { name: s, email: s }
}

export const initials = (name) =>
  String(name || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'
