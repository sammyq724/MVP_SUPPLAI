import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  MoreVertical,
  Printer,
  Copy,
  Archive,
} from 'lucide-react'
import { Button, IconButton, Menu, StatusPill, cx } from '../../ui/primitives.jsx'
import { STATUS_HELP } from '../../data/queue.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * Screen 3 header — back out to the queue, walk the queue without leaving the
 * request, see where this one stands, and reach the per-request actions.
 * The prev/next pair keeps its own position so both ends of the range render
 * their disabled state; the underlying request is fixed in the mockup.
 */
export default function TopBar({ subject, date, status, index, total, navigate }) {
  const toast = useToast()
  const [pos, setPos] = useState(index)
  useEffect(() => setPos(index), [index])

  const atFirst = pos <= 1
  const atLast = pos >= total
  const back = () => navigate?.('inbox')

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4">
      <IconButton icon={ArrowLeft} label="Back to inbox" onClick={back} />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={back}
          className="shrink-0 text-[13px] font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
        >
          Inbox
        </button>
        <ChevronRight className="size-3.5 shrink-0 text-ink-300" strokeWidth={2} aria-hidden="true" />
        <h1 className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-[13px] font-medium text-ink-900" title={subject}>
            {subject}
          </span>
          <span className="shrink-0 text-[13px] text-ink-400">– {date}</span>
        </h1>
      </nav>

      {/* queue position — walk to the next request without going back to the list */}
      <div className="flex h-7 shrink-0 items-center rounded-lg border border-ink-200 bg-white px-0.5 shadow-panel">
        <IconButton
          icon={ChevronUp}
          label="Previous request"
          size="sm"
          disabled={atFirst}
          onClick={() => setPos((p) => Math.max(1, p - 1))}
          className={cx(atFirst && 'pointer-events-none opacity-35')}
        />
        <span className="nums px-1.5 text-[12px] whitespace-nowrap text-ink-500">
          {pos} of {total}
        </span>
        <IconButton
          icon={ChevronDown}
          label="Next request"
          size="sm"
          disabled={atLast}
          onClick={() => setPos((p) => Math.min(total, p + 1))}
          className={cx(atLast && 'pointer-events-none opacity-35')}
        />
      </div>

      {/* shrink-0 wrapper: the pill's Tooltip span is a plain inline-flex and
          would otherwise get squeezed alongside the truncating breadcrumb. */}
      <span className="shrink-0">
        <StatusPill status={status} tooltip={STATUS_HELP[status]} />
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant="secondary"
          icon={Sparkles}
          className="border-brand-200! bg-brand-50! text-brand-700! hover:border-brand-300! hover:bg-brand-100!"
          onClick={() =>
            toast?.info('Assistant is listening', {
              description: 'Try: “why was the strut clamp flagged?”',
            })
          }
        >
          Ask Assistant
        </Button>

        <Menu
          align="right"
          width="w-52"
          trigger={<IconButton icon={MoreVertical} label="More request actions" />}
          items={[
            {
              label: 'Print',
              icon: Printer,
              shortcut: '⌘P',
              onClick: () => toast?.info('Sent to printer queue'),
            },
            {
              label: 'Duplicate request',
              icon: Copy,
              onClick: () =>
                toast?.success('Request duplicated', { description: 'Draft copy added to the queue' }),
            },
            '-',
            {
              label: 'Archive',
              icon: Archive,
              danger: true,
              onClick: () =>
                toast?.warning('Request archived', { onUndo: () => {}, description: subject }),
            },
          ]}
        />
      </div>
    </header>
  )
}
