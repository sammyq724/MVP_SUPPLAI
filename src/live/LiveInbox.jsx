import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronsUpDown,
  FilePlus,
  Flag,
  History as HistoryIcon,
  Mail,
  MoreVertical,
  Paperclip,
  PencilLine,
  RefreshCw,
  SearchX,
  Trash2,
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
  Tooltip,
  cx,
  useOnClickOutside,
} from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'
import LiveStatusPill from './LiveStatusPill.jsx'
import ConfirmDelete from './ConfirmDelete.jsx'
import NewOrderModal from '../screens/NewOrderModal.jsx'
import { useInbox } from './useInbox.js'
import { draftIds, pruneDrafts, clearDraft } from './useDraft.js'
import { submitManualOrder } from './submitManual.js'
import { displayStatus, showsInInbox, statusMeta } from './adapt.js'
import { AUTH_ERROR } from './api.js'

/**
 * Screen 1, live — the real inbox, polled every 10 seconds exactly as /inbox
 * polls it.
 *
 * The columns are the mock's, mapped onto what a job summary actually carries.
 * Two of them are honest about what this path does not know: PO Number has no
 * source on the email route at all, and Customer falls through to the sender
 * address because `createJob()` never records a customer id.
 */

const COLUMNS = [
  { key: 'customer', label: 'Customer', width: 'w-[20%]', sortable: true },
  { key: 'subject', label: 'Subject', width: 'w-[32%]', sortable: true },
  { key: 'status', label: 'Status', width: 'w-[13%]', sortable: true },
  { key: 'orderNumber', label: 'Order Number', width: 'w-[11%]', sortable: true },
  {
    key: 'poNumber',
    label: 'PO Number',
    width: 'w-[10%]',
    sortable: false,
    help: 'Not captured on the email path yet — nothing upstream records the customer’s own PO number, so this is always blank here.',
  },
  { key: 'date', label: 'Date', width: 'w-[9%]', sortable: true },
  {
    key: 'lines',
    label: 'Lines',
    width: 'w-[5%]',
    sortable: true,
    align: 'right',
    help: 'Line items parsed out of the email. A line still counts here even if no item ID could be predicted for it.',
  },
]

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'In Progress', label: 'In Progress' },
]

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function LiveInbox({ navigate }) {
  const toast = useToast()
  const { rows: allRows, counts, loading, error, reload, setFlag, dismiss } = useInbox()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' })
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [drafts, setDrafts] = useState(() => draftIds())

  // A gate skip never left the salesman's Gmail inbox, so it does not belong in
  // this one either (Sam). It is a record of a decision, and lives in History.
  const rows = useMemo(() => allRows.filter((r) => showsInInbox(r.status)), [allRows])

  // Which emails have unfinished work saved in this browser. Recomputed when
  // the list changes rather than on a timer: coming back from a detail view
  // re-renders this, which is exactly when the answer can have changed.
  useEffect(() => {
    if (!allRows.length) return
    pruneDrafts(allRows.map((r) => r.id))
    setDrafts(draftIds())
  }, [allRows])

  const tabCounts = useMemo(() => {
    const out = { all: rows.length, New: 0, 'In Progress': 0 }
    for (const r of rows) {
      const t = statusMeta(displayStatus(r, drafts)).tab
      if (t) out[t] += 1
    }
    return out
  }, [rows, drafts])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (tab === 'all' ? true : statusMeta(displayStatus(r, drafts)).tab === tab))
      .filter(({ r }) =>
        !q
          ? true
          : [r.customer, r.contact, r.subject, r.orderNumber, r.matchedQuote]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)),
      )
    const LAST = '￿'
    const value = ({ r, i }) => {
      switch (sort.key) {
        case 'customer': return (r.customer ?? LAST).toLowerCase()
        case 'subject': return r.subject.toLowerCase()
        case 'status': return r.status
        case 'orderNumber': return r.orderNumber ?? LAST
        case 'lines': return r.lines ?? -1
        // The list arrives newest-first from the server, so position is the
        // date rank — and sorting by the formatted string would order by month
        // name.
        default: return -i
      }
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...out]
      .sort((a, b) => {
        const va = value(a)
        const vb = value(b)
        if (va < vb) return -dir
        if (va > vb) return dir
        return a.i - b.i
      })
      .map(({ r }) => r)
  }, [rows, query, tab, sort, drafts])

  const toggleSort = useCallback((key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'lines' || key === 'date' ? 'desc' : 'asc' },
    )
  }, [])

  /**
   * A typed or attached order. POSTed to /api/jobs, the same endpoint Make uses
   * for arriving email, so it becomes an ordinary inbox entry: it predicts in
   * the background and lands as a card to be reviewed and submitted like any
   * other. See src/live/submitManual.js.
   */
  const handleNewOrder = useCallback(
    async ({ text, files }) => {
      if (sending) return
      setSending(true)
      try {
        const { subject } = await submitManualOrder({ text, files })
        setNewOrderOpen(false)
        setTab('all')
        setQuery('')
        toast?.success('Order sent for prediction', {
          description: `${subject} — it will appear below as Predicting`,
        })
        await reload()
      } catch (e) {
        // The dialog is left open with the rep's text still in it: a failed
        // send must not cost them what they typed.
        if (e.message !== AUTH_ERROR) {
          toast?.warning('Could not send that order', { description: e.message })
        }
      } finally {
        setSending(false)
      }
    },
    [sending, toast, reload],
  )

  const onFlag = async (row) => {
    try {
      await setFlag(row.id, !row.flagged)
    } catch (e) {
      if (e.message !== AUTH_ERROR) toast?.warning('Could not flag that email', { description: e.message })
    }
  }

  return (
    <>
      {/* ---------------------------------------------------------- top bar */}
      <header className="shrink-0 border-b border-ink-200 bg-white px-5 pt-4 pb-3.5">
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">Inbox</h1>
              <span className="nums text-[12px] text-ink-500">
                {plural(counts.needs_review ?? 0, 'request')} waiting
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1">
                <Mail className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
                <span className="text-[12px] text-ink-700">
                  Emails arrive automatically — Make triages them and the server predicts.
                </span>
              </div>
              <HelpTip content="This queue is inbox_log.csv replayed on the server. Nothing here is typed in by hand: an email lands, the quote gate decides whether it duplicates an open quote, and anything that does not gets predicted." />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Button size="md" icon={RefreshCw} onClick={() => reload()}>
              Refresh
            </Button>
            {/* An order that arrived by phone, by hand or as a bare takeoff.
                It goes through the same endpoint arriving email does, so it
                lands here as an ordinary card and is reviewed the same way. */}
            <Button variant="primary" size="md" icon={FilePlus} onClick={() => setNewOrderOpen(true)}>
              Build New Quote/PO
            </Button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- toolbar */}
      <div className="flex shrink-0 items-center gap-2 px-5 pt-3.5 pb-3">
        <SearchInput
          width="w-80"
          placeholder="Search customers, senders, subjects or order numbers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search requests"
        />
        {counts.skipped > 0 && (
          <Tooltip content="Gate skips are not in this inbox — nothing was predicted and the email never moved. They are recorded under History.">
            <button
              type="button"
              onClick={() => navigate('history', { tab: 'skipped' })}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 text-[12px] font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <HistoryIcon className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="nums">{counts.skipped}</span> skipped — in History
            </button>
          </Tooltip>
        )}

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
              <span className="nums text-[11px] text-ink-400">{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-5 mb-3 shrink-0 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-800">
          Could not load the inbox — {error}
        </div>
      )}

      {/* ----------------------------------------------------------- table */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[1140px] table-fixed border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-ink-50/95 backdrop-blur [&_th]:bg-ink-50/95">
                <tr>
                  <th scope="col" className="h-9 w-9 border-b border-ink-200 pr-1 pl-5">
                    <span className="sr-only">Flag</span>
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
                        <span className={cx('flex items-center gap-1', col.align === 'right' && 'justify-end')}>
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
                    status={displayStatus(r, drafts)}
                    onOpen={() => navigate('order', { id: r.id })}
                    onFlag={() => onFlag(r)}
                    onDelete={() => setDeleting(r)}
                  />
                ))}

                {visible.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 2}>
                      <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
                        <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
                        <p className="text-[13px] font-medium text-ink-800">
                          {loading
                            ? 'Loading…'
                            : query
                              ? `No requests match “${query.trim()}”`
                              : 'No emails waiting. New ones appear here automatically.'}
                        </p>
                        {(query || tab !== 'all') && (
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => { setQuery(''); setTab('all') }}
                          >
                            Clear filters
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
            <Pagination from={visible.length ? 1 : 0} to={visible.length} total={visible.length} />
          </div>
        </Card>
      </div>

      <NewOrderModal
        open={newOrderOpen}
        busy={sending}
        onClose={() => !sending && setNewOrderOpen(false)}
        onSubmit={handleNewOrder}
      />

      <ConfirmDelete
        job={deleting ? { ...deleting.raw, subject: deleting.subject } : null}
        open={!!deleting}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          setDeleteBusy(true)
          try {
            await dismiss(deleting.id)
            clearDraft(deleting.id)
            setDrafts(draftIds())
            toast?.success('Email deleted', { description: deleting.subject })
            setDeleting(null)
          } catch (e) {
            if (e.message !== AUTH_ERROR) {
              toast?.warning('Could not delete that email', { description: e.message })
            }
          } finally {
            setDeleteBusy(false)
          }
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------- row */

function Row({ row: r, status, onOpen, onFlag, onDelete }) {
  return (
    <tr
      onClick={onOpen}
      className={cx(
        'group min-h-14 cursor-pointer transition-colors [&>td]:border-b [&>td]:border-ink-200 last:[&>td]:border-b-0 hover:bg-ink-50',
        // The blue left edge of a flagged email, as on /inbox.
        r.flagged && 'bg-brand-50/40 shadow-[inset_2px_0_0_0] shadow-brand-600',
      )}
    >
      {/* flag */}
      <td className="pr-1 pl-5 align-middle">
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Tooltip content={r.flagged ? 'Remove the blue flag' : 'Flag this email'}>
            <button
              type="button"
              aria-pressed={r.flagged}
              aria-label={r.flagged ? 'Remove the blue flag' : 'Flag this email'}
              onClick={onFlag}
              className={cx(
                'inline-flex size-6 items-center justify-center rounded-md transition-colors',
                r.flagged
                  ? 'text-brand-600'
                  : 'text-ink-300 opacity-0 group-hover:opacity-100 hover:text-brand-600 focus:opacity-100',
              )}
            >
              <Flag className="size-3.5" strokeWidth={2} fill={r.flagged ? 'currentColor' : 'none'} />
            </button>
          </Tooltip>
        </div>
      </td>

      {/* customer + contact beneath */}
      <td className="px-2 align-middle">
        <div className="min-w-0">
          <div
            className={cx(
              'truncate text-[13px] text-ink-900',
              r.unread ? 'font-semibold' : 'font-medium',
            )}
          >
            {r.customer || <span className="font-normal text-ink-400">(unknown)</span>}
          </div>
          {r.contact && r.contact !== r.customer && (
            <div className="truncate text-[11px] text-ink-400">{r.contact}</div>
          )}
        </div>
      </td>

      {/* subject, then its tags on their OWN line.
          They used to sit inline after the subject, which pushed them past the
          column edge and over the Status pill on any row with a long subject
          (Sam). Stacked, each stays inside its own column whatever the subject
          length. */}
      <td className="px-2 py-2 align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          {r.attachmentCount > 0 && (
            <Tooltip content={plural(r.attachmentCount, 'attachment') + ' on this email'}>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-ink-400">
                <Paperclip className="size-3.5" strokeWidth={2} />
                {r.attachmentCount > 1 && <span className="nums text-[10px]">{r.attachmentCount}</span>}
              </span>
            </Tooltip>
          )}
          <span className="truncate text-[13px] text-ink-700">{r.subject}</span>
        </div>

        {(r.manual ||
          r.potentialMatch ||
          r.noQuoteFound ||
          r.splitLabel ||
          r.splitOffCount > 0 ||
          r.partOf ||
          r.overturned) && (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
            {r.manual && (
              <Tooltip content="Entered by hand through Build New Quote/PO, not received by email">
                <Badge tone="blue" icon={PencilLine}>Typed in</Badge>
              </Tooltip>
            )}
            {r.potentialMatch ? (
              <Tooltip content={`May duplicate quote ${r.potentialMatch.quote_ref} — check before entering`}>
                <Badge tone="amber">Potential PO quote match</Badge>
              </Tooltip>
            ) : r.noQuoteFound ? (
              <Tooltip content="Checked against open quotes — none match this PO">
                <Badge tone="slate">No quote found</Badge>
              </Tooltip>
            ) : null}
            {/* Both sides of a split are tagged: the child because it is one,
                the parent because lines of it now live elsewhere. */}
            {(r.splitLabel || r.splitOffCount > 0) && (
              <Tooltip
                content={
                  r.splitLabel
                    ? 'Split off from another entry — these lines were moved here'
                    : `${plural(r.splitOffCount, 'line')} moved to a separate entry`
                }
              >
                <Badge tone="blue">Split Quote</Badge>
              </Tooltip>
            )}
            {r.partOf && (
              <Tooltip content={`This PO covered more than one quote and was split into ${r.partTotal} entries`}>
                <Badge tone="violet">Part {r.partIndex}/{r.partTotal}</Badge>
              </Tooltip>
            )}
            {r.overturned && <Badge tone="violet">gate overturned</Badge>}
          </div>
        )}

        {(r.splitLabel || r.splitOffCount > 0) && (
          <div className="mt-1 truncate text-[11px] text-ink-400">
            {r.splitLabel
              ? 'split from another entry'
              : `${plural(r.splitOffCount, 'line')} split off into a separate entry`}
          </div>
        )}

        {r.status === 'error' && (
          <div className="mt-1 truncate text-[11px] text-red-600">{r.error || 'failed'}</div>
        )}
      </td>

      {/* status — a column, so a second pill stacks under the first rather
          than widening the cell into its neighbour */}
      <td className="px-2 py-2 align-middle">
        <div className="flex flex-col items-start gap-1">
          <LiveStatusPill status={status} />
        </div>
      </td>

      {/* order number */}
      <td className="px-2 align-middle">
        {r.orderNumber ? (
          <span className="nums text-[13px] text-ink-700">{r.orderNumber}</span>
        ) : (
          <span className="text-[13px] text-ink-300">—</span>
        )}
      </td>

      {/* po number — no source on this path */}
      <td className="px-2 align-middle">
        <span className="text-[13px] text-ink-300">—</span>
      </td>

      {/* date */}
      <td className="px-2 align-middle" title={r.dateFull}>
        <div className="nums min-w-0">
          <div className="truncate text-[13px] text-ink-700">{r.date}</div>
          <div className="truncate text-[11px] text-ink-400">{r.time}</div>
        </div>
      </td>

      {/* lines */}
      <td className="px-2 text-right align-middle">
        {r.lines == null ? (
          <span className="text-[13px] text-ink-300">—</span>
        ) : (
          <span className="nums inline-flex min-w-7 justify-center rounded-md bg-ink-100 px-1.5 py-0.5 text-[12px] font-medium text-ink-600">
            {r.lines}
          </span>
        )}
      </td>

      {/* row menu */}
      <td className="pr-3 pl-1 align-middle">
        <RowMenu row={r} onOpen={onOpen} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function RowMenu({ row, onOpen, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOnClickOutside(ref, () => setOpen(false))
  const run = (fn) => () => { setOpen(false); fn?.() }

  // A submitted email's rows are already in review_queue2.csv, so there is
  // nothing left to cancel — the server refuses it too, this just does not
  // offer it.
  const items = [{ label: 'Open', onClick: run(onOpen) }]
  if (row.status !== 'submitted') {
    items.push('-', { label: 'Delete', icon: Trash2, danger: true, onClick: run(onDelete) })
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
        width="w-44"
        trigger={
          <IconButton
            size="sm"
            icon={MoreVertical}
            active={open}
            label={`Actions for ${row.subject}`}
            onClick={() => setOpen((o) => !o)}
          />
        }
        items={items}
      />
    </div>
  )
}
