import React from 'react'
import {
  AlertCircle,
  Check,
  CloudUpload,
  FileText,
  PackageCheck,
  CalendarClock,
  Store,
  FileDown,
  Sheet,
  ClipboardCopy,
  Send,
} from 'lucide-react'
import { SplitButton, Tooltip, HelpTip, money } from '../../ui/primitives.jsx'
import { useToast } from '../../ui/toast.jsx'
import { contact, order } from '../../data/order.js'

/**
 * Screen 3 — the sticky action bar pinned to the bottom of the order builder.
 *
 * MOCK: keeps the running subtotal in view while the rep scrolls the line
 * items, and gates create/export until every line has a product selected.
 *
 * LIVE: the same split button submits to the review queue. There is no P21
 * connection, so there is no price to total — a "Pricing needs P21" note sits
 * where the subtotal does rather than a $0.00 nobody should read as a number.
 * Export is off for the same reason: a quote PDF with no prices is worse than
 * no PDF.
 */

const CREATE_OPTIONS = [
  {
    label: 'Create quote',
    icon: FileText,
    hint: 'A priced quote the customer can accept',
  },
  {
    label: 'Create order',
    icon: PackageCheck,
    hint: 'Commit stock and release to the warehouse',
  },
  {
    label: 'Create ship when available order',
    icon: CalendarClock,
    hint: 'Backorder — release each line as stock lands',
  },
  {
    label: 'Create will call order',
    icon: Store,
    hint: 'Customer picks up at the counter',
  },
]

/**
 * Live mode says what each option RECORDS, not what the warehouse does with
 * it — because that is the consequential half here. A submission marked quote
 * enters the open-quote index and can cause a real purchase order to be
 * skipped weeks later; one marked order cannot.
 */
const LIVE_CREATE_OPTIONS = CREATE_OPTIONS.map((o) => ({
  ...o,
  hint:
    o.label === 'Create quote'
      ? 'Recorded as a QUOTE — it enters the open-quote index and can gate a later PO'
      : 'Recorded as an ORDER — nothing is added to the quote index',
}))

/**
 * Which `submission_type` each option sends. Only "Create quote" records a
 * QUOTE — and that distinction is load-bearing, not cosmetic: a quote goes into
 * the open-quote index, and an order wrongly recorded as one would gate a real
 * purchase order weeks later. Ship-when-available and will call are both orders
 * as far as the review queue is concerned; the distinction between them lives
 * in the ERP, which this does not reach yet.
 */
const SUBMISSION_TYPE = {
  'Create quote': 'quote',
  'Create order': 'order',
  'Create ship when available order': 'order',
  'Create will call order': 'order',
}

const EXPORT_OPTIONS = [
  { label: 'Export as PDF', icon: FileDown },
  { label: 'Export as CSV', icon: Sheet },
  { label: 'Copy to clipboard', icon: ClipboardCopy },
  { label: 'Send to ERP', icon: Send },
]

const TOTAL_HELP =
  'Extended price of every matched line at this account’s contract pricing. Freight, tax and any manual adjustments land when the invoice is cut.'

const BLOCKED_TIP = 'Select a product for every line item to enable this.'

export default function SummaryBar(props) {
  return props.live ? <LiveSummaryBar {...props} /> : <MockSummaryBar {...props} />
}

/* ------------------------------------------------------------------- live */

/**
 * "Is my work safe if I close this?" — the question the rep actually has
 * halfway through a 16-line review. Until drafts existed the honest answer was
 * no, and nothing on screen said so. See src/live/useDraft.js.
 */
function DraftIndicator({ status, savedAt }) {
  if (status === 'idle') return null
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
        <CloudUpload className="size-3 shrink-0 animate-pulse" strokeWidth={2} />
        Saving your progress…
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
      <Check className="size-3 shrink-0" strokeWidth={2.5} />
      Progress saved{savedAt ? ` · ${relTime(savedAt)}` : ''}
    </span>
  )
}

function relTime(ts) {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

function LiveSummaryBar({
  outstanding,
  lineCount,
  canSubmit,
  submitting,
  readOnly,
  missingCustomer,
  missingOrderRef,
  error,
  onSubmit,
  draftStatus = 'idle',
  draftSavedAt = null,
}) {
  const missingFields = [missingCustomer && 'Customer #', missingOrderRef && 'Order / Quote #'].filter(
    Boolean,
  )
  const blocked = !canSubmit

  const tip = readOnly
    ? 'This email has already been submitted.'
    : outstanding > 0
      ? 'Pick between the equivalent item IDs on every outstanding line to enable this.'
      : missingFields.length
        ? `${missingFields.join(' and ')} ${missingFields.length === 1 ? 'is' : 'are'} required.`
        : null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="h-7 bg-gradient-to-b from-transparent to-ink-100" />

      <div className="pointer-events-auto border-t border-ink-200 bg-white/95 px-5 py-3 shadow-[0_-1px_3px_0_rgb(15_23_42_/_0.06)] backdrop-blur">
        {error && (
          <div
            role="alert"
            className="mb-2.5 flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2"
          >
            <AlertCircle className="mt-px size-4 shrink-0 text-red-500" strokeWidth={2.25} />
            <p className="text-[12px] leading-5 font-medium text-red-800">{error}</p>
          </div>
        )}

        {!readOnly && outstanding > 0 && (
          <div
            role="status"
            className="mb-2.5 flex items-center gap-2.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2"
          >
            <AlertCircle className="size-4 shrink-0 text-red-500" strokeWidth={2.25} />
            <p className="text-[12px] font-medium text-red-800">
              {outstanding === 1
                ? '1 line item is outstanding and needs an item ID picked'
                : `${outstanding} line items are outstanding and need an item ID picked`}
            </p>
          </div>
        )}

        {!readOnly && outstanding === 0 && missingFields.length > 0 && (
          <div
            role="status"
            className="mb-2.5 flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2"
          >
            <AlertCircle className="size-4 shrink-0 text-amber-500" strokeWidth={2.25} />
            <p className="text-[12px] font-medium text-amber-900">
              {missingFields.join(' and ')} {missingFields.length === 1 ? 'is' : 'are'} required
              before this can be submitted.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                Total
              </span>
              <span className="text-[13px] font-medium text-ink-500">Pricing needs P21</span>
              <HelpTip
                side="top"
                content="Unit price, availability and totals come from Prophet 21. Until that connection exists this screen shows no numbers rather than placeholder ones."
              />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate text-[11px] text-ink-400">
                {readOnly
                  ? 'Already submitted to the review queue.'
                  : `${lineCount} line${lineCount === 1 ? '' : 's'} · submitting writes them to review_queue2.csv`}
              </p>
              {!readOnly && <DraftIndicator status={draftStatus} savedAt={draftSavedAt} />}
            </div>
          </div>

          <Tooltip content={tip} side="top" width="w-60">
            <span className="ml-auto flex items-center gap-2">
              <SplitButton
                label={submitting ? 'Saving…' : 'Create Quote'}
                variant="primary"
                options={LIVE_CREATE_OPTIONS}
                onSelect={(opt) => onSubmit(SUBMISSION_TYPE[opt?.label ?? 'Create quote'] ?? 'order')}
                disabled={blocked || submitting}
              />
              <SplitButton
                label="Export"
                variant="secondary"
                options={EXPORT_OPTIONS}
                onSelect={() => {}}
                disabled
              />
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- mock */

function MockSummaryBar({ total, outstanding, defaultMenuOpen = false, onShowOutstanding }) {
  const toast = useToast()
  const blocked = outstanding > 0

  const onCreate = (opt) => {
    const label = opt?.label ?? CREATE_OPTIONS[0].label
    if (label === 'Create order') {
      toast?.success('Order 118342 released', { description: 'Committed and sent to the warehouse' })
    } else if (label === 'Create ship when available order') {
      toast?.success('Ship-when-available order created', {
        description: 'Each line releases as stock lands',
      })
    } else if (label === 'Create will call order') {
      toast?.success('Will call order created', { description: 'Ready for customer pickup' })
    } else {
      toast?.success('Quote Q-118342 created', {
        description: `${money(total)} · sent to ${contact.name}`,
      })
    }
  }

  const onExport = (opt) => {
    const label = opt?.label ?? EXPORT_OPTIONS[0].label
    if (label === 'Copy to clipboard') {
      navigator.clipboard
        ?.writeText?.(`${order.subject} — ${order.customerPO} — subtotal ${money(total)}`)
        .catch(() => {})
      toast?.success('Copied to clipboard', { description: 'Order summary, tab-separated' })
    } else if (label === 'Send to ERP') {
      toast?.info('Queued for the ERP', { description: 'Posts on the next sync, about 2 min' })
    } else {
      toast?.success(`${label.replace('Export as ', '')} ready`, {
        description: `riverbend-ph2-${label.endsWith('CSV') ? 'lines.csv' : 'quote.pdf'}`,
      })
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      {/* Scrolled content fades out under the bar instead of being sliced off. */}
      <div className="h-7 bg-gradient-to-b from-transparent to-ink-100" />

      <div className="pointer-events-auto border-t border-ink-200 bg-white/95 px-5 py-3 shadow-[0_-1px_3px_0_rgb(15_23_42_/_0.06)] backdrop-blur">
        {blocked && (
          <div
            role="status"
            className="mb-2.5 flex items-center gap-2.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2"
          >
            <AlertCircle className="size-4 shrink-0 text-red-500" strokeWidth={2.25} />
            <p className="text-[12px] font-medium text-red-800">
              {outstanding === 1
                ? '1 line item is outstanding and needs data selected'
                : `${outstanding} line items are outstanding and need data selected`}
            </p>
            <button
              type="button"
              onClick={() => onShowOutstanding?.()}
              className="ml-auto shrink-0 text-[12px] font-semibold text-red-700 transition-colors hover:text-red-800 hover:underline"
            >
              Show outstanding line items →
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                Total
                <HelpTip content={TOTAL_HELP} side="top" />
              </span>
              <span className="nums text-[19px] font-semibold tracking-[-0.01em] text-ink-900">
                {money(total)}
              </span>
              <button
                type="button"
                onClick={() =>
                  toast?.info('Line pricing unlocked', {
                    description: 'Unit price and discount now editable',
                  })
                }
                className="shrink-0 text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline"
              >
                Edit pricing →
              </button>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-400">
              Subtotal · freight and tax calculated at invoice
              {blocked && ` (excludes ${outstanding} unmatched)`}
            </p>
          </div>

          {/* One tooltip over the pair: both are gated by the same condition, and
              centering it on the group keeps it inside the pane's right edge. */}
          <Tooltip content={blocked ? BLOCKED_TIP : null} side="top" width="w-56">
            <span className="ml-auto flex items-center gap-2">
              <SplitButton
                label="Create Quote"
                variant="primary"
                options={CREATE_OPTIONS}
                onSelect={onCreate}
                disabled={blocked}
                defaultOpen={defaultMenuOpen}
              />
              <SplitButton
                label="Export"
                variant="secondary"
                options={EXPORT_OPTIONS}
                onSelect={onExport}
                disabled={blocked}
              />
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
