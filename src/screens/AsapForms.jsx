import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
  Archive,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Files,
  Inbox,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
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
  SearchInput,
  Tooltip,
  cx,
  useCopy,
} from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'

/* ------------------------------------------------------------------ local data */

/**
 * ASAP forms are the self-serve order pages a rep hands to a customer. A
 * submission lands in the request queue exactly like an inbound email, already
 * tied to the account and the branch that fills it.
 */
const FORMS = [
  {
    id: 'f-1',
    name: 'Riverbend Tower — Phase 2 Reorder',
    customer: 'Brightline Mechanical',
    branch: 'Katy Supply (KTY-07)',
    status: 'Live',
    submissions: 34,
    lastSubmission: 'Sep 5, 2026',
    avgLines: '11.4',
    url: 'supplai.com/f/meridian/riverbend-ph2',
  },
  {
    id: 'f-2',
    name: 'Standing Weekly Restock — Northgate',
    customer: 'Northgate Industrial',
    branch: 'Houston — North (HOU-01)',
    status: 'Live',
    submissions: 128,
    lastSubmission: 'Sep 4, 2026',
    avgLines: '6.2',
    url: 'supplai.com/f/meridian/northgate-weekly',
  },
  {
    id: 'f-3',
    name: 'Cable Tray + Fittings Quick Order',
    customer: 'Vantage Data Centers',
    branch: 'San Antonio (SAT-02)',
    status: 'Draft',
    submissions: 0,
    lastSubmission: '—',
    avgLines: '—',
    url: 'supplai.com/f/meridian/vantage-tray',
  },
  {
    id: 'f-4',
    name: 'LED Retrofit Bldg C — Takeoff Upload',
    customer: 'Ironwood Facilities Group',
    branch: 'Baytown (BAY-05)',
    status: 'Live',
    submissions: 9,
    lastSubmission: 'Sep 2, 2026',
    avgLines: '18.0',
    url: 'supplai.com/f/meridian/ironwood-led-c',
  },
  {
    id: 'f-5',
    name: 'Duct Hardware Reorder — 2025 pricing',
    customer: 'Lakeshore HVAC Partners',
    branch: 'Boerne (BRN-09)',
    status: 'Archived',
    submissions: 212,
    lastSubmission: 'Mar 18, 2026',
    avgLines: '8.7',
    url: 'supplai.com/f/meridian/lakeshore-duct-25',
  },
]

const STATUS_TONE = { Live: 'green', Draft: 'amber', Archived: 'slate' }

const AVG_LINES_HELP =
  'Average number of line items per submission. A high number usually means the customer is pasting a takeoff — consider swapping the form for a file upload field.'

/* --------------------------------------------------------------------- screen */

export default function AsapForms({ params, navigate }) {
  const toast = useToast()
  const [forms, setForms] = useState(FORMS)
  const [query, setQuery] = useState('')
  const seq = useRef(0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return forms
    return forms.filter((f) =>
      [f.name, f.customer, f.branch].some((v) => v.toLowerCase().includes(q)),
    )
  }, [forms, query])

  const liveCount = forms.filter((f) => f.status === 'Live').length

  const createForm = useCallback(() => {
    const n = ++seq.current
    const draft = {
      id: `f-new-${n}`,
      name: 'Untitled order form',
      customer: 'No customer selected',
      branch: 'Houston — North (HOU-01)',
      status: 'Draft',
      submissions: 0,
      lastSubmission: '—',
      avgLines: '—',
      url: `supplai.com/f/meridian/untitled-${n}`,
    }
    setForms((fs) => [draft, ...fs])
    setQuery('')
    toast.success('Draft form created', {
      description: 'Pick a customer and add items before you share it.',
      onUndo: () => setForms((fs) => fs.filter((f) => f.id !== draft.id)),
    })
  }, [toast])

  const duplicateForm = useCallback(
    (form) => {
      const n = ++seq.current
      const copyOf = {
        ...form,
        id: `${form.id}-copy-${n}`,
        name: `${form.name} (copy)`,
        status: 'Draft',
        submissions: 0,
        lastSubmission: '—',
        avgLines: '—',
        url: `${form.url}-copy`,
      }
      setForms((fs) => {
        const i = fs.findIndex((f) => f.id === form.id)
        return [...fs.slice(0, i + 1), copyOf, ...fs.slice(i + 1)]
      })
      toast.success('Form duplicated', {
        description: copyOf.name,
        onUndo: () => setForms((fs) => fs.filter((f) => f.id !== copyOf.id)),
      })
    },
    [toast],
  )

  const setStatus = useCallback(
    (form, status) => {
      setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, status } : f)))
      toast.success(status === 'Archived' ? 'Form archived' : 'Form restored', {
        description: form.name,
        onUndo: () =>
          setForms((fs) => fs.map((f) => (f.id === form.id ? { ...f, status: form.status } : f))),
      })
    },
    [toast],
  )

  const deleteForm = useCallback(
    (form) => {
      const prev = forms
      setForms((fs) => fs.filter((f) => f.id !== form.id))
      toast.success('Form deleted', {
        description: form.name,
        onUndo: () => setForms(prev),
      })
    },
    [forms, toast],
  )

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-200 bg-white px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">
            ASAP Customer Forms
          </h1>
          <span className="nums shrink-0 text-[12px] text-ink-500">
            {forms.length} forms · {liveCount} live
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchInput
            width="w-60"
            placeholder="Search forms or customers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search forms"
          />
          <Button variant="primary" icon={Plus} onClick={createForm}>
            New form
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 max-w-3xl text-[12px] leading-[1.5] text-ink-500">
          A form gives one customer their own order page — no login, no email. Anything they
          submit lands in the Sales queue already matched to the account and the branch that
          fills it.
        </p>

        {visible.length === 0 ? (
          <Card className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
            <SearchX className="mb-1 size-6 text-ink-300" strokeWidth={1.75} />
            <p className="text-[13px] font-medium text-ink-800">
              No forms match “{query.trim()}”
            </p>
            <p className="max-w-sm text-[12px] text-ink-500">
              Search by form name, customer or branch.
            </p>
            <Button size="sm" className="mt-2" icon={Search} onClick={() => setQuery('')}>
              Clear search
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((f) => (
              <FormCard
                key={f.id}
                form={f}
                onOpen={() =>
                  toast.info('Opening form', {
                    description: f.name,
                  })
                }
                onDuplicate={() => duplicateForm(f)}
                onSubmissions={() => navigate?.('inbox')}
                onEdit={() =>
                  toast.info('Editing fields', {
                    description: `${f.name} — changes go live when you save.`,
                  })
                }
                onSend={() =>
                  toast.success('Link sent to the customer contact', { description: f.customer })
                }
                onArchive={() => setStatus(f, f.status === 'Archived' ? 'Live' : 'Archived')}
                onDelete={() => deleteForm(f)}
              />
            ))}
            <CreateTile onClick={createForm} />
          </div>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------- one card */

function FormCard({
  form: f,
  onOpen,
  onDuplicate,
  onSubmissions,
  onEdit,
  onSend,
  onArchive,
  onDelete,
}) {
  const [copied, copy] = useCopy()
  const archived = f.status === 'Archived'

  return (
    <Card
      className={cx('flex flex-col p-3.5 transition-shadow hover:shadow-pop', archived && 'opacity-80')}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold text-ink-900">{f.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-500">
            <Building2 className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
            <span className="truncate">{f.customer}</span>
          </p>
        </div>
        <Badge tone={STATUS_TONE[f.status]} dot>
          {f.status}
        </Badge>
      </div>

      <p className="mt-1.5 truncate text-[11px] text-ink-400">Fills from {f.branch}</p>

      <dl className="nums mt-3 grid grid-cols-3 gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-2">
        <Stat label="Submissions" value={f.submissions} />
        <Stat label="Last" value={f.lastSubmission} />
        <Stat label="Avg lines" value={f.avgLines} help={AVG_LINES_HELP} />
      </dl>

      <div className="mt-3 flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white py-1 pr-1 pl-2.5">
        <Link2 className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] tracking-[-0.01em] text-ink-600">
          {f.url}
        </span>
        <Tooltip content={copied ? 'Copied' : 'Copy share link'} open={copied || undefined}>
          <IconButton
            size="sm"
            icon={copied ? Check : Copy}
            label={`Copy share link for ${f.name}`}
            onClick={() => copy(`https://${f.url}`)}
            className={copied ? 'text-emerald-600! hover:text-emerald-700!' : undefined}
          />
        </Tooltip>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-ink-200 pt-2.5">
        <Button size="sm" icon={ExternalLink} onClick={onOpen}>
          Open
        </Button>
        <Button size="sm" variant="ghost" icon={Files} onClick={onDuplicate}>
          Duplicate
        </Button>
        <div className="ml-auto">
          <Menu
            align="right"
            width="w-52"
            trigger={<IconButton size="sm" icon={MoreVertical} label={`Actions for ${f.name}`} />}
            items={[
              { label: 'Copy share link', icon: Link2, onClick: () => copy(`https://${f.url}`) },
              { label: `View submissions (${f.submissions})`, icon: Inbox, onClick: onSubmissions },
              { label: 'Edit fields', icon: Pencil, onClick: onEdit },
              { label: 'Send link to contact', icon: Send, onClick: onSend },
              '-',
              {
                label: archived ? 'Restore form' : 'Archive form',
                icon: Archive,
                onClick: onArchive,
              },
              { label: 'Delete', icon: Trash2, danger: true, onClick: onDelete },
            ]}
          />
        </div>
      </div>
    </Card>
  )
}

function Stat({ label, value, help }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] text-ink-500">
        <span className="truncate">{label}</span>
        {help && <HelpTip content={help} />}
      </dt>
      <dd className="truncate text-[13px] font-medium text-ink-900">{value}</dd>
    </div>
  )
}

function CreateTile({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[13.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-300 bg-white/60 px-5 py-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
    >
      <span className="mb-0.5 flex size-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-400 shadow-panel transition-colors group-hover:border-brand-200 group-hover:text-brand-600">
        <Plus className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[13px] font-medium text-ink-800">Create a form</span>
      <span className="max-w-[16rem] text-[12px] leading-[1.5] text-ink-500">
        Pick the customer, the branch that fills it, and the items they reorder. Takes about a
        minute.
      </span>
    </button>
  )
}
