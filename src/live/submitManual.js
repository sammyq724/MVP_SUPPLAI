import { api } from './api.js'
import { MANUAL_SOURCE } from './adapt.js'

/**
 * BUILD NEW QUOTE/PO — a typed or attached order, entered by hand.
 *
 * It goes through `POST /api/jobs`, the same endpoint Make posts arriving email
 * to, which means a hand-entered order becomes an ordinary inbox entry: it
 * predicts in the background, lands as a card, and is reviewed and submitted
 * exactly like an email. That is the point — "an order we were told about over
 * the phone" should not be a second, parallel workflow with its own review path.
 *
 * Two deliberate details:
 *
 * `email_type` is NOT sent. The quote gate only adjudicates PO/UNSURE/UNCLEAR;
 * with no email_type it returns `not_checked` before making any call, so a
 * typed order is predicted directly at no extra cost. That is right here —
 * a rep typing an order in is explicitly asking for a prediction, so having the
 * gate decide it duplicates a quote and silently skip it would be absurd.
 *
 * `source` is MANUAL_SOURCE, so the card can say "Typed in" and the rows this
 * eventually writes to review_queue2.csv are not mislabelled `email_auto`.
 */

/** Matches ATTACHMENT_MAX_FILES on the server; over it, the rest are dropped. */
const MAX_FILES = 8

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error(`Could not read ${file.name}`))
    // readAsDataURL gives "data:<mime>;base64,<payload>" — the server wants
    // only the payload.
    r.onload = () => resolve(String(r.result || '').split(',')[1] || '')
    r.readAsDataURL(file)
  })

/**
 * Builds a subject the queue can be scanned by. A list of rows all reading
 * "Manually created order" is unreadable, so the first real line of what was
 * typed is used instead, and the filename when nothing was typed.
 */
export function subjectFor(text, files) {
  const firstLine = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
  if (firstLine) return firstLine.length > 90 ? firstLine.slice(0, 87) + '…' : firstLine
  if (files?.length) return files[0].name
  return 'Typed order'
}

/**
 * @param {{text: string, files: {name: string, file?: File}[]}} input
 * @returns {Promise<{job_id: string|null, subject: string}>}
 */
export async function submitManualOrder({ text, files = [] }) {
  const real = files.filter((f) => f.file).slice(0, MAX_FILES)
  const attachments = []
  for (const f of real) {
    const data = await readAsBase64(f.file)
    if (data) attachments.push({ filename: f.file.name, mime_type: f.file.type || '', data })
  }

  const body = String(text || '').trim()
  // The server refuses a job with no text at all. An attachment-only order is a
  // real case (a photographed takeoff with no covering note), so it gets a
  // one-line body naming what to read rather than being rejected.
  const payload = {
    subject: subjectFor(text, real.length ? real.map((f) => ({ name: f.file.name })) : files),
    from: '',
    body: body || `Order attached — see ${real.map((f) => f.file.name).join(', ') || 'the attached file'}.`,
    source: MANUAL_SOURCE,
  }
  if (attachments.length) payload.attachments = attachments

  const data = await api('/api/jobs', payload)
  return { job_id: data.job_id ?? (data.job_ids && data.job_ids[0]) ?? null, subject: payload.subject }
}
