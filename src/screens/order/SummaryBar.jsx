import React from 'react'
import {
  AlertCircle,
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
import { branches, order } from '../../data/order.js'

/**
 * Screen 3 — the sticky action bar pinned to the bottom of the order builder.
 * Two jobs: keep the running subtotal in view while the rep scrolls the line
 * items, and gate the create/export actions until every line has a product
 * selected. Nothing here can be fired while `outstanding > 0`.
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
    hint: 'Customer picks up at the branch',
  },
]

const EXPORT_OPTIONS = [
  { label: 'Export as PDF', icon: FileDown },
  { label: 'Export as CSV', icon: Sheet },
  { label: 'Copy to clipboard', icon: ClipboardCopy },
  { label: 'Send to ERP', icon: Send },
]

const TOTAL_HELP =
  'Extended price of every matched line at this account’s contract pricing. Freight, tax and any manual adjustments land when the invoice is cut.'

const BLOCKED_TIP = 'Select a product for every line item to enable this.'

export default function SummaryBar({ total, outstanding, defaultMenuOpen = false, onShowOutstanding }) {
  const toast = useToast()
  const blocked = outstanding > 0

  const onCreate = (opt) => {
    const label = opt?.label ?? CREATE_OPTIONS[0].label
    if (label === 'Create order') {
      toast?.success('Order released', {
        description: `Committed to ${branches.ship} · pick ticket queued`,
      })
    } else if (label === 'Create ship when available order') {
      toast?.success('Backorder created', {
        description: `Lines release from ${branches.ship} as stock lands`,
      })
    } else if (label === 'Create will call order') {
      toast?.success('Will call order created', {
        description: `Hold at ${branches.price} counter for pickup`,
      })
    } else {
      toast?.success('Quote Q-118342 created', {
        description: `${money(total)} · emailed to the requester, good for 30 days`,
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
          <div className="min-w-0">
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
                    description: 'Unit price and discount are editable on every line',
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

          <div className="ml-auto flex items-center gap-2">
            <Tooltip content={blocked ? BLOCKED_TIP : null} side="top" width="w-56">
              <SplitButton
                label="Create Quote"
                variant="primary"
                options={CREATE_OPTIONS}
                onSelect={onCreate}
                disabled={blocked}
                defaultOpen={defaultMenuOpen}
              />
            </Tooltip>

            <Tooltip content={blocked ? BLOCKED_TIP : null} side="top" width="w-56">
              <SplitButton
                label="Export"
                variant="secondary"
                options={EXPORT_OPTIONS}
                onSelect={onExport}
                disabled={blocked}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
