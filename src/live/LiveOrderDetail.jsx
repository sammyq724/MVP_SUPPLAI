import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Scissors, X } from 'lucide-react'
import { Badge, Button, Card, cx } from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'
import QuoteToPanel from '../screens/order/QuoteToPanel.jsx'
import ShipToPanel from '../screens/order/ShipToPanel.jsx'
import OrderMetaPanel from '../screens/order/OrderMetaPanel.jsx'
import SummaryBar from '../screens/order/SummaryBar.jsx'
import LiveSourcePane from './LiveSourcePane.jsx'
import LiveLineBlock from './LiveLineBlock.jsx'
import LiveBanners from './LiveBanners.jsx'
import LiveTopBar from './LiveTopBar.jsx'
import ConfirmDelete from './ConfirmDelete.jsx'
import { AUTH_ERROR, api } from './api.js'
import { useJob } from './useJob.js'
import { useDraft } from './useDraft.js'
import { linesForJob } from './parse.js'
import { parseAddress } from './adapt.js'

const blankLine = () => ({ chosen: null, chosenDesc: '', flagged: false, notes: '', manualId: '' })

/** The page's half of the server's guardrail — see /api/inbox/split. */
const MUST_LEAVE_ONE = 'Must leave at least one item in the original quote.'

/**
 * Screen 3, live.
 *
 * The right pane is built from `job.parts[].result` — the model's markdown
 * answers in rules.md's mandatory 5-column format — parsed by src/live/parse.js,
 * which is a port of /inbox's parser (see that file). Row numbers run
 * continuously across parts and rows listed in `split_off_rows` are hidden,
 * because those lines now live on a different entry and submitting them twice
 * would double the order.
 */
export default function LiveOrderDetail({ id, navigate }) {
  const toast = useToast()
  const { job, loading, error, reload, retry, predictAnyway, dismiss, setFlag, submit } = useJob(id)
  const draft = useDraft(id)

  const [lineState, setLineState] = useState({})
  const [customerId, setCustomerId] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [busyAction, setBusyAction] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [splitSel, setSplitSel] = useState(() => new Set())
  const [splitting, setSplitting] = useState(false)
  const [splitMsg, setSplitMsg] = useState('')
  const seeded = useRef(false)

  const readOnly = job?.status === 'submitted'

  const { lines, notes, sawTable } = useMemo(
    () => (job ? linesForJob(job) : { lines: [], notes: [], sawTable: false }),
    [job],
  )

  /* ----------------------------------------------------------- draft seed */
  // Seeded once, from the draft if there is one, otherwise from the job. A
  // later poll must never overwrite work in progress.
  useEffect(() => {
    if (!job || !draft.loaded || seeded.current) return
    seeded.current = true
    const d = draft.draft
    setCustomerId(d?.customerId ?? job.customer_id ?? '')
    setOrderRef(d?.orderRef ?? job.order_ref ?? '')
    if (d?.lineState) setLineState(d.lineState)
  }, [job, draft.loaded, draft.draft])

  // New rows (a prediction landing on a poll) get blank state; rows the rep has
  // already worked on are left exactly as they are.
  useEffect(() => {
    if (!lines.length) return
    setLineState((prev) => {
      let changed = false
      const next = { ...prev }
      for (const l of lines) {
        if (!next[l.n]) { next[l.n] = blankLine(); changed = true }
      }
      return changed ? next : prev
    })
  }, [lines])

  /* ----------------------------------------------------------- draft save */
  useEffect(() => {
    if (!seeded.current || readOnly || !job) return
    // Only rows still on this entry: a row moved away by a split has its state
    // on the child now, and keeping it here would hold the draft "in progress"
    // forever over lines that are no longer on the page.
    const live = new Set(lines.map((l) => l.n))
    const pruned = Object.fromEntries(Object.entries(lineState).filter(([n]) => live.has(Number(n))))
    draft.save({ lineState: pruned, customerId, orderRef })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineState, customerId, orderRef, readOnly, lines])

  const onLineChange = useCallback((n, next) => {
    setLineState((prev) => ({ ...prev, [n]: next }))
  }, [])

  /* ------------------------------------------------------------- submit */
  /**
   * The submission batch — inbox.html's activePredictions(), reproduced key for
   * key. The server reads these straight into review_queue2.csv rows, so the
   * shape is a contract, not a convenience.
   */
  const predictions = useMemo(
    () =>
      lines.map((l) => {
        const s = lineState[l.n] || blankLine()
        const c = l.classified
        let predicted_item_id
        let item_description
        if (c.kind === 'choice') {
          predicted_item_id = s.chosen || ''
          item_description = s.chosenDesc || s.chosen || ''
        } else if (c.kind === 'none') {
          predicted_item_id = s.manualId.trim() || c.submitId
          item_description = c.submitDesc
        } else {
          predicted_item_id = c.submitId
          item_description = c.submitDesc
        }
        return {
          n: l.n,
          timestamp: l.timestamp || job?.predicted_at || job?.received_at,
          input_text: l.input_text,
          quantity: l.quantity,
          predicted_item_id,
          item_description,
          flagged_incorrect: !!s.flagged,
          notes: s.notes || '',
          latency_ms: l.latency_ms != null ? l.latency_ms : job?.latency_ms,
          cost_usd: l.cost_usd != null ? l.cost_usd : job?.cost_usd,
        }
      }),
    [lines, lineState, job],
  )

  const outstanding = lines.filter((l) => l.classified.kind === 'choice' && !lineState[l.n]?.chosen).length
  const missingCustomer = !customerId.trim()
  const missingOrderRef = !orderRef.trim()
  const canSubmit = !readOnly && lines.length > 0 && !outstanding && !missingCustomer && !missingOrderRef

  const doSubmit = useCallback(
    async (submissionType) => {
      setAttempted(true)
      setSubmitError('')
      if (!canSubmit || submitting) return
      setSubmitting(true)
      try {
        const data = await submit({
          order_ref: orderRef.trim(),
          customer_id: customerId.trim(),
          submission_type: submissionType,
          predictions,
        })
        // The real record is on the server now; a kept draft could only ever be
        // stale, and would hold the email in the In Progress tab forever.
        draft.clear()
        toast?.success(
          `Saved ${data.count} prediction(s) for ${submissionType === 'quote' ? 'quote' : 'order'} ${orderRef.trim()}`,
          { description: 'Written to the review queue' },
        )
        await reload()
      } catch (e) {
        if (e.message === AUTH_ERROR) return
        // Each means something different, and none of them may clear the rep's
        // work — the draft is untouched on every one of these paths.
        if (e.status === 409) { setSubmitError(e.message); await reload() }
        else if (e.status === 502) {
          setSubmitError('Saved locally but could not push — try again in a moment. Nothing you have entered has been lost.')
        } else setSubmitError(e.message)
      } finally {
        setSubmitting(false)
      }
    },
    [canSubmit, submitting, submit, orderRef, customerId, predictions, toast, reload, draft],
  )

  /* -------------------------------------------------------- split quote */
  const canSplit = job?.status === 'ready' && lines.length > 1
  const remaining = lines.length - splitSel.size
  const splitBlocked = splitSel.size > 0 && remaining < 1

  const toggleSplit = useCallback((n, on) => {
    setSplitMsg('')
    setSplitSel((prev) => {
      const next = new Set(prev)
      if (on) next.add(n)
      else next.delete(n)
      return next
    })
  }, [])

  const leaveSplitMode = useCallback(() => {
    setSplitMode(false)
    setSplitSel(new Set())
    setSplitMsg('')
  }, [])

  const doSplit = useCallback(async () => {
    if (!splitSel.size || splitting) return
    if (splitBlocked) { setSplitMsg(MUST_LEAVE_ONE); return }
    setSplitting(true)
    setSplitMsg('')
    try {
      // What the rep already did to the moving rows travels with them: a red X,
      // a note or a two-choice pick is not lost in the move.
      const row_state = {}
      for (const n of splitSel) {
        const s = lineState[n] || blankLine()
        row_state[n] = { flagged_incorrect: !!s.flagged, notes: s.notes || '', chosen_id: s.chosen || '' }
      }
      const data = await api('/api/inbox/split', {
        id,
        row_numbers: [...splitSel].sort((a, b) => a - b),
        row_state,
      })
      leaveSplitMode()
      toast?.success(`Split off ${data.moved} line(s) into a new entry`, {
        description: `${data.remaining} line(s) stay on this one`,
      })
      await reload()
    } catch (e) {
      if (e.message !== AUTH_ERROR) setSplitMsg(e.message)
    } finally {
      setSplitting(false)
    }
  }, [splitSel, splitting, splitBlocked, lineState, id, toast, reload, leaveSplitMode])

  /* --------------------------------------------------------------- misc */
  const guard = async (fn, label) => {
    setBusyAction(true)
    try { await fn() } catch (e) {
      if (e.message !== AUTH_ERROR) toast?.warning(label, { description: e.message })
    } finally { setBusyAction(false) }
  }

  if (loading && !job) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-ink-400" strokeWidth={2} />
      </div>
    )
  }
  if (!job) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[13px] font-medium text-ink-800">{error || 'No such email.'}</p>
        <Button onClick={() => navigate('inbox')}>Back to inbox</Button>
      </div>
    )
  }

  const who = parseAddress(job.from)
  const inProgress = !readOnly && draft.status !== 'idle'

  return (
    <>
      <LiveTopBar
        job={job}
        inProgress={inProgress}
        onBack={() => navigate('inbox')}
        onFlag={(next) => guard(() => setFlag(next), 'Could not flag this email')}
        onDelete={() => setConfirming(true)}
      />

      <div className="flex min-h-0 flex-1">
        <LiveSourcePane job={job} />

        <section className="relative flex min-w-0 flex-1 flex-col bg-ink-100">
          <div data-scroll="builder" className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-40">
            <LiveBanners
              job={job}
              busy={busyAction}
              onRetry={() => guard(retry, 'Could not retry')}
              onPredictAnyway={() => guard(predictAnyway, 'Could not start that prediction')}
            />

            <div className="mt-3 grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
              <QuoteToPanel
                live
                customerId={customerId}
                onCustomerId={setCustomerId}
                customerName={job.customer_name}
                contactName={who.name}
                contactEmail={who.email}
                showRequired={attempted && missingCustomer}
                readOnly={readOnly}
              />
              <ShipToPanel live readOnly={readOnly} />
              <OrderMetaPanel
                live
                orderRef={orderRef}
                onOrderRef={setOrderRef}
                showRequired={attempted && missingOrderRef}
                readOnly={readOnly}
                job={job}
                lineCount={lines.length}
              />
            </div>

            {/* Trailing text not aimed at a specific row: the model's own
                reasoning notes. Row-specific follow-ups sit on their row. */}
            {notes.length > 0 && (
              <Card className="mt-4 p-3">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                  Notes from the prediction
                </p>
                <div className="mt-1.5 space-y-1">
                  {notes.map((t, i) => (
                    <p key={i} className="text-[12px] leading-5 text-ink-600">{t}</p>
                  ))}
                </div>
              </Card>
            )}

            {/* --------------------------------------------------- products */}
            <section aria-label="Products" className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink-900">Products</h2>
                <Badge tone="slate" className="nums">{lines.length}</Badge>

                {canSplit && !readOnly && !splitMode && (
                  <Button size="sm" icon={Scissors} onClick={() => setSplitMode(true)}>
                    Split Quote
                  </Button>
                )}

                {lines.length > 0 && (
                  <span className="ml-auto text-[11px] text-ink-500">
                    <span className="nums">{lines.length - outstanding}</span> matched ·{' '}
                    <span className={outstanding === 0 ? 'nums font-medium text-emerald-600' : 'nums font-medium text-amber-600'}>
                      {outstanding} outstanding
                    </span>
                  </span>
                )}
              </div>

              {/* ------------------------------------------------ split bar */}
              {/* Just a button until clicked: the checkbox column is noise on an
                  ordinary order (Sam). Clicking it reveals the checkboxes, the
                  split button and Cancel. */}
              {splitMode && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2">
                  <span className="text-[12px] font-medium text-brand-900">
                    Tick the lines that belong to a separate job.
                  </span>
                  <span className="nums text-[12px] text-brand-700">
                    {splitSel.size} selected · {remaining} would stay
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={doSplit}
                      disabled={!splitSel.size || splitBlocked || splitting}
                    >
                      {splitting ? 'Splitting…' : `Split off ${splitSel.size} line${splitSel.size === 1 ? '' : 's'}`}
                    </Button>
                    <Button size="sm" onClick={leaveSplitMode} disabled={splitting}>Cancel</Button>
                  </div>
                  {(splitBlocked || splitMsg) && (
                    <p className="w-full text-[12px] font-medium text-red-700">
                      {splitMsg || MUST_LEAVE_ONE}
                    </p>
                  )}
                </div>
              )}

              {lines.map((l, i) => (
                <React.Fragment key={l.n}>
                  {/* A divider whenever the part changes, so a 30-line email
                      reads as the three chunks it was predicted in. */}
                  {l.label !== lines[i - 1]?.label && (
                    <p className="mt-3 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                      {l.label}
                    </p>
                  )}
                  <LiveLineBlock
                    line={l}
                    state={lineState[l.n] || blankLine()}
                    onChange={onLineChange}
                    readOnly={readOnly}
                    splitMode={splitMode}
                    splitChecked={splitSel.has(l.n)}
                    onSplitToggle={toggleSplit}
                  />
                </React.Fragment>
              ))}

              {lines.length === 0 && job.status !== 'pending' && (
                <Card className="mt-2.5 px-6 py-10 text-center">
                  <p className="text-[13px] font-semibold text-ink-800">
                    {sawTable ? 'Every line has been split off this entry.' : 'No item lines on this email.'}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-ink-500">
                    {job.status === 'skipped'
                      ? 'Nothing was predicted — the quote gate matched this to a quote already on file.'
                      : 'There is nothing to review or submit here.'}
                  </p>
                </Card>
              )}
            </section>
          </div>

          <SummaryBar
            live
            outstanding={outstanding}
            lineCount={lines.length}
            canSubmit={canSubmit}
            submitting={submitting}
            readOnly={readOnly}
            missingCustomer={missingCustomer}
            missingOrderRef={missingOrderRef}
            error={submitError}
            onSubmit={doSubmit}
            draftStatus={draft.status}
            draftSavedAt={draft.savedAt}
          />
        </section>
      </div>

      <ConfirmDelete
        job={job}
        open={confirming}
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setDeleting(true)
          try {
            await dismiss()
            draft.clear()
            navigate('inbox')
          } catch (e) {
            if (e.message !== AUTH_ERROR) toast?.warning('Could not delete this email', { description: e.message })
            setDeleting(false)
            setConfirming(false)
          }
        }}
      />
    </>
  )
}
