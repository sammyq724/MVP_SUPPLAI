import React, { useState, useMemo, useCallback } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardList,
  Plus,
  Search,
  SearchX,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  HelpTip,
  Select,
  TextInput,
  cx,
  money,
} from '../ui/primitives.jsx'
import { ProductThumb } from '../ui/ProductThumb.jsx'
import { useToast } from '../ui/toast.jsx'
import { lineItems } from '../data/order.js'

/* ------------------------------------------------------------------ local data */

/** SKU → catalog record, so search results match what the matcher offers. */
const CATALOG = Object.fromEntries(
  lineItems.flatMap((li) => li.candidates).map((c) => [c.sku, c]),
)

const BRANCHES = [
  { code: 'HOU-01', short: 'Houston', name: 'Houston — North' },
  { code: 'KTY-07', short: 'Katy', name: 'Katy Supply' },
  { code: 'PAS-03', short: 'Pasadena', name: 'Pasadena Yard' },
]

/** Anything at or under this at a branch gets called out in amber. */
const LOW_STOCK = 120

const RESULTS = [
  {
    sku: 'PVC-40-150-B',
    mfr: 'Cantex',
    mfrPart: 'A52DF-CTN',
    category: 'Conduit & Fittings',
    availTags: ['in'],
    list: 1.86,
    stock: [1840, 640, 220],
    tag: { label: 'Contract price', tone: 'blue' },
  },
  {
    sku: 'PVC-40-150-P',
    mfr: 'Cantex',
    mfrPart: 'A52EF-CTN',
    category: 'Conduit & Fittings',
    availTags: ['in'],
    list: 1.79,
    stock: [620, 0, 180],
  },
  {
    sku: 'PVC-80-150-B',
    mfr: 'Cantex',
    mfrPart: 'A54DF-CTN',
    category: 'Conduit & Fittings',
    availTags: ['in', 'low'],
    list: 3.4,
    stock: [310, 90, 0],
  },
  {
    sku: 'PVC-40-150-B-EL',
    mfr: 'Eastern Lite',
    mfrPart: 'EL-150-40B',
    category: 'Conduit & Fittings',
    availTags: ['in'],
    list: 1.44,
    stock: [2400, 1180, 900],
    tag: { label: 'House brand', tone: 'violet' },
  },
  {
    sku: 'EMT-150-10',
    mfr: 'Allied Tube',
    mfrPart: 'ATC-EMT-150',
    category: 'Conduit & Fittings',
    availTags: ['in', 'low'],
    list: 3.88,
    stock: [980, 240, 60],
  },
  {
    sku: 'PVC-MA-150',
    mfr: 'Cantex',
    mfrPart: 'A243HF-CTN',
    category: 'Fittings & Adapters',
    availTags: ['in', 'low'],
    list: 1.21,
    stock: [412, 96, 140],
  },
  // Not on the working order — catalog-only rows a rep would hit on this search.
  {
    sku: 'PVC-CPL-150',
    mfr: 'Cantex',
    mfrPart: 'A241HF-CTN',
    category: 'Fittings & Adapters',
    availTags: ['in'],
    description: 'Cantex 1-1/2 in. PVC Slip Coupling, Schedule 40, belled',
    thumb: 'coupling',
    uom: 'EA',
    unitPrice: 0.71,
    list: 0.95,
    stock: [1260, 480, 310],
  },
  {
    sku: 'PVC-EL90-150',
    mfr: 'Carlon',
    mfrPart: 'E942J-CAR',
    category: 'Fittings & Adapters',
    availTags: ['special'],
    description: 'Carlon 1-1/2 in. Sch 40 PVC 90° Sweep Elbow, belled end',
    thumb: 'elbow',
    uom: 'EA',
    unitPrice: 4.86,
    list: 6.1,
    stock: [0, 0, 0],
    tag: { label: 'Special order · 5 days', tone: 'amber' },
  },
].map((r, i) => ({ ...(CATALOG[r.sku] ?? {}), ...r, rank: i }))

const GROUPS = [
  {
    key: 'category',
    label: 'Category',
    options: [
      { id: 'Conduit & Fittings', label: 'Conduit & Fittings', count: 128 },
      { id: 'Fittings & Adapters', label: 'Fittings & Adapters', count: 216 },
      { id: 'Wire & Cable', label: 'Wire & Cable', count: 412 },
      { id: 'Boxes & Enclosures', label: 'Boxes & Enclosures', count: 96 },
      { id: 'Strut & Hangers', label: 'Strut & Hangers', count: 74 },
    ],
    test: (r, ids) => ids.has(r.category),
  },
  {
    key: 'mfr',
    label: 'Manufacturer',
    options: [
      { id: 'Cantex', label: 'Cantex', count: 61 },
      { id: 'Carlon', label: 'Carlon', count: 44 },
      { id: 'Allied Tube', label: 'Allied Tube', count: 27 },
      { id: 'Eastern Lite', label: 'Eastern Lite (house)', count: 19 },
    ],
    test: (r, ids) => ids.has(r.mfr),
  },
  {
    key: 'branch',
    label: 'Branch',
    options: BRANCHES.map((b, i) => ({
      id: b.code,
      label: b.name,
      count: [186, 143, 97][i],
    })),
    test: (r, ids) => BRANCHES.some((b, i) => ids.has(b.code) && r.stock[i] > 0),
  },
  {
    key: 'availability',
    label: 'Availability',
    options: [
      { id: 'in', label: 'In stock now', count: 31 },
      { id: 'low', label: 'Low stock', count: 5 },
      { id: 'special', label: 'Special order', count: 12 },
    ],
    test: (r, ids) => r.availTags.some((t) => ids.has(t)),
  },
]

const OPTION_LABEL = Object.fromEntries(
  GROUPS.flatMap((g) => g.options.map((o) => [`${g.key}:${o.id}`, o.label])),
)

const DEFAULT_FILTERS = ['category:Conduit & Fittings', 'category:Fittings & Adapters', 'availability:in']

const DEFAULT_QUERY = '1-1/2 pvc conduit'

const AVAIL_HELP =
  'On-hand at each branch right now, net of stock already committed to open orders. Red is nothing on the shelf; amber is under a day of typical draw.'

const PRICE_HELP =
  'Customer price for Brightline Mechanical on contract BRT-4471. List price is shown underneath.'

/** Relevance: a row matches if any search token appears in its text. */
const matchesQuery = (r, q) => {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  const hay = `${r.sku} ${r.description} ${r.mfr} ${r.mfrPart}`.toLowerCase()
  return tokens.some((t) => hay.includes(t))
}

/* --------------------------------------------------------------------- screen */

export default function ProductSearch({ params, navigate }) {
  const toast = useToast()
  const [draft, setDraft] = useState(DEFAULT_QUERY)
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [sort, setSort] = useState('best')
  const [filters, setFilters] = useState(() => new Set(DEFAULT_FILTERS))
  const [added, setAdded] = useState([])

  const toggleFilter = useCallback((id) => {
    setFilters((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const visible = useMemo(() => {
    const rows = RESULTS.filter((r) => matchesQuery(r, query)).filter((r) =>
      GROUPS.every((g) => {
        const ids = new Set(
          [...filters].filter((f) => f.startsWith(`${g.key}:`)).map((f) => f.slice(g.key.length + 1)),
        )
        return ids.size === 0 || g.test(r, ids)
      }),
    )
    const total = (r) => r.stock.reduce((a, b) => a + b, 0)
    return [...rows].sort((a, b) => {
      if (sort === 'price') return a.unitPrice - b.unitPrice
      if (sort === 'avail') return total(b) - total(a)
      return a.rank - b.rank
    })
  }, [query, filters, sort])

  const addToQuote = useCallback(
    (row) => {
      setAdded((a) => [...a, row.sku])
      toast.success('Added to quote', {
        description: row.sku,
        onUndo: () =>
          setAdded((a) => {
            const i = a.lastIndexOf(row.sku)
            return i === -1 ? a : [...a.slice(0, i), ...a.slice(i + 1)]
          }),
      })
    },
    [toast],
  )

  const activeChips = [...filters]

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-200 bg-white px-5">
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">
          Product Search
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button icon={ClipboardList} onClick={() => navigate?.('order')}>
            Working quote
            <span className="nums ml-0.5 rounded bg-ink-100 px-1 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200 ring-inset">
              {added.length}
            </span>
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate?.('order')}>
            New quote
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* ------------------------------------------------------ search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(draft)
          }}
          className="flex items-center gap-2"
        >
          <TextInput
            icon={Search}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by SKU, description, manufacturer part number or UPC"
            aria-label="Search the catalog"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="nums text-[12px] text-ink-500">
            <span className="font-medium text-ink-700">{visible.length}</span> of {RESULTS.length}{' '}
            products
            {query.trim() && <> for “{query.trim()}”</>} · priced for Brightline Mechanical
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] font-medium text-ink-500">Sort</span>
            <div className="w-40">
              <Select
                size="sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort results"
              >
                <option value="best">Best match</option>
                <option value="price">Price low → high</option>
                <option value="avail">Availability</option>
              </Select>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------- rail + results */}
        <div className="mt-3 flex items-start gap-4">
          <aside className="w-56 shrink-0">
            <div className="sticky top-0">
              <Card className="overflow-hidden">
                <div className="flex h-9 items-center gap-1.5 border-b border-ink-200 px-3">
                  <h2 className="text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                    Filters
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFilters(new Set())}
                    disabled={filters.size === 0}
                    className="ml-auto text-[11px] font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline disabled:pointer-events-none disabled:text-ink-300"
                  >
                    Clear all
                  </button>
                </div>
                {GROUPS.map((g) => (
                  <FilterGroup
                    key={g.key}
                    group={g}
                    filters={filters}
                    onToggle={toggleFilter}
                  />
                ))}
              </Card>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {activeChips.length > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                {activeChips.map((id) => (
                  <Chip key={id} onRemove={() => toggleFilter(id)}>
                    {OPTION_LABEL[id] ?? id}
                  </Chip>
                ))}
                <button
                  type="button"
                  onClick={() => setFilters(new Set())}
                  className="ml-1 text-[12px] font-medium text-brand-600 transition-colors hover:text-brand-700 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-left">
                  <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur [&_th]:bg-ink-50/95">
                    <tr>
                      <th scope="col" className="h-9 w-16 border-b border-ink-200 pr-1 pl-4">
                        <span className="sr-only">Thumbnail</span>
                      </th>
                      {/* Descriptions differ only at the tail ("Belled End" vs
                          "Plain End"), so the item column gets the extra width. */}
                      <Th className="w-[30%]">Item</Th>
                      <Th className="w-[14%]">Manufacturer</Th>
                      <Th className="w-[5%]">UoM</Th>
                      <Th className="w-[20%]" help={AVAIL_HELP}>
                        Avail
                      </Th>
                      <Th className="w-[12%]" align="right" help={PRICE_HELP}>
                        Unit Price
                      </Th>
                      <th scope="col" className="w-[13%] border-b border-ink-200 pr-4">
                        <span className="sr-only">Row actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <ResultRow
                        key={r.sku}
                        row={r}
                        added={added.includes(r.sku)}
                        onAdd={() => addToQuote(r)}
                      />
                    ))}

                    {visible.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
                            <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                            <p className="text-[13px] font-medium text-ink-800">
                              Nothing in the catalog matches this
                            </p>
                            <p className="max-w-sm text-[12px] text-ink-500">
                              Drop a filter, or search the manufacturer part number instead of the
                              description.
                            </p>
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setFilters(new Set())
                                setDraft(DEFAULT_QUERY)
                                setQuery(DEFAULT_QUERY)
                              }}
                            >
                              Reset search
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------- pieces */

function Th({ children, className, align, help }) {
  return (
    <th
      scope="col"
      className={cx(
        'h-9 border-b border-ink-200 px-2 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase',
        className,
      )}
    >
      <span className={cx('flex items-center gap-1', align === 'right' && 'justify-end')}>
        <span className="truncate">{children}</span>
        {help && <HelpTip content={help} />}
      </span>
    </th>
  )
}

function FilterGroup({ group, filters, onToggle }) {
  const [open, setOpen] = useState(true)
  const checkedCount = group.options.filter((o) => filters.has(`${group.key}:${o.id}`)).length

  return (
    <div className="border-b border-ink-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-1.5 px-3 text-left transition-colors hover:bg-ink-50"
      >
        <span className="text-[12px] font-medium text-ink-800">{group.label}</span>
        {checkedCount > 0 && (
          <span className="nums rounded bg-brand-50 px-1 text-[11px] font-semibold text-brand-700">
            {checkedCount}
          </span>
        )}
        <ChevronDown
          className={cx(
            'ml-auto size-3.5 shrink-0 text-ink-400 transition-transform',
            !open && '-rotate-90',
          )}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="px-2 pb-2">
          {group.options.map((o) => {
            const id = `${group.key}:${o.id}`
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-ink-50"
              >
                <Checkbox
                  className="min-w-0 flex-1"
                  checked={filters.has(id)}
                  onChange={() => onToggle(id)}
                  label={o.label}
                />
                <span className="nums shrink-0 text-[11px] text-ink-400">{o.count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResultRow({ row: r, added, onAdd }) {
  return (
    <tr className="group h-16 transition-colors hover:bg-ink-50 [&>td]:border-b [&>td]:border-ink-200 last:[&>td]:border-b-0">
      <td className="pr-1 pl-4 align-middle">
        <ProductThumb shape={r.thumb} />
      </td>

      <td className="px-2 align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 font-mono text-[12px] font-medium tracking-[-0.01em] text-ink-900">
            {r.sku}
          </span>
          {r.tag && <Badge tone={r.tag.tone}>{r.tag.label}</Badge>}
        </div>
        <p className="truncate text-[12px] text-ink-500">{r.description}</p>
      </td>

      <td className="px-2 align-middle">
        <div className="truncate text-[13px] text-ink-700">{r.mfr}</div>
        <div className="truncate font-mono text-[11px] text-ink-400">{r.mfrPart}</div>
      </td>

      <td className="px-2 align-middle">
        <span className="text-[13px] text-ink-600">{r.uom}</span>
      </td>

      <td className="px-2 align-middle">
        <div className="flex items-center gap-2">
          {BRANCHES.map((b, i) => {
            const qty = r.stock[i]
            return (
              <div key={b.code} className="min-w-0 flex-1">
                <div
                  className={cx(
                    'nums text-[13px] font-medium',
                    qty === 0
                      ? 'text-red-600'
                      : qty <= LOW_STOCK
                        ? 'text-amber-600'
                        : 'text-ink-800',
                  )}
                >
                  {qty.toLocaleString('en-US')}
                </div>
                <div className="truncate text-[11px] text-ink-400">{b.short}</div>
              </div>
            )
          })}
        </div>
      </td>

      <td className="px-2 text-right align-middle">
        <div className="nums text-[13px] font-medium text-ink-900">{money(r.unitPrice)}</div>
        <div className="nums text-[11px] text-ink-400">list {money(r.list)}</div>
      </td>

      <td className="pr-4 pl-2 align-middle">
        <div className="flex justify-end">
          <Button size="sm" icon={added ? Check : Plus} onClick={onAdd}>
            {added ? 'Added' : 'Add to quote'}
          </Button>
        </div>
      </td>
    </tr>
  )
}
