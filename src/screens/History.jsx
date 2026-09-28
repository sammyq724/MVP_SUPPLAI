import React, { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronsUpDown,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Printer,
  Receipt,
  RotateCcw,
  SearchX,
  Truck,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  HelpTip,
  IconButton,
  Menu,
  Pagination,
  SearchInput,
  cx,
  money,
} from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'
import { DOC_TONES, deleted, submitted } from '../data/history.js'

/**
 * History — everything that has left the queue.
 *
 * Two tabs, because "what did we send?" and "what did we throw away?" are
 * different questions: Submitted holds the quotes and orders that went out,
 * Deleted holds the ones that never did, with the reason attached.
 *
 * The table carries what identifies a document; expanding a row shows the three
 * blocks a rep actually gets asked about after the fact — pricing, shipping and
 * billing — rather than sending them to the ERP for it.
 */

const TABS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'deleted', label: 'Deleted' },
]

const PICK_TICKET_HELP =
  'The warehouse pick list for this order. Quotes never have one — nothing is picked until a quote becomes an order.'

const COLUMNS = [
  { key: 'docNumber', label: 'Order #', width: 'w-[13%]', sortable: true },
  { key: 'pickTicket', label: 'Pick Ticket #', width: 'w-[12%]', sortable: true, help: PICK_TICKET_HELP },
  { key: 'customer', label: 'Customer', width: 'w-[22%]', sortable: true },
  { key: 'docType', label: 'Type', width: 'w-[14%]', sortable: true },
  { key: 'date', label: 'Date', width: 'w-[11%]', sortable: true },
  { key: 'lines', label: 'Lines', width: 'w-[7%]', sortable: true, align: 'right' },
  { key: 'total', label: 'Total', width: 'w-[13%]', sortable: true, align: 'right' },
]

/** One labelled line inside a detail panel. */
function Row({ label, value, strong, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[11px] text-ink-500">{label}</span>
      <span
        className={cx(
          'nums min-w-0 text-right text-[12px]',
          strong ? 'font-semibold text-ink-900' : 'text-ink-700',
          tone === 'credit' && 'text-emerald-700',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function DetailPanel({ title, icon: Icon, children }) {
  return (
    <div className="min-w-0 rounded-lg border border-ink-200 bg-white p-3">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
        <Icon className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
        {title}
      </h4>
      {children}
    </div>
  )
}

function Detail({ record }) {
  const { pricing: p, shipping: s, billing: b } = record
  return (
    <div className="grid grid-cols-1 gap-3 bg-ink-50 px-4 py-3 lg:grid-cols-3">
      <DetailPanel title="Pricing" icon={Receipt}>
        <Row label="Subtotal" value={money(p.subtotal)} />
        <Row
          label="Discount"
          value={p.discount ? `−${money(p.discount)}` : money(0)}
          tone={p.discount ? 'credit' : undefined}
        />
        <Row label="Freight" value={money(p.freight)} />
        <Row label="Tax" value={money(p.tax)} />
        <div className="mt-1 border-t border-ink-200 pt-1">
          <Row label="Total" value={money(p.total)} strong />
        </div>
      </DetailPanel>

      <DetailPanel title="Shipping" icon={Truck}>
        <p className="text-[12px] font-medium text-ink-900">{s.name}</p>
        <p className="mt-0.5 mb-1.5 text-[11px] leading-4 whitespace-pre-line text-ink-500">
          {s.address}
        </p>
        <div className="border-t border-ink-200 pt-1">
          <Row label="Ship via" value={s.shipVia} />
          <Row label="Ship date" value={s.shipDate} />
          <Row label="Carrier" value={s.carrier} />
          <Row label="Tracking" value={s.tracking} />
          <Row label="Freight terms" value={s.freightTerms} />
        </div>
      </DetailPanel>

      <DetailPanel title="Billing" icon={CreditCard}>
        <p className="text-[12px] font-medium text-ink-900">{b.name}</p>
        <p className="mt-0.5 mb-1.5 text-[11px] leading-4 whitespace-pre-line text-ink-500">
          {b.address}
        </p>
        <div className="border-t border-ink-200 pt-1">
          <Row label="Customer PO" value={b.poNumber} />
          <Row label="Terms" value={b.terms} />
          <Row label="Invoice" value={b.invoice} />
        </div>
      </DetailPanel>
    </div>
  )
}

export default function History({ params, navigate }) {
  const p = params ?? {}
  const toast = useToast()
  const [tab, setTab] = useState(p.tab === 'deleted' ? 'deleted' : 'submitted')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const [openId, setOpenId] = useState(p.open ?? null)

  const source = tab === 'deleted' ? deleted : submitted

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = source.filter((r) =>
      !q
        ? true
        : [r.docNumber, r.pickTicket, r.customer, r.contact, r.billing.poNumber]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
    )
    const dir = sort.dir === 'asc' ? 1 : -1
    const LAST = '￿'
    const value = (r) => {
      switch (sort.key) {
        case 'total':
          return r.pricing.total
        case 'lines':
          return r.lines
        case 'pickTicket':
          return r.pickTicket ?? LAST
        case 'date':
          // Mock dates are display strings; index order is already newest-first.
          return source.indexOf(r)
        default:
          return String(r[sort.key] ?? '').toLowerCase()
      }
    }
    return [...filtered].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (typeof va === 'number' && typeof vb === 'number') {
        return sort.key === 'date' ? (va - vb) * -dir : (va - vb) * dir
      }
      return va < vb ? -dir : va > vb ? dir : 0
    })
  }, [source, query, sort])

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'customer' || key === 'docType' ? 'asc' : 'desc' },
    )

  const rowMenu = (r) => [
    { label: 'Open document', icon: ExternalLink, onClick: () => toast?.info(`${r.docNumber} opened`) },
    {
      label: 'Download PDF',
      icon: Download,
      onClick: () => toast?.success('PDF ready', { description: `${r.docNumber}.pdf` }),
    },
    { label: 'Print', icon: Printer, onClick: () => toast?.info('Sent to printer queue') },
    ...(tab === 'deleted'
      ? [
          '-',
          {
            label: 'Restore to queue',
            icon: RotateCcw,
            onClick: () =>
              toast?.success(`${r.docNumber} restored`, {
                description: 'Back in the Sales queue as In Progress',
                onUndo: () => {},
              }),
          },
        ]
      : []),
  ]

  return (
    <>
      {/* ---------------------------------------------------------- top bar */}
      <header className="shrink-0 border-b border-ink-200 bg-white px-5 pt-4 pb-3.5">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">History</h1>
              <span className="nums text-[12px] text-ink-500">
                {submitted.length} submitted · {deleted.length} deleted
              </span>
            </div>
            <p className="mt-1 text-[12px] text-ink-500">
              Every quote and order that has left the queue, with the pricing, shipping and billing
              it went out with.
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Button
              variant="link"
              size="sm"
              icon={Download}
              onClick={() =>
                toast?.success('Export ready', { description: `history-${tab}.csv` })
              }
            >
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------ tabs + search */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 pt-3 pb-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-0.5">
          {TABS.map((t) => {
            const count = t.key === 'deleted' ? deleted.length : submitted.length
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key)
                  setOpenId(null)
                }}
                aria-pressed={tab === t.key}
                className={cx(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors',
                  tab === t.key
                    ? 'bg-ink-100 text-ink-900'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
                )}
              >
                {t.label}
                <span className="nums text-[11px] text-ink-400">{count}</span>
              </button>
            )
          })}
        </div>

        <SearchInput
          width="w-80"
          placeholder="Search order #, pick ticket, customer or PO"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {tab === 'deleted' && (
          <p className="text-[12px] text-ink-500">
            Deleted documents keep their numbers — nothing is reused.
          </p>
        )}
      </div>

      {/* --------------------------------------------------------------- table */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[60rem] table-fixed border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur [&_th]:bg-ink-50/95">
                <tr>
                  <th scope="col" className="h-9 w-9 border-b border-ink-200 pl-4">
                    <span className="sr-only">Expand</span>
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
                        aria-sort={
                          active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        <span
                          className={cx(
                            'flex items-center gap-1',
                            col.align === 'right' && 'justify-end',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex min-w-0 items-center gap-1 truncate transition-colors hover:text-ink-800"
                          >
                            <span className="truncate">{col.label}</span>
                            {active ? (
                              <ChevronDown
                                className={cx(
                                  'size-3 shrink-0 transition-transform',
                                  sort.dir === 'asc' && 'rotate-180',
                                )}
                                strokeWidth={2.5}
                              />
                            ) : (
                              <ChevronsUpDown className="size-3 shrink-0 opacity-40" strokeWidth={2} />
                            )}
                          </button>
                          {col.help && <HelpTip content={col.help} />}
                        </span>
                      </th>
                    )
                  })}
                  {tab === 'deleted' && (
                    <th
                      scope="col"
                      className="h-9 w-[18%] border-b border-ink-200 px-2 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase"
                    >
                      Deleted
                    </th>
                  )}
                  <th scope="col" className="w-11 border-b border-ink-200">
                    <span className="sr-only">Row actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const open = openId === r.id
                  const span = COLUMNS.length + (tab === 'deleted' ? 3 : 2)
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => setOpenId(open ? null : r.id)}
                        className={cx(
                          'group cursor-pointer border-b border-ink-200 transition-colors',
                          open ? 'bg-brand-50' : 'hover:bg-ink-50',
                        )}
                      >
                        <td className="h-11 border-b border-ink-200 pl-4 align-middle">
                          <ChevronDown
                            className={cx(
                              'size-3.5 text-ink-400 transition-transform',
                              open ? 'rotate-0' : '-rotate-90',
                            )}
                            strokeWidth={2.25}
                            aria-hidden="true"
                          />
                        </td>

                        <td className="border-b border-ink-200 px-2 align-middle">
                          <span className="nums text-[13px] font-medium text-ink-900">
                            {r.docNumber}
                          </span>
                        </td>

                        <td className="border-b border-ink-200 px-2 align-middle">
                          {r.pickTicket ? (
                            <span className="nums text-[13px] text-ink-700">{r.pickTicket}</span>
                          ) : (
                            <span className="text-[13px] text-ink-300">—</span>
                          )}
                        </td>

                        <td className="border-b border-ink-200 px-2 align-middle">
                          <span className="block truncate text-[13px] font-medium text-ink-900">
                            {r.customer}
                          </span>
                          <span className="block truncate text-[11px] text-ink-400">
                            {r.contact}
                          </span>
                        </td>

                        <td className="border-b border-ink-200 px-2 align-middle">
                          <Badge tone={DOC_TONES[r.docType] ?? 'slate'}>{r.docType}</Badge>
                        </td>

                        <td className="border-b border-ink-200 px-2 align-middle">
                          <span className="block text-[13px] text-ink-700">{r.date}</span>
                          <span className="block text-[11px] text-ink-400">{r.time}</span>
                        </td>

                        <td className="border-b border-ink-200 px-2 text-right align-middle">
                          <span className="nums text-[13px] text-ink-700">{r.lines}</span>
                        </td>

                        <td className="border-b border-ink-200 px-2 text-right align-middle">
                          <span className="nums text-[13px] font-semibold text-ink-900">
                            {money(r.pricing.total)}
                          </span>
                        </td>

                        {tab === 'deleted' && (
                          <td className="border-b border-ink-200 px-2 align-middle">
                            <span className="block text-[12px] text-ink-700">{r.deletedDate}</span>
                            <span className="block truncate text-[11px] text-ink-400">
                              {r.deletedReason}
                            </span>
                          </td>
                        )}

                        <td
                          className="border-b border-ink-200 pr-3 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Menu
                            align="right"
                            width="w-52"
                            trigger={
                              <IconButton
                                icon={FileText}
                                label={`${r.docNumber} actions`}
                                size="sm"
                                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                              />
                            }
                            items={rowMenu(r)}
                          />
                        </td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={span} className="border-b border-ink-200 p-0">
                            <Detail record={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + (tab === 'deleted' ? 3 : 2)}>
                      <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
                        <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                        <p className="text-[13px] font-medium text-ink-800">
                          {query
                            ? `Nothing in ${tab === 'deleted' ? 'Deleted' : 'Submitted'} matches “${query.trim()}”`
                            : 'Nothing here yet'}
                        </p>
                        <p className="max-w-sm text-[12px] text-ink-500">
                          Search by order number, pick ticket, customer or their PO number.
                        </p>
                        {query && (
                          <Button size="sm" className="mt-2" onClick={() => setQuery('')}>
                            Clear search
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 border-t border-ink-200">
            <Pagination from={rows.length ? 1 : 0} to={rows.length} total={rows.length} />
          </div>
        </Card>
      </div>
    </>
  )
}
