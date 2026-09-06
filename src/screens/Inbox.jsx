import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Archive,
  Building2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CircleSlash,
  Clock,
  Copy,
  ExternalLink,
  History,
  ListPlus,
  Mail,
  Merge,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  SearchX,
  SlidersHorizontal,
  Split,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  HelpTip,
  IconButton,
  Menu,
  Pagination,
  Popover,
  SearchInput,
  StatusPill,
  Tooltip,
  cx,
  useCopy,
  useOnClickOutside,
} from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'
import { AVATAR_TONES, INBOUND_EMAIL, SPLIT_HELP, STATUS_HELP, requests } from '../data/queue.js'
import TypeListModal from './TypeListModal.jsx'

/* ------------------------------------------------------------------ local data */

/** The signed-in rep — used by "Assign to me". */
const ME = { name: 'Sam Quinn', initials: 'SQ', tone: 'amber' }

/** Where a request came from — drives the small icon next to the subject. */
const SOURCE_META = {
  email: { icon: Mail, label: 'Received by email' },
  pdf: { icon: Paperclip, label: 'PDF attachment — takeoff parsed' },
  phone: { icon: Phone, label: 'Phone call — typed up by a rep' },
  manual: { icon: ListPlus, label: 'Typed list — entered by a rep' },
}

/** Recently quoted accounts, offered when a request has no customer match. */
const RECENT_CUSTOMERS = [
  {
    customer: 'Brightline Mechanical',
    contact: 'Dana Whitfield',
    branches: ['Houston — North', 'Katy Supply'],
  },
  {
    customer: 'Cardinal Electric Co.',
    contact: 'Marcus Oyelaran',
    branches: ['Dallas — Central', 'Fort Worth'],
  },
  {
    customer: 'Halcyon Plumbing & Heating',
    contact: 'Rob Ferreira',
    branches: ['Austin — South', 'Round Rock'],
  },
]

const PLACEHOLDER_CUSTOMER = {
  customer: 'Placeholder account',
  contact: 'No account on file yet',
  branches: [],
}

/** Pre-filled body for #/inbox?modal=typelist&filled=1 */
const SAMPLE_TYPED_LIST = [
  '12 ea 3/4" EMT conduit, 10 ft stick',
  '4 boxes 12 AWG THHN stranded, black, 500 ft',
  '25 ea 4-11/16 sq box, 2-1/8 deep, 1/2-3/4 KO',
  '6 ea Square D QO 20A 1P breaker',
  '2 ea 100A 3R main lug panel, 20 space',
  '10 ea 3/4 EMT compression connector',
].join('\n')

const COLUMNS = [
  { key: 'customer', label: 'Customer', width: 'w-[16%]', sortable: true },
  {
    key: 'branches',
    label: 'Branches',
    width: 'w-[12%]',
    help: 'Branches that can fill these lines. Requests often pull stock from two yards — each branch prices and ships its own portion.',
  },
  { key: 'subject', label: 'Subject', width: 'w-[22%]', sortable: true },
  { key: 'status', label: 'Status', width: 'w-[8%]', sortable: true },
  { key: 'user', label: 'User', width: 'w-[11%]', sortable: true },
  { key: 'orderNumber', label: 'Order Number', width: 'w-[9%]', sortable: true },
  { key: 'poNumber', label: 'PO Number', width: 'w-[9%]', sortable: true },
  { key: 'date', label: 'Date', width: 'w-[8%]', sortable: true },
  {
    key: 'lines',
    label: 'Lines',
    width: 'w-[5%]',
    sortable: true,
    align: 'right',
    help: 'Line items parsed out of the request. A line still counts here even if no product has been matched to it yet.',
  },
]

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
]

const SPLIT_GROUP_ID = 'g-77301'

let manualSeq = 0

/** A row for an order a rep typed in by hand — no customer match yet. */
function makeManualRow(text) {
  const parsed = (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length
  return {
    id: `req-manual-${++manualSeq}`,
    manual: true,
    customer: null,
    contact: null,
    branches: [],
    subject: 'Manually created order',
    status: 'New',
    user: null,
    orderNumber: null,
    poNumber: '—',
    date: 'Just now',
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    lines: parsed || 6,
    source: 'manual',
    unread: true,
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/* --------------------------------------------------------------------- screen */

export default function Inbox({ params, navigate }) {
  const p = params ?? {}
  const toast = useToast()

  const [rows, setRows] = useState(() =>
    p.processing === '1' ? [makeManualRow(), ...requests] : requests,
  )
  const [selected, setSelected] = useState(
    () => new Set(p.split === '1' ? requests.filter((r) => r.splitGroup === SPLIT_GROUP_ID).map((r) => r.id) : []),
  )
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [bannerOpen, setBannerOpen] = useState(p.banner !== '0')
  const [typeListOpen, setTypeListOpen] = useState(p.modal === 'typelist')
  const [flashId, setFlashId] = useState(null)
  const [copied, copy] = useCopy()

  const flashTimer = useRef(null)
  const processedRef = useRef(false)

  /** Briefly ring a row so the rep can see what just landed / changed. */
  const flash = useCallback((id) => {
    setFlashId(id)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashId(null), 6000)
  }, [])

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  // URL-driven states stay in sync when the hash changes without a remount.
  useEffect(() => setBannerOpen(p.banner !== '0'), [p.banner])
  useEffect(() => {
    if (p.modal === 'typelist') setTypeListOpen(true)
  }, [p.modal])
  useEffect(() => {
    if (p.split === '1') {
      setSelected(new Set(requests.filter((r) => r.splitGroup === SPLIT_GROUP_ID).map((r) => r.id)))
    }
  }, [p.split])

  // ?processing=1 — mount with the typed-list row already in the queue.
  useEffect(() => {
    if (p.processing !== '1' || processedRef.current) return
    processedRef.current = true
    let target = rows.find((r) => r.manual)
    if (!target) {
      target = makeManualRow()
      setRows((rs) => [target, ...rs])
    }
    flash(target.id)
    toast.processing(
      'Processing 1 order',
      [{ label: 'Manually created order', startedAt: Date.now() }],
      { defaultExpanded: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.processing])

  /* ------------------------------------------------------------ derived rows */

  const counts = useMemo(
    () => ({
      all: rows.length,
      New: rows.filter((r) => r.status === 'New').length,
      'In Progress': rows.filter((r) => r.status === 'In Progress').length,
    }),
    [rows],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (tab === 'all' ? true : r.status === tab))
      .filter(({ r }) =>
        !q
          ? true
          : [r.customer, r.contact, r.subject, r.poNumber, r.orderNumber]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
      )
    const LAST = '\uffff' // sorts empty cells to the bottom of an A→Z sort
    const value = ({ r, i }) => {
      switch (sort.key) {
        case 'customer':
          return (r.customer ?? LAST).toLowerCase()
        case 'subject':
          return r.subject.toLowerCase()
        case 'status':
          return r.status
        case 'user':
          return (r.user?.name ?? LAST).toLowerCase()
        case 'orderNumber':
          return r.orderNumber ?? LAST
        case 'poNumber':
          return r.poNumber === '—' ? LAST : r.poNumber
        case 'lines':
          return r.lines
        default:
          // The queue arrives newest-first, so position is the date rank.
          return -i
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (va < vb) return -dir
      if (va > vb) return dir
      return a.i - b.i
    })
    return out.map(({ r }) => r)
  }, [rows, query, tab, sort])

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id)), [rows, selected])
  const selectionGroup = useMemo(() => {
    if (selectedRows.length < 2) return null
    const g = selectedRows[0].splitGroup
    return g && selectedRows.every((r) => r.splitGroup === g) ? g : null
  }, [selectedRows])

  const allChecked = visible.length > 0 && visible.every((r) => selected.has(r.id))
  const someChecked = visible.some((r) => selected.has(r.id))

  const firstNewId = visible.find((r) => r.status === 'New')?.id
  const firstSplitId = visible.find((r) => r.splitGroup)?.id
  const tipsOn = p.tips === '1'

  /* --------------------------------------------------------------- mutations */

  const toggleRow = useCallback((id) => {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (on) => {
      setSelected((s) => {
        const next = new Set(s)
        for (const r of visible) {
          if (on) next.add(r.id)
          else next.delete(r.id)
        }
        return next
      })
    },
    [visible],
  )

  const patchRow = useCallback((id, patch) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const toggleSort = useCallback((key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'lines' || key === 'date' ? 'desc' : 'asc' },
    )
  }, [])

  const assignToMe = useCallback(
    (row) => {
      const prev = { user: row.user, status: row.status }
      patchRow(row.id, { user: ME, status: row.status === 'New' ? 'In Progress' : row.status, unread: false })
      toast.success(`Assigned to you`, {
        description: row.customer ?? row.subject,
        onUndo: () => patchRow(row.id, prev),
      })
    },
    [patchRow, toast],
  )

  const markInProgress = useCallback(
    (row) => {
      const prev = { status: row.status }
      patchRow(row.id, { status: 'In Progress', unread: false })
      toast.success('Marked in progress', {
        description: row.customer ?? row.subject,
        onUndo: () => patchRow(row.id, prev),
      })
    },
    [patchRow, toast],
  )

  const archiveRows = useCallback(
    (ids, label) => {
      const prevRows = rows
      const prevSelected = selected
      const set = new Set(ids)
      setRows((rs) => rs.filter((r) => !set.has(r.id)))
      setSelected((s) => {
        const next = new Set(s)
        for (const id of ids) next.delete(id)
        return next
      })
      toast.success(label, {
        onUndo: () => {
          setRows(prevRows)
          setSelected(prevSelected)
        },
      })
    },
    [rows, selected, toast],
  )

  const setCustomer = useCallback(
    (row, match) => {
      const prev = { customer: row.customer, contact: row.contact, branches: row.branches }
      patchRow(row.id, { customer: match.customer, contact: match.contact, branches: match.branches })
      toast.success(`Matched to ${match.customer}`, {
        onUndo: () => patchRow(row.id, prev),
      })
    },
    [patchRow, toast],
  )

  /** Screen 4 — merge the checked splits back into the request they came from. */
  const unsplit = useCallback(() => {
    if (!selectionGroup) return
    const ids = new Set(selectedRows.map((r) => r.id))
    const prevRows = rows
    const prevSelected = selected
    const base = selectedRows[0]
    const merged = {
      ...base,
      id: `merged-${selectionGroup}`,
      poNumber: base.poNumber.replace(/-\d+$/, ''),
      orderNumber: selectedRows.find((r) => r.orderNumber)?.orderNumber ?? null,
      lines: selectedRows.reduce((n, r) => n + r.lines, 0),
      status: 'In Progress',
      splitGroup: undefined,
      splitIndex: undefined,
      splitTotal: undefined,
      unread: false,
    }
    let placed = false
    const next = []
    for (const r of rows) {
      if (!ids.has(r.id)) {
        next.push(r)
        continue
      }
      if (!placed) {
        next.push(merged)
        placed = true
      }
    }
    setRows(next)
    setSelected(new Set())
    flash(merged.id)
    toast.success(`${selectedRows.length} quotes merged back into one request`, {
      onUndo: () => {
        setRows(prevRows)
        setSelected(prevSelected)
        setFlashId(null)
      },
    })
  }, [flash, rows, selected, selectedRows, selectionGroup, toast])

  const assignSelected = useCallback(() => {
    const prevRows = rows
    const ids = new Set(selectedRows.map((r) => r.id))
    setRows((rs) =>
      rs.map((r) =>
        ids.has(r.id)
          ? { ...r, user: ME, status: r.status === 'New' ? 'In Progress' : r.status, unread: false }
          : r,
      ),
    )
    toast.success(`${plural(ids.size, 'request')} assigned to you`, {
      onUndo: () => setRows(prevRows),
    })
  }, [rows, selectedRows, toast])

  /* -------------------------------------------------------- type-list wiring */

  const handleTypeListSubmit = useCallback(
    (text) => {
      setTypeListOpen(false)
      const row = makeManualRow(text)
      setRows((rs) => [row, ...rs])
      setQuery('')
      setTab('all')
      setSort({ key: 'date', dir: 'desc' })
      flash(row.id)
      toast.processing(
        'Processing 1 order',
        [{ label: 'Manually created order', startedAt: Date.now() }],
        { defaultExpanded: true },
      )
    },
    [flash, toast],
  )

  /* ------------------------------------------------------------------ render */

  return (
    <>
      {/* ---------------------------------------------------------- top bar */}
      <header className="shrink-0 border-b border-ink-200 bg-white px-5 pt-4 pb-3.5">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">Inbox</h1>
              <span className="nums text-[12px] text-ink-500">
                {plural(counts.all, 'open request')}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 py-1 pr-1 pl-2.5">
                <Mail className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
                <span className="font-mono text-[12px] tracking-[-0.01em] text-ink-700">
                  {INBOUND_EMAIL}
                </span>
                <Tooltip content={copied ? 'Copied' : 'Copy address'} open={copied || undefined}>
                  <IconButton
                    size="sm"
                    icon={copied ? Check : Copy}
                    label="Copy inbound email address"
                    onClick={() => copy(INBOUND_EMAIL)}
                    className={copied ? 'text-emerald-600 hover:text-emerald-700' : undefined}
                  />
                </Tooltip>
              </div>
              <HelpTip content="Your account's inbound address. Anything customers send here is parsed and lands in this queue — forward it or put it on your quote footer." />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Button variant="link" size="sm" icon={Upload}>
              Upload files
            </Button>
            <Button variant="link" size="sm" icon={ListPlus} onClick={() => setTypeListOpen(true)}>
              Type list
            </Button>
            <Button variant="link" size="sm" icon={History}>
              Email history
            </Button>
            <span className="mx-1 h-5 w-px bg-ink-200" />
            <Button variant="primary" icon={Plus} onClick={() => navigate('order')}>
              Build New Quote
            </Button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------- connect banner */}
      {bannerOpen && (
        <div className="shrink-0 px-5 pt-3.5">
          <div className="animate-in-fade flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-brand-200 ring-inset">
              <Mail className="size-4 text-brand-600" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">
                Connect your Outlook or Gmail inbox
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.45] text-ink-600">
                Connect the mailbox customers already write to and their requests land here on
                their own — no forwarding rule, no copy-paste out of Outlook.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 pl-2">
              <Button variant="primary" size="sm">
                Log in
              </Button>
              <Button variant="link" size="sm">
                Learn more
              </Button>
              <IconButton
                size="sm"
                icon={X}
                label="Dismiss"
                onClick={() => setBannerOpen(false)}
                className="hover:bg-brand-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- toolbar */}
      <div className="flex shrink-0 items-center gap-2 px-5 pt-3.5 pb-3">
        <SearchInput
          width="w-80"
          placeholder="Search customers, subjects, PO or order numbers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search requests"
        />
        <Button size="sm" icon={SlidersHorizontal}>
          Filter
          <span className="nums ml-0.5 rounded bg-ink-100 px-1 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-200 ring-inset">
            0
          </span>
        </Button>

        <div className="ml-auto flex items-center rounded-lg border border-ink-300 bg-white p-0.5 shadow-panel">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cx(
                'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors',
                tab === t.key
                  ? 'bg-ink-100 text-ink-900'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
              )}
            >
              {t.label}
              <span className="nums text-[11px] text-ink-400">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------- Screen 4 — selection bar */}
      {selectedRows.length >= 2 && (
        <div className="shrink-0 px-5 pb-3">
          <div className="animate-in-up flex items-center gap-3 rounded-xl border border-brand-200 bg-white px-3 py-2.5 shadow-panel">
            <span className="nums shrink-0 text-[13px] font-semibold text-ink-900">
              {selectedRows.length} selected
            </span>
            <span className="h-4 w-px shrink-0 bg-ink-200" />
            <p className="min-w-0 truncate text-[12px] text-ink-500">
              These quotes came from one request and can be merged back into a single order.
            </p>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {selectionGroup ? (
                <Button variant="primary" size="sm" icon={Merge} onClick={unsplit}>
                  Unsplit
                </Button>
              ) : (
                <Tooltip
                  content="Only quotes split from the same request can be unsplit."
                  side="top"
                  width="w-56"
                >
                  <Button variant="primary" size="sm" icon={Merge} disabled>
                    Unsplit
                  </Button>
                </Tooltip>
              )}
              <Button size="sm" icon={UserCheck} onClick={assignSelected}>
                Assign
              </Button>
              <Button
                size="sm"
                icon={Archive}
                onClick={() =>
                  archiveRows(
                    selectedRows.map((r) => r.id),
                    `${plural(selectedRows.length, 'request')} archived`,
                  )
                }
              >
                Archive
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- table */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-5 pb-5">
        <Card className="overflow-hidden">
          <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur [&_th]:bg-ink-50/95">
              <tr>
                <th scope="col" className="h-9 w-11 border-b border-ink-200 pr-2 pl-5">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked && !allChecked}
                    onChange={toggleAll}
                    label={<span className="sr-only">Select all requests</span>}
                  />
                </th>
                {COLUMNS.map((col) => {
                  const active = sort.key === col.key
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={cx(
                        'h-9 border-b border-ink-200 px-2 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase',
                        col.width,
                      )}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span
                        className={cx(
                          'flex items-center gap-1',
                          col.align === 'right' && 'justify-end',
                        )}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="group/sort -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 tracking-[0.04em] uppercase transition-colors hover:bg-ink-200/70 hover:text-ink-700"
                          >
                            <span className="truncate">{col.label}</span>
                            {active ? (
                              <ChevronDown
                                className={cx(
                                  'size-3 shrink-0 text-ink-500 transition-transform',
                                  sort.dir === 'asc' && 'rotate-180',
                                )}
                                strokeWidth={2.5}
                              />
                            ) : (
                              <ChevronsUpDown
                                className="size-3 shrink-0 opacity-0 transition-opacity group-hover/sort:opacity-60"
                                strokeWidth={2.25}
                              />
                            )}
                          </button>
                        ) : (
                          <span className="truncate">{col.label}</span>
                        )}
                        {col.help && <HelpTip content={col.help} />}
                      </span>
                    </th>
                  )
                })}
                <th scope="col" className="w-11 border-b border-ink-200">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {visible.map((r) => (
                <Row
                  key={r.id}
                  row={r}
                  checked={selected.has(r.id)}
                  flashing={flashId === r.id}
                  forceStatusTip={tipsOn && r.id === firstNewId}
                  forceSplitTip={tipsOn && r.id === firstSplitId}
                  onToggle={() => toggleRow(r.id)}
                  onOpen={() => navigate('order')}
                  onAssign={() => assignToMe(r)}
                  onProgress={() => markInProgress(r)}
                  onSplit={() =>
                    toast.info('Split from inside the request', {
                      description: 'Open it and pick which lines go on each quote.',
                    })
                  }
                  onArchive={() => archiveRows([r.id], 'Request archived')}
                  onSetCustomer={(match) => setCustomer(r, match)}
                />
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2}>
                    <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
                      <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                      <p className="text-[13px] font-medium text-ink-800">
                        {query ? `No requests match “${query.trim()}”` : 'Nothing in this view'}
                      </p>
                      <p className="max-w-sm text-[12px] text-ink-500">
                        Search by customer, subject, PO number or order number — or clear the
                        filters to see the whole queue.
                      </p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setQuery('')
                          setTab('all')
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border-t border-ink-200">
            <Pagination
              from={visible.length ? 1 : 0}
              to={visible.length}
              total={visible.length}
            />
          </div>
        </Card>
      </div>

      <TypeListModal
        open={typeListOpen}
        onClose={() => setTypeListOpen(false)}
        onSubmit={handleTypeListSubmit}
        defaultError={p.error === '1'}
        defaultText={p.filled === '1' ? SAMPLE_TYPED_LIST : ''}
      />
    </>
  )
}

/* ------------------------------------------------------------------- one row */

function Row({
  row: r,
  checked,
  flashing,
  forceStatusTip,
  forceSplitTip,
  onToggle,
  onOpen,
  onAssign,
  onProgress,
  onSplit,
  onArchive,
  onSetCustomer,
}) {
  const source = SOURCE_META[r.source] ?? SOURCE_META.email
  const SourceIcon = source.icon
  const sourceLabel = r.source === 'pdf' && r.attachment ? `PDF attachment — ${r.attachment}` : source.label

  return (
    <tr
      onClick={onOpen}
      className={cx(
        'group h-14 cursor-pointer transition-colors [&>td]:border-b [&>td]:border-ink-200 last:[&>td]:border-b-0',
        flashing
          ? 'bg-emerald-50 ring-1 ring-emerald-300 ring-inset'
          : checked
            ? 'bg-brand-50/60 shadow-[inset_2px_0_0_0] shadow-brand-600'
            : 'hover:bg-ink-50',
      )}
    >
      {/* select */}
      <td className="pr-2 pl-5 align-middle">
        <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
          {r.unread && (
            <span
              className="absolute -left-2.5 size-1.5 rounded-full bg-brand-600"
              aria-label="Unread"
            />
          )}
          <Checkbox
            checked={checked}
            onChange={onToggle}
            label={<span className="sr-only">Select {r.customer ?? r.subject}</span>}
          />
        </div>
      </td>

      {/* customer */}
      <td className="px-2 align-middle">
        {r.customer ? (
          <div className="min-w-0">
            <div
              className={cx(
                'truncate text-[13px] text-ink-900',
                r.unread ? 'font-semibold' : 'font-medium',
              )}
            >
              {r.customer}
            </div>
            <div className="truncate text-[11px] text-ink-400">{r.contact}</div>
          </div>
        ) : (
          <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
            <Menu
              align="left"
              width="w-64"
              trigger={
                <button
                  type="button"
                  className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-dashed border-ink-300 px-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                >
                  <UserPlus className="size-3 shrink-0" strokeWidth={2} />
                  <span className="truncate">Set Customer</span>
                  <ChevronDown className="size-3 shrink-0 opacity-60" strokeWidth={2.25} />
                </button>
              }
              items={[
                ...RECENT_CUSTOMERS.map((c) => ({
                  label: c.customer,
                  icon: Building2,
                  onClick: () => onSetCustomer(c),
                })),
                '-',
                {
                  label: 'Use placeholder account',
                  icon: CircleSlash,
                  onClick: () => onSetCustomer(PLACEHOLDER_CUSTOMER),
                },
              ]}
            />
            <div className="mt-0.5 truncate text-[11px] text-ink-400">(or use placeholder)</div>
          </div>
        )}
      </td>

      {/* branches */}
      <td className="px-2 align-middle">
        {r.branches?.length ? (
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            {r.branches.map((b) => (
              <Badge key={b} tone="slate" className="max-w-full">
                <span className="truncate">{b}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-[13px] text-ink-300">—</span>
        )}
      </td>

      {/* subject */}
      <td className="px-2 align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          <Tooltip content={sourceLabel}>
            <SourceIcon className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
          </Tooltip>
          <span className="truncate text-[13px] text-ink-700">{r.subject}</span>
          {r.splitGroup && (
            <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <Popover
                open={forceSplitTip || undefined}
                width="w-80"
                content={
                  <>
                    <span className="mb-1 block text-[12px] font-semibold text-ink-900">
                      {SPLIT_HELP.title}
                      {r.splitIndex ? (
                        <span className="ml-1.5 font-normal text-ink-400">
                          Quote {r.splitIndex} of {r.splitTotal}
                        </span>
                      ) : null}
                    </span>
                    {SPLIT_HELP.body}
                  </>
                }
              >
                <Badge tone="violet" icon={Split} className="cursor-default">
                  Split quote
                </Badge>
              </Popover>
            </span>
          )}
        </div>
      </td>

      {/* status */}
      <td className="px-2 align-middle">
        <StatusPill
          status={r.status}
          tooltip={STATUS_HELP[r.status]}
          forceTooltip={forceStatusTip}
        />
      </td>

      {/* user */}
      <td className="px-2 align-middle">
        {r.user ? (
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cx(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                AVATAR_TONES[r.user.tone] ?? AVATAR_TONES.blue,
              )}
            >
              {r.user.initials}
            </span>
            <span className="truncate text-[12px] text-ink-700">{r.user.name}</span>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-300 text-ink-400">
              <UserPlus className="size-3" strokeWidth={2} />
            </span>
            <span className="truncate text-[12px] text-ink-400">Unassigned</span>
          </div>
        )}
      </td>

      {/* order number */}
      <td className="px-2 align-middle">
        {r.orderNumber ? (
          <span className="nums text-[13px] text-ink-700">{r.orderNumber}</span>
        ) : (
          <span className="text-[13px] text-ink-300">—</span>
        )}
      </td>

      {/* po number */}
      <td className="px-2 align-middle">
        {r.poNumber && r.poNumber !== '—' ? (
          <span className="nums truncate text-[13px] text-ink-700">{r.poNumber}</span>
        ) : (
          <span className="text-[13px] text-ink-300">—</span>
        )}
      </td>

      {/* date */}
      <td className="px-2 align-middle">
        <div className="nums min-w-0">
          <div className="truncate text-[13px] text-ink-700">{r.date}</div>
          <div className="truncate text-[11px] text-ink-400">{r.time}</div>
        </div>
      </td>

      {/* lines */}
      <td className="px-2 text-right align-middle">
        <span className="nums inline-flex min-w-7 justify-center rounded-md bg-ink-100 px-1.5 py-0.5 text-[12px] font-medium text-ink-600">
          {r.lines}
        </span>
      </td>

      {/* row menu */}
      <td className="pr-3 pl-1 align-middle">
        <RowMenu
          row={r}
          onOpen={onOpen}
          onAssign={onAssign}
          onProgress={onProgress}
          onSplit={onSplit}
          onArchive={onArchive}
        />
      </td>
    </tr>
  )
}

/**
 * "⋮" row menu. Hidden until the row is hovered, but pinned visible for as long
 * as the menu itself is open.
 */
function RowMenu({ row, onOpen, onAssign, onProgress, onSplit, onArchive }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOnClickOutside(ref, () => setOpen(false))
  const run = (fn) => () => {
    setOpen(false)
    fn?.()
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className={cx(
        'flex justify-end transition-opacity focus-within:opacity-100 group-hover:opacity-100',
        open ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Menu
        open={open}
        align="right"
        width="w-52"
        trigger={
          <IconButton
            size="sm"
            icon={MoreVertical}
            active={open}
            label={`Actions for ${row.customer ?? row.subject}`}
            onClick={() => setOpen((o) => !o)}
          />
        }
        items={[
          { label: 'Open', icon: ExternalLink, onClick: run(onOpen) },
          { label: 'Assign to me', icon: UserCheck, onClick: run(onAssign) },
          { label: 'Mark as in progress', icon: Clock, onClick: run(onProgress) },
          { label: 'Split quote', icon: Split, onClick: run(onSplit) },
          '-',
          { label: 'Archive', icon: Archive, danger: true, onClick: run(onArchive) },
        ]}
      />
    </div>
  )
}
