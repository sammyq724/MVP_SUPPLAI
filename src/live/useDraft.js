import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * IN-PROGRESS REVIEW STATE, KEPT ACROSS RELOADS.
 *
 * Reviewing a 16-line email is not one sitting: a rep picks between equivalent
 * item IDs, X's a wrong row, types why, then gets interrupted. Until this
 * existed every one of those keystrokes lived in React state and died on a
 * refresh, a back button or a tab close — with nothing on screen to warn them,
 * because the page looked identical either way.
 *
 * So a draft is written to localStorage as they work, and the UI says so. It is
 * deliberately LOCAL, not server-side: nothing here is a decision yet, the
 * server has no endpoint for a half-finished review, and a draft synced to
 * review_queue2.csv would put rows in the retrain corpus that nobody ever
 * submitted. It also means a draft is per-browser, which is the honest shape
 * for "what I was in the middle of".
 *
 * A draft is cleared when the email is submitted or deleted — at that point the
 * real record is on the server and the draft would only ever be stale.
 */

const PREFIX = 'solder.draft.'
const SAVE_DEBOUNCE_MS = 500
/** Drafts for emails nobody came back to. Pruned on load, not on a timer. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30

const key = (jobId) => PREFIX + jobId

function read(jobId) {
  try {
    const raw = localStorage.getItem(key(jobId))
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || typeof d !== 'object') return null
    return d
  } catch {
    return null
  }
}

/** Which emails have unfinished work, for the queue's In Progress tab. */
export function draftIds() {
  const out = new Set()
  try {
    const now = Date.now()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const id = k.slice(PREFIX.length)
      const d = read(id)
      // A draft with nothing in it is not progress — see isMeaningful below.
      if (d && d.touched && now - (d.updatedAt || 0) < MAX_AGE_MS) out.add(id)
    }
  } catch {
    /* storage disabled (private window, quota) — the UI just loses the badge */
  }
  return out
}

export function clearDraft(jobId) {
  try {
    localStorage.removeItem(key(jobId))
  } catch {
    /* ignore */
  }
}

/** Drop drafts whose email no longer exists, so the tab count stays honest. */
export function pruneDrafts(liveIds) {
  try {
    const keep = new Set(liveIds)
    for (const id of draftIds()) if (!keep.has(id)) clearDraft(id)
  } catch {
    /* ignore */
  }
}

/**
 * "Has the rep actually done something?" — distinct from "is there an object in
 * storage". Opening an email builds a blank lineState for every row; writing
 * that would mark every email opened once as In Progress, which would make the
 * tab meaningless within a day.
 */
function isMeaningful(draft) {
  if (!draft) return false
  if (draft.customerId?.trim() || draft.orderRef?.trim()) return true
  return Object.values(draft.lineState || {}).some(
    (s) => s && (s.chosen || s.flagged || s.notes?.trim() || s.manualId?.trim()),
  )
}

/**
 * @returns {{
 *   draft: object|null, status: 'idle'|'saving'|'saved', savedAt: number|null,
 *   save: (d: object) => void, clear: () => void, loaded: boolean,
 * }}
 */
export function useDraft(jobId, { enabled = true } = {}) {
  const [draft, setDraft] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('idle')
  const [savedAt, setSavedAt] = useState(null)
  const timer = useRef(null)
  const pending = useRef(null)

  useEffect(() => {
    if (!enabled || !jobId) { setLoaded(true); return }
    const d = read(jobId)
    setDraft(d)
    setSavedAt(d?.updatedAt ?? null)
    setStatus(d && d.touched ? 'saved' : 'idle')
    setLoaded(true)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [jobId, enabled])

  const flush = useCallback(() => {
    const d = pending.current
    pending.current = null
    if (!d || !jobId) return
    const touched = isMeaningful(d)
    // Nothing worth keeping: remove rather than store an empty shell, so
    // `draftIds()` never reports progress that was not made.
    if (!touched) {
      clearDraft(jobId)
      setStatus('idle')
      setSavedAt(null)
      return
    }
    const payload = { ...d, touched: true, updatedAt: Date.now() }
    try {
      localStorage.setItem(key(jobId), JSON.stringify(payload))
      setSavedAt(payload.updatedAt)
      setStatus('saved')
    } catch {
      // Quota or a private window. Say nothing rather than claim a save that
      // did not happen — the indicator falls back to idle.
      setStatus('idle')
    }
  }, [jobId])

  const save = useCallback(
    (next) => {
      if (!enabled || !jobId) return
      pending.current = next
      setStatus('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [enabled, jobId, flush],
  )

  // A refresh or a tab close mid-debounce must not lose the last half second.
  useEffect(() => {
    const onHide = () => { if (pending.current) flush() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      if (pending.current) flush()
    }
  }, [flush])

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    pending.current = null
    clearDraft(jobId)
    setDraft(null)
    setStatus('idle')
    setSavedAt(null)
  }, [jobId])

  return { draft, loaded, status, savedAt, save, clear }
}
