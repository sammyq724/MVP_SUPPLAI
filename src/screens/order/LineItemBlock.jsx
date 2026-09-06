import React, { useState } from 'react'
import {
  ArrowUp,
  Check,
  ChevronDown,
  EllipsisVertical,
  Replace,
  Search,
  Sparkles,
  Split,
  StickyNote,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Card,
  Checkbox,
  IconButton,
  Menu,
  TextInput,
  Tooltip,
  cx,
  money,
} from '../../ui/primitives.jsx'
import { ProductThumb } from '../../ui/ProductThumb.jsx'
import { branches, moreCandidates } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * One parsed line item: the customer's literal words on top, the ranked
 * candidate matches underneath. The rep works top-to-bottom and picks a row.
 */

/** Why the ordered quantity is not exactly what the customer typed. */
const ROUNDING_NOTE = {
  'li-1': 'Rounded up to 400 ft — 40 full 10 ft sticks. PVC conduit is sold by the stick, never cut.',
  'li-3': 'Rounded up to 2,500 ft — one full reel. #10 THHN is not cut below reel quantity.',
}
const ROUNDING_FALLBACK = 'Rounded up to the next full sellable multiple for this item.'

/* Column widths shared by the header strip and every candidate row. */
const COL_UOM = 'w-12'
const COL_AVAIL = 'w-16'
const COL_QTY = 'w-[6.5rem]'
const COL_UNIT = 'w-20'
const COL_TOTAL = 'w-24'

function Availability({ avail, want, uom }) {
  const label = avail.toLocaleString('en-US')
  if (avail === 0) {
    return (
      <Tooltip
        side="top"
        content={`Out of stock at ${branches.ship}. Special order — 3–5 business days from the manufacturer.`}
      >
        <span className="nums text-[12px] font-semibold text-red-600">0</span>
      </Tooltip>
    )
  }
  if (want > 0 && avail < want) {
    return (
      <Tooltip
        side="top"
        content={`Short by ${(want - avail).toLocaleString('en-US')} ${uom} at ${branches.ship}. The balance can transfer from ${branches.price}.`}
      >
        <span className="nums text-[12px] font-medium text-amber-600">{label}</span>
      </Tooltip>
    )
  }
  return <span className="nums text-[12px] text-ink-600">{label}</span>
}

function CandidateRow({ li, cand, selected, qty, onQty, onSelect }) {
  const want = Number(qty) || 0
  const total = cand.unitPrice * want

  return (
    <div
      className={cx(
        'group relative flex items-stretch border-b border-ink-100 transition-colors last:border-0',
        selected ? 'bg-brand-50 ring-1 ring-brand-200 ring-inset' : 'hover:bg-ink-50',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onSelect(li.id, cand.id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-3 text-left"
      >
        <span
          className={cx(
            'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            selected
              ? 'border-brand-600 bg-brand-600'
              : 'border-ink-300 bg-white group-hover:border-ink-400',
          )}
          aria-hidden="true"
        >
          {selected && <span className="size-1.5 rounded-full bg-white" />}
        </span>

        <ProductThumb shape={cand.thumb} size="sm" />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cx(
                'truncate font-mono text-[12px] font-semibold',
                selected ? 'text-brand-800' : 'text-ink-900',
              )}
            >
              {cand.sku}
            </span>
            <Badge tone={cand.badge.tone}>{cand.badge.label}</Badge>
          </span>
          <span className="block truncate text-[12px] text-ink-500">{cand.description}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
            <Sparkles className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{cand.engine}</span>
          </span>
        </span>

        <span className={cx('shrink-0 text-right text-[12px] text-ink-600', COL_UOM)}>
          {cand.uom}
        </span>
        <span className={cx('shrink-0 text-right', COL_AVAIL)}>
          <Availability avail={cand.avail} want={want} uom={cand.uom} />
        </span>
      </button>

      {/* Numeric group — kept outside the row button so the qty field is editable. */}
      <div className="flex shrink-0 items-center gap-2.5 py-2 pr-3 pl-2.5">
        <div className={cx('flex items-center justify-end gap-1', COL_QTY)}>
          {li.roundedUp && (
            <Tooltip side="top" content={ROUNDING_NOTE[li.id] ?? ROUNDING_FALLBACK}>
              <ArrowUp className="size-3.5 cursor-help text-brand-600" strokeWidth={2.5} />
            </Tooltip>
          )}
          <input
            type="number"
            min="0"
            step="1"
            value={qty}
            aria-label={`Quantity for ${cand.sku}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => onQty(li.id, cand.id, e.target.value)}
            className="nums h-7 w-20 rounded-lg border border-ink-300 bg-white px-2 text-right text-[12px] text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors [appearance:textfield] hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <span className={cx('nums shrink-0 text-right text-[12px] text-ink-600', COL_UNIT)}>
          {money(cand.unitPrice)}
        </span>
        <span
          className={cx('nums shrink-0 text-right text-[12px] font-semibold text-ink-900', COL_TOTAL)}
        >
          {money(total)}
        </span>
      </div>
    </div>
  )
}

export default function LineItemBlock({
  li,
  index,
  candidates,
  selectedId,
  onSelect,
  qtys,
  onQty,
  expanded,
  onToggleMore,
  checked,
  onCheck,
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')

  const unresolved = !selectedId
  const extra = moreCandidates[li.id] ?? []
  const q = query.trim().toLowerCase()
  const rows = q
    ? candidates.filter(
        (c) => c.sku.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
      )
    : candidates

  const lineMenu = [
    {
      label: 'Replace item',
      icon: Replace,
      onClick: () =>
        toast?.info('Replace item', { description: `Line ${index} — pick a different SKU` }),
    },
    {
      label: 'Split line',
      icon: Split,
      onClick: () =>
        toast?.success(`Line ${index} split into 2 lines`, {
          description: 'Quantities divided evenly',
        }),
    },
    {
      label: 'Add note',
      icon: StickyNote,
      onClick: () =>
        toast?.info('Note added to line ' + index, { description: 'Prints on the packing slip' }),
    },
    '-',
    {
      label: 'Remove line',
      icon: Trash2,
      danger: true,
      onClick: () =>
        toast?.warning(`Line ${index} removed`, {
          description: 'Still on the source document',
        }),
    },
  ]

  return (
    <Card className={cx('mt-2 overflow-hidden', unresolved && 'ring-1 ring-amber-300')}>
      <div className={cx(unresolved && 'bg-amber-50/30')}>
        {/* ------------------------------------------------------------ header */}
        <div className="flex items-start gap-3 px-3 py-2.5">
          <Checkbox
            className="mt-0.5"
            checked={checked}
            onChange={onCheck}
            label={<span className="sr-only">Select line {index}</span>}
          />
          <span className="nums mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-ink-100 text-[11px] font-semibold text-ink-600">
            {index}
          </span>
          <p className="min-w-0 text-[13px] leading-5 font-semibold text-ink-900">
            {li.requested}
            {li.note && (
              <span className="text-[12px] font-normal text-ink-400"> · {li.note}</span>
            )}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {unresolved ? (
              <Badge tone="amber">Needs selection</Badge>
            ) : (
              <Badge tone="green" icon={Check}>
                Matched
              </Badge>
            )}
            <Menu
              align="right"
              width="w-48"
              trigger={
                <IconButton icon={EllipsisVertical} label={`Line ${index} actions`} size="sm" />
              }
              items={lineMenu}
            />
          </div>
        </div>

        {/* ------------------------------------------------------ line search */}
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <div className="min-w-0 flex-1">
            <TextInput
              icon={Search}
              size="sm"
              placeholder="Search for a product"
              aria-label={`Search catalog for line ${index}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="shrink-0 text-[11px] whitespace-nowrap text-ink-400">
            or paste a SKU
          </span>
        </div>

        {/* ------------------------------------------------- column headers */}
        <div className="flex h-6 items-center gap-2.5 border-t border-ink-200 bg-ink-50/70 px-3 text-[10px] font-medium tracking-wide text-ink-400 uppercase">
          <span className="min-w-0 flex-1">Product</span>
          <span className={cx('shrink-0 text-right', COL_UOM)}>UoM</span>
          <span className={cx('shrink-0 text-right', COL_AVAIL)}>Avail</span>
          <span className={cx('shrink-0 pr-2 text-right', COL_QTY)}>Qty</span>
          <span className={cx('shrink-0 text-right', COL_UNIT)}>Unit price</span>
          <span className={cx('shrink-0 text-right', COL_TOTAL)}>Total price</span>
        </div>

        {/* ---------------------------------------------------- candidates */}
        <div role="radiogroup" aria-label={`Candidate matches for line ${index}`}>
          {rows.map((c) => (
            <CandidateRow
              key={c.id}
              li={li}
              cand={c}
              selected={selectedId === c.id}
              qty={qtys[`${li.id}:${c.id}`] ?? c.qty}
              onQty={onQty}
              onSelect={onSelect}
            />
          ))}
          {rows.length === 0 && (
            <p className="border-b border-ink-100 px-3 py-4 text-center text-[12px] text-ink-500">
              No candidate on this line matches “{query.trim()}”. Clear the box to see all{' '}
              {candidates.length} matches.
            </p>
          )}
        </div>

        {/* ----------------------------------------------------- show more */}
        {extra.length > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => onToggleMore(li.id)}
            className="flex h-8 w-full items-center justify-center gap-1.5 border-t border-ink-200 text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            {expanded
              ? 'Show less'
              : `Show more (${extra.length} more match${extra.length === 1 ? '' : 'es'})`}
            <ChevronDown
              className={cx('size-3.5 transition-transform', expanded && 'rotate-180')}
              strokeWidth={2.25}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </Card>
  )
}
