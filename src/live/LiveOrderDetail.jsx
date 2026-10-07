import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, Button, Card } from '../ui/primitives.jsx'
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
import { AUTH_ERROR } from './api.js'
import { useJob } from './useJob.js'
import { linesForJob } from './parse.js'
import { parseAddress } from './adapt.js'

const blankLine = () => ({ chosen: null, chosenDesc: '', flagged: false, notes: '', manualId: '' })

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

  const [lineState, setLineState] = useState({})
  const [customerId, setCustomerId] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [busyAction, setBusyAction] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const prefilled = useRef(false)

  const readOnly = job?.status === 'submitted'

  const { lines, notes, sawTable } = useMemo(
    () => (job ? linesForJob(job) : { lines: [], notes: [], sawTable: false }),
    [job],
  )

  // Add state for rows that appear (a prediction landing on a poll) without
  // touching rows the rep has already worked on.
  useEffect(() => {
    if (!lines.length) return
    setLineState((prev) => {
      let changed = false
      const next = { ...prev }
      for (const l of lines) {
        if (!next[l.n]) {
          next[l.n] = blankLine()
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [lines])

  // Prefill once. A later poll must not overwrite a number the rep has typed.
  useEffect(() => {
    if (!job || prefilled.current) return
    prefilled.current = true
    if (job.customer_id) setCustomerId(job.customer_id)
    if (job.order_ref) setOrderRef(job.order_ref)
  }, [job])

  const onLineChange = useCallback((n, next) => {
    setLineState((prev) => ({ ...prev, [n]: next }))
  }, [])

  /**
   * The submission batch — inbox.html's activePredictions(), reproduced key for
   * key. The server reads these straight into review_queue2.csv rows, so the
   * shape is a contract, not a convenience.
   *
   * Only lines still on THIS entry are included: a row split away belongs to
   * its own entry and is submitted from there (parse.js already drops them).
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
          // inbox.html falls back to the id when a choice carried no pairable
          // description, so the column is never blank.
          item_description = s.chosenDesc || s.chosen || ''
        } else if (c.kind === 'none') {
          // The rep may know the answer the model did not. Typing one replaces
          // NO_PREDICTION; leaving it blank submits NO_PREDICTION, which is a
          // real result and deliberately does not block submit.
          predicted_item_id = s.manualId.trim() || c.submitId
          item_description = c.submitDesc
        } else {
          // Single, make-up (" & " kept joined, exactly as /inbox submits it)
          // and FAB all submit the cell as the model wrote it.
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

  const outstanding = lines.filter(
    (l) => l.classified.kind === 'choice' && !(lineState[l.n]?.chosen),
  ).length
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
        toast?.success(
          `Saved ${data.count} prediction(s) for ${submissionType === 'quote' ? 'quote' : 'order'} ${orderRef.trim()}`,
          { description: 'Written to the review queue' },
        )
        await reload()
      } catch (e) {
        if (e.message === AUTH_ERROR) return
        // Each of these means something different to the rep, and none of them
        // may clear their work — the line state stays exactly as it is.
        if (e.status === 409) {
          // The server's own text already names the order it was submitted as,
          // which is more use than a generic "already submitted".
          setSubmitError(e.message)
          await reload()
        } else if (e.status === 502) {
          setSubmitError(
            'Saved locally but could not push — try again in a moment. Nothing you have entered has been lost.',
          )
        } else {
          setSubmitError(e.message)
        }
      } finally {
        setSubmitting(false)
      }
    },
    [canSubmit, submitting, submit, orderRef, customerId, predictions, toast, reload],
  )

  const guard = async (fn, label) => {
    setBusyAction(true)
    try {
      await fn()
    } catch (e) {
      if (e.message !== AUTH_ERROR) toast?.warning(label, { description: e.message })
    } finally {
      setBusyAction(false)
    }
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

  return (
    <>
      <LiveTopBar
        job={job}
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

            {/* ------------------------------------------------ notes box */}
            {/* Trailing text that is not aimed at a specific row: the model's
                own reasoning notes, and anything it wanted to say about the
                order as a whole. Row-specific follow-ups sit on their row. */}
            {notes.length > 0 && (
              <Card className="mt-4 p-3">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                  Notes from the prediction
                </p>
                <div className="mt-1.5 space-y-1">
                  {notes.map((t, i) => (
                    <p key={i} className="text-[12px] leading-5 text-ink-600">
                      {t}
                    </p>
                  ))}
                </div>
              </Card>
            )}

            {/* --------------------------------------------------- products */}
            <section aria-label="Products" className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink-900">Products</h2>
                <Badge tone="slate" className="nums">
                  {lines.length}
                </Badge>
                {lines.length > 0 && (
                  <span className="ml-auto text-[11px] text-ink-500">
                    <span className="nums">{lines.length - outstanding}</span> matched ·{' '}
                    <span
                      className={
                        outstanding === 0
                          ? 'nums font-medium text-emerald-600'
                          : 'nums font-medium text-amber-600'
                      }
                    >
                      {outstanding} outstanding
                    </span>
                  </span>
                )}
              </div>

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
