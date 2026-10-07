import { useCallback, useEffect, useRef, useState } from 'react'
import { api, AUTH_ERROR } from './api.js'
import { DETAIL_POLL_MS } from './config.js'

/**
 * One email, with the actions its status allows.
 *
 * Polls only while there is something to wait for — a `pending` job is mid
 * prediction, everything else is final until the rep does something. Same rule
 * and same 4s interval as inbox.html's loadDetail.
 */
export function useJob(id, { enabled = true } = {}) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const timer = useRef(null)

  const stop = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
  }

  const load = useCallback(async () => {
    if (!id) return null
    try {
      const data = await api('/api/inbox/get', { id })
      setJob(data.job)
      setError('')
      return data.job
    } catch (e) {
      if (e.message === AUTH_ERROR) return null
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!enabled || !id) return
    setLoading(true)
    let alive = true
    load().then((j) => {
      if (!alive) return
      stop()
      if (j && j.status === 'pending') timer.current = setInterval(load, DETAIL_POLL_MS)
    })
    return () => { alive = false; stop() }
  }, [id, enabled, load])

  // After any action that can change status, restart the poll on the same rule.
  const reload = useCallback(async () => {
    const j = await load()
    stop()
    if (j && j.status === 'pending') timer.current = setInterval(load, DETAIL_POLL_MS)
    return j
  }, [load])

  const retry = useCallback(async () => {
    await api('/api/inbox/retry', { id })
    return reload()
  }, [id, reload])

  /** Overturns a gate skip: reopens the quote it closed, then predicts. */
  const predictAnyway = useCallback(async () => {
    await api(`/api/skipped/${encodeURIComponent(id)}/predict`, {})
    return reload()
  }, [id, reload])

  const dismiss = useCallback(async () => {
    await api('/api/inbox/dismiss', { id })
  }, [id])

  const setFlag = useCallback(
    async (next) => {
      setJob((j) => (j ? { ...j, flagged: next } : j))
      try {
        await api('/api/inbox/flag', { id, flagged: next })
      } catch (e) {
        if (e.message !== AUTH_ERROR) {
          setJob((j) => (j ? { ...j, flagged: !next } : j))
          throw e
        }
      }
    },
    [id],
  )

  /**
   * The review-queue submission. `predictions` is built by the caller and must
   * be the same shape inbox.html's activePredictions() sends — the server reads
   * those keys straight into review_queue2.csv rows.
   *
   * Errors propagate with their status attached: 409 / 502 / 400 all mean
   * different things to the rep and none of them should clear their work.
   */
  const submit = useCallback(
    async ({ order_ref, customer_id, submission_type, predictions }) =>
      api('/api/submit-order', { job_id: id, order_ref, customer_id, submission_type, predictions }),
    [id],
  )

  return { job, loading, error, reload, retry, predictAnyway, dismiss, setFlag, submit }
}
