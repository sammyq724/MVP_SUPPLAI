import React, { useState, useRef, useEffect } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { Panel, Field, TextInput, Badge, HelpTip, Button, cx } from '../../ui/primitives.jsx'
import { order, lineItems, HELP } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * Screen 3 header, panel 3 — the ERP fields for the order itself. Customer PO
 * and the ship window are the rep's to edit; order number and writer come back
 * from the ERP and stay locked. The footer is the parse receipt: how fresh the
 * matching is, and the one button that redoes it.
 */

/** Button renders its icon with a fixed className, so spin it via a wrapper. */
const SpinningRefresh = (props) => (
  <RefreshCw {...props} className={cx(props.className, 'animate-spin')} />
)

export default function OrderMetaPanel() {
  const toast = useToast()
  const [po, setPo] = useState(order.customerPO)
  const [shipDate, setShipDate] = useState(order.shipDate)
  const [shipTime, setShipTime] = useState(order.shipTime)
  const [busy, setBusy] = useState(false)
  const [parsedAgo, setParsedAgo] = useState('4 minutes ago')
  const timer = useRef(null)
  const job = useRef(null)
  const toastRef = useRef(toast)
  toastRef.current = toast

  // Navigating away mid-run must not leave the spinner toast up forever.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (job.current) toastRef.current?.dismiss(job.current)
    },
    [],
  )

  const rerun = () => {
    if (busy) return
    setBusy(true)
    const started = Date.now()
    const id = toast?.processing(
      'Re-running matching',
      [
        { label: 'Re-reading source document', startedAt: started },
        { label: 'Scoring catalog candidates', startedAt: started },
      ],
      { defaultExpanded: true },
    )
    job.current = id ?? null
    timer.current = setTimeout(() => {
      if (id) toast?.dismiss(id)
      job.current = null
      toast?.success('Matching complete', {
        description: `${lineItems.length} lines re-scored · 2 still need review`,
      })
      setParsedAgo('just now')
      setBusy(false)
    }, 2400)
  }

  return (
    <Panel
      title="Order"
      help="ERP header fields. Anything greyed out is written by the ERP when the quote or order is created."
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Field label="Customer PO No." help={HELP.customerPO}>
          <TextInput
            value={po}
            onChange={(e) => setPo(e.target.value)}
            placeholder="PO number"
            aria-label="Customer PO number"
            className="nums"
          />
        </Field>

        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1">
            <span className="text-[11px] font-medium tracking-[0.01em] text-ink-500">
              Order Number
            </span>
            <HelpTip content={HELP.orderNumber} />
          </div>
          <div className="flex h-8 items-center rounded-lg border border-ink-200 bg-ink-50 px-2.5">
            <Badge tone="amber">Pending</Badge>
          </div>
        </div>

        <Field label="Writer" help={HELP.writer} className="col-span-2">
          <TextInput
            readOnly
            value={order.writer}
            icon={Lock}
            suffix="You"
            aria-label="Writer"
            /* read-only:* rather than plain utilities — a bare bg-ink-50 loses
               to the primitive's bg-white on stylesheet order, so the locked
               field would otherwise look editable next to Customer PO. */
            className="read-only:cursor-default read-only:border-ink-200 read-only:bg-ink-50 read-only:text-ink-500 read-only:shadow-none read-only:hover:border-ink-200"
          />
        </Field>

        <Field label="Ship Date">
          <TextInput
            type="date"
            value={shipDate}
            onChange={(e) => setShipDate(e.target.value)}
            aria-label="Ship date"
            className="nums"
          />
        </Field>

        <Field label="Ship Time" help="Time the truck is expected on site. Used to pick the route cutoff.">
          <TextInput
            type="time"
            value={shipTime}
            onChange={(e) => setShipTime(e.target.value)}
            aria-label="Ship time"
            className="nums"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink-200 pt-2.5">
        <p className="min-w-0 flex-1 text-[11px] leading-4 text-ink-500">
          Last parsed {parsedAgo} · {lineItems.length} line items
        </p>
        <Button
          variant="ghost"
          size="xs"
          icon={busy ? SpinningRefresh : RefreshCw}
          onClick={rerun}
          disabled={busy}
        >
          {busy ? 'Matching…' : 'Re-run matching'}
        </Button>
      </div>
    </Panel>
  )
}
