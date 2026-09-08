import React from 'react'
import {
  Building2,
  ChevronDown,
  CircleSlash,
  Eraser,
  Funnel,
  Hash,
  PackageSearch,
  Percent,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  HelpTip,
  Menu,
  SearchInput,
  Toggle,
  cx,
} from '../../ui/primitives.jsx'
import { lineItems } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'
import LineItemBlock from './LineItemBlock.jsx'

/**
 * The products list — one block per parsed line item, with the bulk-action bar
 * and filters above it. All state lives in OrderDetail; this component only
 * renders it and hands changes back up.
 */

/** Line number as it appears on the source document, independent of filtering. */
const LINE_INDEX = Object.fromEntries(lineItems.map((li, i) => [li.id, i + 1]))

const plural = (n) => `${n} line${n === 1 ? '' : 's'}`

export default function ProductsSection({
  items,
  allCount,
  selections,
  onSelect,
  qtys,
  onQty,
  expanded,
  onToggleMore,
  candidatesFor,
  onPickFromCatalog,
  findOpenFor,
  findGroupBy,
  traceId,
  onTrace,
  checked,
  onCheck,
  openOnly,
  onOpenOnly,
  recording,
  onRecording,
  search,
  onSearch,
  filtered,
  onClearFilter,
}) {
  const toast = useToast()

  const matched = Object.values(selections).filter(Boolean).length
  const outstanding = Math.max(0, allCount - matched)

  const visibleIds = items.map((li) => li.id)
  const checkedVisible = visibleIds.filter((id) => checked.has(id)).length
  const allChecked = visibleIds.length > 0 && checkedVisible === visibleIds.length
  const someChecked = checkedVisible > 0 && !allChecked
  const n = checked.size

  const toggleAll = (next) => {
    const set = new Set(checked)
    for (const id of visibleIds) {
      if (next) set.add(id)
      else set.delete(id)
    }
    onCheck(set)
  }

  const toggleOne = (id, next) => {
    const set = new Set(checked)
    next ? set.add(id) : set.delete(id)
    onCheck(set)
  }

  const bulkItems = [
    {
      label: 'Assign to branch…',
      icon: Building2,
      onClick: () =>
        toast?.success(`${plural(n)} assigned to Katy Supply (KTY-07)`, {
          description: 'Stock pulls from the branch closest to the job site',
        }),
    },
    {
      label: 'Set quantity…',
      icon: Hash,
      onClick: () => toast?.info('Set quantity', { description: `Applies to ${plural(n)}` }),
    },
    {
      label: 'Apply discount…',
      icon: Percent,
      onClick: () => toast?.info('Apply discount', { description: `Applies to ${plural(n)}` }),
    },
    {
      label: 'Clear selections',
      icon: Eraser,
      onClick: () => {
        for (const id of checked) if (selections[id]) onSelect(id, null)
        onCheck(new Set())
      },
    },
    '-',
    {
      label: 'Remove lines',
      icon: Trash2,
      danger: true,
      onClick: () => {
        toast?.warning(`${plural(n)} removed`, { description: 'Still on the source document' })
        onCheck(new Set())
      },
    },
  ]

  const filterItems = [
    {
      label: 'Unmatched lines only',
      icon: CircleSlash,
      onClick: () => onOpenOnly(true),
    },
    '-',
    { label: 'Clear all filters', icon: Eraser, onClick: onClearFilter },
  ]

  return (
    <section aria-label="Products">
      {/* ----------------------------------------------------------- header */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink-900">Products</h2>
        <Badge tone="slate" className="nums">
          {filtered ? `${items.length} of ${allCount}` : allCount}
        </Badge>

        <span className="mx-0.5 h-4 w-px shrink-0 bg-ink-200" aria-hidden="true" />

        <Menu
          align="left"
          width="w-52"
          trigger={
            <Button icon={SlidersHorizontal} size="sm">
              Filters
            </Button>
          }
          items={filterItems}
        />

        {n === 0 ? (
          <Button size="sm" iconRight={ChevronDown} disabled>
            Actions
          </Button>
        ) : (
          <Menu
            align="left"
            width="w-56"
            trigger={
              <Button size="sm" iconRight={ChevronDown}>
                Actions ({n})
              </Button>
            }
            items={bulkItems}
          />
        )}

        <span className="mx-0.5 h-4 w-px shrink-0 bg-ink-200" aria-hidden="true" />

        <span className="flex items-center gap-1.5">
          <Toggle
            tone="red"
            checked={recording}
            onChange={onRecording}
            label={<span className={recording ? 'text-red-600' : undefined}>Live Recording</span>}
          />
          <HelpTip content="Transcribes a live phone call straight into these line items — turn it on before you dial the customer back, and new lines appear as they are read out." />
        </span>

        <span className="flex items-center gap-1.5">
          <Checkbox
            label="Show open line items only"
            checked={openOnly}
            onChange={onOpenOnly}
          />
          <HelpTip content="Open = no product selected yet. Hides every line you have already matched so you can work the rest." />
        </span>

        <div className="ml-auto flex items-center gap-2">
          <SearchInput
            width="w-56"
            placeholder="Search line items"
            aria-label="Search line items"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          <Button
            variant="primary"
            icon={Plus}
            size="sm"
            onClick={() =>
              toast?.info('Add product', { description: 'Search the catalog or paste a SKU' })
            }
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* --------------------------------------------------- filtered strip */}
      {filtered && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] text-brand-800">
          <Funnel className="size-3.5 shrink-0 text-brand-500" strokeWidth={2} aria-hidden="true" />
          <span>
            Filtered to <span className="nums font-semibold">{items.length}</span> of{' '}
            <span className="nums font-semibold">{allCount}</span> line items
          </span>
          <button
            type="button"
            onClick={onClearFilter}
            className="ml-auto shrink-0 font-semibold text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* ------------------------------------------------------- select all */}
      {items.length > 0 && (
        <div className="mt-2.5 flex h-9 items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3">
          <Checkbox
            label="Select all"
            checked={allChecked}
            indeterminate={someChecked}
            onChange={toggleAll}
          />
          <span className="ml-auto text-[11px] text-ink-500">
            <span className="nums">{matched}</span> matched ·{' '}
            <span
              className={cx(
                'nums font-medium',
                outstanding === 0 ? 'text-emerald-600' : 'text-amber-600',
              )}
            >
              {outstanding} outstanding
            </span>
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------ lines */}
      {items.map((li) => (
        <LineItemBlock
          key={li.id}
          li={li}
          index={LINE_INDEX[li.id]}
          candidates={candidatesFor(li)}
          onPickFromCatalog={onPickFromCatalog}
          defaultFindOpen={findOpenFor === li.id}
          defaultFindGroupBy={findGroupBy}
          traced={traceId === li.id}
          onTrace={onTrace}
          selectedId={selections[li.id]}
          onSelect={onSelect}
          qtys={qtys}
          onQty={onQty}
          expanded={expanded.has(li.id)}
          onToggleMore={onToggleMore}
          checked={checked.has(li.id)}
          onCheck={(next) => toggleOne(li.id, next)}
        />
      ))}

      {/* ------------------------------------------------------ empty state */}
      {items.length === 0 && (
        <div className="mt-2.5 flex flex-col items-center rounded-xl border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-ink-100">
            <PackageSearch className="size-5 text-ink-400" strokeWidth={2} aria-hidden="true" />
          </span>
          <p className="mt-3 text-[13px] font-semibold text-ink-800">
            No line items match this filter
          </p>
          <p className="mt-1 max-w-xs text-[12px] leading-4 text-ink-500">
            {search.trim()
              ? `Nothing on this request — line text or candidate SKU — matches “${search.trim()}”.`
              : 'Every line on this request already has a product selected.'}
          </p>
          <Button size="sm" icon={Eraser} className="mt-3" onClick={onClearFilter}>
            Clear filter
          </Button>
        </div>
      )}
    </section>
  )
}
