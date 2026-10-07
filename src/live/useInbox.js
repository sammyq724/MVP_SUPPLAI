import { useCallback, useEffect, useRef, useState } from 'react'
import { api, AUTH_ERROR } from './api.js'
import { LIST_POLL_MS } from './config.js'
import { summaryToRow } from './adapt.js'

/**
 * The inbox list, polled the way /inbox polls it: every 10 seconds, silently,
 * so an email that arrives while the rep is looking at the queue shows up
 * without a refresh. A failed poll keeps the rows already on screen — a blank
 * queue would read as "no work" when it means "one request failed".
 */
export function useInbox({ enabled = true } = {}) {
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ needs_review: 0, submitted: 0, skipped: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaded = useRef(false)

  const load = useCallback(
    async (silent) => {
      try {
        const data = await api('/api/inbox/list')
        setRows((data.jobs || []).map(summaryToRow))
        setCounts(data.counts || {})
        setError('')
        loaded.current = true
      } catch (e) {
        if (e.message === AUTH_ERROR) return
        if (!silent || !loaded.current) setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return
    load()
    const t = setInterval(() => load(true), LIST_POLL_MS)
    return () => clearInterval(t)
  }, [enabled, load])

  /**
   * Sam's blue "come back to this one" marker. Painted immediately rather than
   * after the round trip — it is a one-bit toggle he may click down a whole
   * list, and a 10s poll would otherwise be the first visible confirmation.
   * Reverted in place if the server did not record it.
   */
  const setFlag = useCallback(async (id, next) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, flagged: next } : r)))
    try {
      await api('/api/inbox/flag', { id, flagged: next })
    } catch (e) {
      if (e.message !== AUTH_ERROR) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, flagged: !next } : r)))
        throw e
      }
    }
  }, [])

  const dismiss = useCallback(
    async (id) => {
      await api('/api/inbox/dismiss', { id })
      setRows((rs) => rs.filter((r) => r.id !== id))
      load(true)
    },
    [load],
  )

  return { rows, counts, loading, error, reload: load, setFlag, dismiss }
}
