import React, { useMemo, useState } from 'react'
import { AlertCircle, ChevronRight, SearchX } from 'lucide-react'
import { Badge, Button, Card, SearchInput, Tooltip, cx } from '../ui/primitives.jsx'
import { useInbox } from './useInbox.js'
import { formatDate, timeAgo } from './adapt.js'

/**
 * History -> Skipped.
 *
 * Emails the quote gate judged to be a release against a quote we had already
 * priced and sent. Nothing was predicted and no review-queue row was written,
 * so there is nothing here to review — and nothing MOVED either: a skip leaves
 * the message sitting in the salesman's Gmail inbox, where they convert the
 * existing quote in the ERP themselves.
 *
 * That is exactly why these do not belong in the app's inbox (Sam): a card
 * there claimed an action that had not happened. They are a record of a
 * decision, which is what History is for.
 *
 * A wrong skip is the expensive failure — it is invisible unless something
 * shows it — so every one of them is listed with the quote it matched, who it
 * came from, how confident the adjudicator was and why. Opening one leads to
 * the detail view, where Predict anyway reopens the quote and prices it after
 * all.
 */
export default function LiveSkipped({ navigate }) {
  const { rows, loading, error } = useInbox()
  const [query, setQuery] = useState('')

  const skipped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => r.status === 'skipped')
      .filter((r) =>
        !q
          ? true
          : [r.subject, r.customer, r.contact, r.matchedQuote, r.customerId]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
      )
  }, [rows, query])

  return (
    <>
      <header className="shrink-0 border-b border-ink-200 bg-white px-5 pt-4 pb-3.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">Skipped</h1>
          <span className="nums text-[12px] text-ink-500">{skipped.length}</span>
        </div>
        <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink-500">
          Purchase orders the quote gate matched to a quote already on file. Nothing was predicted
          and nothing was charged — the email stayed in your Gmail inbox, and the existing quote is
          yours to convert in the ERP. Open one and use <strong>Predict anyway</strong> if the gate
          got it wrong; that reopens the quote and prices the order.
        </p>
      </header>

      <div className="flex shrink-0 items-center gap-3 px-5 pt-3 pb-2.5">
        <SearchInput
          width="w-80"
          placeholder="Search subject, customer or quote #"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search skipped purchase orders"
        />
      </div>

      {error && (
        <div className="mx-5 mb-3 shrink-0 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-800">
          Could not load — {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {skipped.map((r) => (
              <SkipRow key={r.id} row={r} onOpen={() => navigate('order', { id: r.id })} />
            ))}

            {skipped.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
                <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                <p className="text-[13px] font-medium text-ink-800">
                  {loading
                    ? 'Loading…'
                    : query
                      ? `Nothing skipped matches “${query.trim()}”`
                      : 'Nothing has been skipped yet.'}
                </p>
                <p className="max-w-md text-[12px] leading-5 text-ink-500">
                  A purchase order lands here when the gate judges it a release against a quote
                  already on file, so it is never priced twice.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

function SkipRow({ row: r, onOpen }) {
  const { date, time, full } = formatDate(r.receivedAt)
  const reason = r.raw?.reason || ''
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 border-b border-ink-200 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-ink-50"
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        <AlertCircle className="size-3.5" strokeWidth={2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-ink-900">
            {r.subject || '(no subject)'}
          </span>
          {r.matchedQuote && (
            <Tooltip content="The open quote this purchase order was judged to be a release against">
              <Badge tone="violet" className="nums">quote {r.matchedQuote}</Badge>
            </Tooltip>
          )}
          {r.overturned && <Badge tone="amber">gate overturned</Badge>}
          {r.partOf && (
            <Badge tone="slate">Part {r.partIndex}/{r.partTotal}</Badge>
          )}
        </span>

        <span className="mt-0.5 block truncate text-[11px] text-ink-500">
          {[
            r.customer,
            r.customerId && `cust ${r.customerId}`,
            r.confidence && `${r.confidence} confidence`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>

        {reason && (
          <span className="mt-1 block text-[12px] leading-5 text-ink-600">{reason}</span>
        )}
      </span>

      <span className="shrink-0 text-right" title={full}>
        <span className="nums block text-[12px] text-ink-600">{date}</span>
        <span className="nums block text-[11px] text-ink-400">{time}</span>
        <span className="mt-0.5 block text-[11px] text-ink-400">{timeAgo(r.receivedAt)}</span>
      </span>

      <ChevronRight
        className={cx('mt-1 size-4 shrink-0 text-ink-300 transition-colors group-hover:text-ink-500')}
        strokeWidth={2}
      />
    </button>
  )
}
