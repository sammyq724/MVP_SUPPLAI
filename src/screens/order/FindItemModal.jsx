import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  Eye,
  Filter,
  Group,
  Search,
  Ungroup,
  X,
} from 'lucide-react'
import {
  Button,
  Checkbox,
  HelpTip,
  IconButton,
  Modal,
  Select,
  Tooltip,
  cx,
  money,
  useOnClickOutside,
} from '../../ui/primitives.jsx'
import {
  CATALOG_COLUMNS,
  OPERATORS,
  VALUELESS_OPERATORS,
  catalog,
  matches,
} from '../../data/catalog.js'

/**
 * "Find Item" — the item-master lookup behind every line's product search.
 *
 * Deliberately modelled on the ERP finder reps already use, so the muscle
 * memory carries over: a global search box with an operator, a "search all bold
 * columns" toggle, a per-column filter row where each funnel opens the same
 * operator list, a drop zone that groups by any column header, and a kebab menu
 * on each column for sort / group / hide.
 *
 * Picking a row hands the item back to the caller as a line-item candidate.
 */

const BOLD_KEYS = CATALOG_COLUMNS.filter((c) => c.bold).map((c) => c.key)
const opLabel = (key) => OPERATORS.find((o) => o.key === key)?.label ?? 'Contains'

/** Shared operator dropdown — the funnel icons and the top bar both use it. */
function OperatorMenu({ value, onChange, children, align = 'left' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOnClickOutside(ref, () => setOpen(false))
  return (
    <span className="relative inline-flex" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{children}</span>
      {open && (
        <div
          role="listbox"
          className={cx(
            'animate-in-up absolute top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {OPERATORS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="option"
              aria-selected={o.key === value}
              onClick={() => {
                onChange(o.key)
                setOpen(false)
              }}
              className={cx(
                'block w-full px-3 py-1.5 text-left text-[13px] transition-colors',
                o.key === value
                  ? 'bg-ink-100 font-medium text-ink-900'
                  : 'text-ink-700 hover:bg-ink-50',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

/** Per-column kebab: sort, group, filter focus, hide. */
function ColumnMenu({ col, sort, onSort, grouped, onGroup, onUngroup, onFocusFilter, onHide }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOnClickOutside(ref, () => setOpen(false))
  const items = [
    { label: 'Sort A → Z', icon: ArrowDownAZ, onClick: () => onSort(col.key, 'asc') },
    { label: 'Sort Z → A', icon: ArrowUpAZ, onClick: () => onSort(col.key, 'desc') },
    ...(sort.key === col.key
      ? [{ label: 'Clear sort', icon: X, onClick: () => onSort(null, 'asc') }]
      : []),
    '-',
    grouped
      ? { label: 'Ungroup', icon: Ungroup, onClick: onUngroup }
      : { label: 'Group by this column', icon: Group, onClick: () => onGroup(col.key) },
    { label: 'Filter this column', icon: Filter, onClick: () => onFocusFilter(col.key) },
    '-',
    { label: 'Hide column', icon: Eye, onClick: () => onHide(col.key) },
  ]
  return (
    <span className="relative inline-flex shrink-0" ref={ref}>
      <button
        type="button"
        aria-label={`${col.label} column options`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="inline-flex size-5 items-center justify-center rounded text-emerald-900/50 transition-colors hover:bg-emerald-900/10 hover:text-emerald-900"
      >
        <EllipsisVertical className="size-3.5" strokeWidth={2.25} />
      </button>
      {open && (
        <div className="animate-in-up absolute top-full right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-pop">
          {items.map((it, i) =>
            it === '-' ? (
              <div key={i} className="my-1 border-t border-ink-200" />
            ) : (
              <button
                key={it.label}
                type="button"
                onClick={() => {
                  it.onClick()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-ink-700 hover:bg-ink-50"
              >
                <it.icon className="size-3.5 shrink-0 opacity-70" strokeWidth={2} />
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </span>
  )
}

export default function FindItemModal({
  open,
  onClose,
  onPick,
  lineLabel,
  initialSearch = '',
  defaultGroupBy = null,
}) {
  const [text, setText] = useState(initialSearch)
  const [op, setOp] = useState('contains')
  const [allBold, setAllBold] = useState(true)
  const [colFilters, setColFilters] = useState({}) // key -> { term, op }
  const [groupBy, setGroupBy] = useState(defaultGroupBy)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [hidden, setHidden] = useState(() => new Set())
  const [activeId, setActiveId] = useState(null)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [dragKey, setDragKey] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const filterRefs = useRef({})

  // Re-seed on every open so the lookup always reflects the line it came from.
  useEffect(() => {
    if (!open) return
    setText(initialSearch)
    setOp('contains')
    setAllBold(true)
    setColFilters({})
    setGroupBy(defaultGroupBy)
    setSort({ key: null, dir: 'asc' })
    setHidden(new Set())
    setActiveId(null)
    setCollapsed(new Set())
  }, [open, initialSearch, defaultGroupBy])

  const columns = useMemo(() => CATALOG_COLUMNS.filter((c) => !hidden.has(c.key)), [hidden])

  const rows = useMemo(() => {
    const searchKeys = allBold ? BOLD_KEYS : ['itemId']
    let out = catalog.filter((r) => {
      // Global search: any of the searched columns satisfying the operator is a
      // hit, except for the negative operators, where every column must hold —
      // "does not contain X" should not pass just because one column lacks X.
      if (text.trim() || VALUELESS_OPERATORS.has(op)) {
        const negative = op === 'notContains' || op === 'neq'
        const test = (k) => matches(r[k], op, text.trim())
        if (!(negative ? searchKeys.every(test) : searchKeys.some(test))) return false
      }
      // Per-column filters always AND together.
      for (const [key, f] of Object.entries(colFilters)) {
        if (!f) continue
        const hasTerm = (f.term ?? '').trim().length > 0
        if (!hasTerm && !VALUELESS_OPERATORS.has(f.op)) continue
        if (!matches(r[key], f.op, (f.term ?? '').trim())) return false
      }
      return true
    })

    const dir = sort.dir === 'asc' ? 1 : -1
    const keys = [groupBy, sort.key].filter(Boolean)
    if (keys.length) {
      out = [...out].sort((a, b) => {
        if (groupBy) {
          const ga = String(a[groupBy] ?? '')
          const gb = String(b[groupBy] ?? '')
          if (ga !== gb) return ga < gb ? -1 : 1
        }
        if (!sort.key) return 0
        const col = CATALOG_COLUMNS.find((c) => c.key === sort.key)
        const va = a[sort.key]
        const vb = b[sort.key]
        if (col?.numeric) return ((va ?? 0) - (vb ?? 0)) * dir
        return String(va ?? '').localeCompare(String(vb ?? '')) * dir
      })
    }
    return out
  }, [text, op, allBold, colFilters, groupBy, sort])

  /** Rows flattened into render instructions so groups and rows share one list. */
  const groups = useMemo(() => {
    if (!groupBy) return null
    const map = new Map()
    for (const r of rows) {
      const v = String(r[groupBy] ?? '').trim() || '(blank)'
      if (!map.has(v)) map.set(v, [])
      map.get(v).push(r)
    }
    return [...map.entries()]
  }, [rows, groupBy])

  const activeFilterCount =
    Object.values(colFilters).filter(
      (f) => f && ((f.term ?? '').trim() || VALUELESS_OPERATORS.has(f.op)),
    ).length + (text.trim() || VALUELESS_OPERATORS.has(op) ? 1 : 0)

  const setFilter = (key, patch) =>
    setColFilters((f) => ({ ...f, [key]: { term: '', op: 'contains', ...f[key], ...patch } }))

  const pick = (row) => {
    onPick?.(row)
    onClose?.()
  }

  const groupCol = groupBy ? CATALOG_COLUMNS.find((c) => c.key === groupBy) : null

  return (
    <Modal open={open} onClose={onClose} width="max-w-6xl" labelledBy="find-item-title">
      {/* ------------------------------------------------------------- header */}
      <div className="flex items-center gap-3 rounded-t-2xl bg-[#1e4f63] px-5 py-3">
        <h2 id="find-item-title" className="text-[15px] font-semibold text-white">
          Find Item
        </h2>
        {lineLabel && (
          <span className="min-w-0 truncate text-[12px] text-white/70">for {lineLabel}</span>
        )}
        <IconButton
          icon={X}
          label="Close"
          onClick={onClose}
          className="ml-auto text-white/80 hover:bg-white/15 hover:text-white"
        />
      </div>

      {/* ---------------------------------------------------------- search bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-200 bg-ink-50 px-5 py-3">
        <label htmlFor="find-item-text" className="text-[13px] font-medium text-ink-700">
          Search Text
        </label>
        <div className="relative w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400"
            strokeWidth={2}
          />
          <input
            id="find-item-text"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={VALUELESS_OPERATORS.has(op)}
            placeholder={VALUELESS_OPERATORS.has(op) ? 'Not used by this operator' : 'Search'}
            className="h-8 w-full rounded-lg border border-ink-300 bg-white pr-2.5 pl-7.5 text-[13px] text-ink-800 transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:bg-ink-100 disabled:text-ink-400"
          />
        </div>

        <div className="w-44">
          <Select value={op} onChange={(e) => setOp(e.target.value)} aria-label="Search operator">
            {OPERATORS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Checkbox checked={allBold} onChange={setAllBold} label="Search all bold Columns" />
          <HelpTip
            content={`On, the search text runs against every bold column — ${BOLD_KEYS.length === 2 ? 'Item ID and Item Description' : 'the bold columns'}. Off, it runs against Item ID only.`}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="nums text-[12px] text-ink-500">
            {rows.length.toLocaleString('en-US')} of {catalog.length.toLocaleString('en-US')} items
          </span>
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              icon={X}
              onClick={() => {
                setText('')
                setOp('contains')
                setColFilters({})
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- group drop zone */}
      <div
        onDragOver={(e) => {
          if (!dragKey) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (dragKey) setGroupBy(dragKey)
          setDragKey(null)
        }}
        className={cx(
          'flex min-h-11 flex-wrap items-center gap-2 border-b border-dashed px-5 py-2 transition-colors',
          dragOver ? 'border-brand-400 bg-brand-50' : 'border-ink-300 bg-ink-50/60',
        )}
      >
        {groupCol ? (
          <>
            <span className="text-[12px] text-ink-500">Grouped by</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-300 bg-white py-1 pr-1 pl-2.5 text-[12px] font-medium text-ink-800">
              {groupCol.label}
              <button
                type="button"
                aria-label="Remove grouping"
                onClick={() => setGroupBy(null)}
                className="inline-flex size-4 items-center justify-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </span>
            <span className="nums text-[11px] text-ink-400">
              {groups?.length ?? 0} group{(groups?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-ink-500">
            Drag a column header and drop it here to group by that column
          </span>
        )}
      </div>

      {/* ---------------------------------------------------------------- grid */}
      <div className="max-h-[52vh] min-h-[18rem] overflow-auto">
        <table className="w-full min-w-[62rem] table-fixed border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-20">
            {/* header row */}
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  draggable
                  onDragStart={() => setDragKey(col.key)}
                  onDragEnd={() => setDragKey(null)}
                  aria-sort={
                    sort.key === col.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className={cx(
                    'h-10 cursor-grab border-r border-b border-emerald-900/15 bg-[#a9d6c4] px-3 align-middle select-none active:cursor-grabbing',
                    col.width,
                    dragKey === col.key && 'opacity-50',
                  )}
                >
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) =>
                          s.key === col.key
                            ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                            : { key: col.key, dir: 'asc' },
                        )
                      }
                      className={cx(
                        'min-w-0 truncate text-left text-[13px] text-emerald-950',
                        // Bold marks the columns the global search covers, exactly
                        // as the "Search all bold Columns" toggle implies.
                        col.bold ? 'font-semibold underline underline-offset-2' : 'font-normal',
                      )}
                    >
                      {col.label}
                    </button>
                    {sort.key === col.key && (
                      <ChevronDown
                        className={cx(
                          'size-3.5 shrink-0 text-emerald-900 transition-transform',
                          sort.dir === 'asc' && 'rotate-180',
                        )}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="ml-auto" />
                    <ColumnMenu
                      col={col}
                      sort={sort}
                      onSort={(key, dir) => setSort({ key, dir })}
                      grouped={groupBy === col.key}
                      onGroup={setGroupBy}
                      onUngroup={() => setGroupBy(null)}
                      onFocusFilter={(k) => filterRefs.current[k]?.focus()}
                      onHide={(k) => setHidden((h) => new Set(h).add(k))}
                    />
                  </span>
                </th>
              ))}
            </tr>

            {/* per-column filter row */}
            <tr>
              {columns.map((col) => {
                const f = colFilters[col.key] ?? { term: '', op: 'contains' }
                const valueless = VALUELESS_OPERATORS.has(f.op)
                const active = valueless || (f.term ?? '').trim().length > 0
                return (
                  <td
                    key={col.key}
                    className="border-r border-b border-ink-200 bg-white p-1.5 align-middle"
                  >
                    <div
                      className={cx(
                        'flex h-7 items-center rounded-md border bg-white transition-colors',
                        active ? 'border-brand-400 ring-1 ring-brand-200' : 'border-ink-300',
                      )}
                    >
                      <input
                        ref={(el) => {
                          filterRefs.current[col.key] = el
                        }}
                        value={valueless ? '' : (f.term ?? '')}
                        disabled={valueless}
                        onChange={(e) => setFilter(col.key, { term: e.target.value })}
                        placeholder={valueless ? opLabel(f.op) : ''}
                        aria-label={`Filter ${col.label}`}
                        className="nums h-full min-w-0 flex-1 rounded-l-md bg-transparent px-2 text-[12px] text-ink-800 placeholder:text-ink-400 placeholder:italic focus:outline-none disabled:cursor-default"
                      />
                      <OperatorMenu
                        align="right"
                        value={f.op}
                        onChange={(nextOp) => setFilter(col.key, { op: nextOp })}
                      >
                        <Tooltip content={`${col.label}: ${opLabel(f.op)}`} side="top">
                          <button
                            type="button"
                            aria-label={`${col.label} filter operator — ${opLabel(f.op)}`}
                            className={cx(
                              'inline-flex h-full w-7 items-center justify-center rounded-r-md border-l transition-colors',
                              active
                                ? 'border-brand-200 text-brand-600 hover:bg-brand-50'
                                : 'border-ink-200 text-ink-400 hover:bg-ink-50 hover:text-ink-700',
                            )}
                          >
                            <Filter className="size-3.5" strokeWidth={2.25} />
                          </button>
                        </Tooltip>
                      </OperatorMenu>
                    </div>
                  </td>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {groups
              ? groups.map(([value, items]) => {
                  const isCollapsed = collapsed.has(value)
                  return (
                    <React.Fragment key={value}>
                      <tr>
                        <td colSpan={columns.length} className="border-b border-ink-200 bg-ink-100">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsed((c) => {
                                const next = new Set(c)
                                next.has(value) ? next.delete(value) : next.add(value)
                                return next
                              })
                            }
                            aria-expanded={!isCollapsed}
                            className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left"
                          >
                            <ChevronRight
                              className={cx(
                                'size-3.5 shrink-0 text-ink-500 transition-transform',
                                !isCollapsed && 'rotate-90',
                              )}
                              strokeWidth={2.5}
                            />
                            <span className="text-[12px] text-ink-500">{groupCol.label}:</span>
                            <span className="text-[12px] font-semibold text-ink-900">{value}</span>
                            <span className="nums text-[11px] text-ink-400">({items.length})</span>
                          </button>
                        </td>
                      </tr>
                      {!isCollapsed &&
                        items.map((r) => (
                          <ItemRow
                            key={r.itemId}
                            row={r}
                            columns={columns}
                            active={activeId === r.itemId}
                            indent
                            onFocus={() => setActiveId(r.itemId)}
                            onPick={() => pick(r)}
                          />
                        ))}
                    </React.Fragment>
                  )
                })
              : rows.map((r) => (
                  <ItemRow
                    key={r.itemId}
                    row={r}
                    columns={columns}
                    active={activeId === r.itemId}
                    onFocus={() => setActiveId(r.itemId)}
                    onPick={() => pick(r)}
                  />
                ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
                    <Search className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                    <p className="text-[13px] font-medium text-ink-800">No items match</p>
                    <p className="max-w-sm text-[12px] text-ink-500">
                      Widen the operator, clear a column filter, or turn on “Search all bold
                      Columns”.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- footer */}
      <div className="flex items-center gap-3 rounded-b-2xl border-t border-ink-200 bg-ink-50 px-5 py-3">
        {hidden.size > 0 && (
          <Button size="sm" icon={Eye} onClick={() => setHidden(new Set())}>
            Show {hidden.size} hidden column{hidden.size === 1 ? '' : 's'}
          </Button>
        )}
        <p className="min-w-0 flex-1 truncate text-[12px] text-ink-500">
          {activeId ? (
            <>
              Selected <span className="font-mono font-medium text-ink-800">{activeId}</span>
            </>
          ) : (
            'Double-click a row, or select one and choose Use item.'
          )}
        </p>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!activeId}
          onClick={() => {
            const row = catalog.find((r) => r.itemId === activeId)
            if (row) pick(row)
          }}
        >
          Use item
        </Button>
      </div>
    </Modal>
  )
}

function ItemRow({ row, columns, active, indent, onFocus, onPick }) {
  return (
    <tr
      onClick={onFocus}
      onDoubleClick={onPick}
      className={cx(
        'cursor-pointer transition-colors',
        active ? 'bg-brand-50 ring-1 ring-brand-300 ring-inset' : 'hover:bg-ink-50',
      )}
    >
      {columns.map((col, i) => {
        const v = row[col.key]
        return (
          <td
            key={col.key}
            className={cx(
              'border-r border-b border-ink-200 px-3 py-1.5 text-[12px] whitespace-nowrap',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
              col.numeric && 'nums',
              col.mono && 'font-mono',
              col.key === 'avail' && v === 0 && 'font-semibold text-red-600',
              i === 0 && indent && 'pl-8',
            )}
          >
            {i === 0 ? (
              <span className="block truncate font-medium text-ink-900">{v}</span>
            ) : col.money ? (
              money(v)
            ) : col.numeric ? (
              (v ?? 0).toLocaleString('en-US')
            ) : (
              <span className="block truncate text-ink-700">{v || '—'}</span>
            )}
          </td>
        )
      })}
    </tr>
  )
}
