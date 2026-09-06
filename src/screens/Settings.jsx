import React, { useState, useCallback } from 'react'
import {
  Building2,
  Check,
  Copy,
  History,
  LogIn,
  Mail,
  Plus,
  Puzzle,
  Sparkles,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  HelpTip,
  Panel,
  TextInput,
  Toggle,
  cx,
  useCopy,
} from '../ui/primitives.jsx'
import { useToast } from '../ui/toast.jsx'
import { INBOUND_EMAIL } from '../data/queue.js'

/* ------------------------------------------------------------------ local data */

const SECTIONS = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'email', label: 'Inbox & Email', icon: Mail },
  { key: 'branches', label: 'Branches', icon: Building2 },
  { key: 'matching', label: 'Matching', icon: Sparkles },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Puzzle },
]

/** Sections handled by an admin in the ERP rather than here. */
const ADMIN_SECTIONS = {
  account: {
    title: 'Account details come from the directory',
    body: 'Your name, title and reply-to address are synced from Meridian Supply’s directory every night. Ask an admin to change them and the update lands here the next morning.',
    action: 'Open directory',
  },
  branches: {
    title: '9 branches synced from Epicor Eclipse',
    body: 'Branch list, price lists, cut-off times and will-call hours are read-only here. Last sync: Sep 6, 2026 at 5:15 AM — 9 branches, 0 conflicts.',
    action: 'Run sync now',
  },
  matching: {
    title: 'Matching rules affect every rep',
    body: 'Confidence thresholds, substitution rules and house-brand swaps are shared across the account. Admins can edit them; reps can always override a match on the order itself.',
    action: 'Request access',
  },
  team: {
    title: '12 reps, 3 admins on this account',
    body: 'Seats, roles and account-owner assignments are managed by your admin. Removing a rep reassigns their open requests to the branch queue.',
    action: 'Invite a rep',
  },
  integrations: {
    title: 'Epicor Eclipse connected',
    body: 'Orders, customers and live stock come from Eclipse. Additional connectors — Vertex tax, Descartes freight rating — are added from the admin console.',
    action: 'Open admin console',
  },
}

const INBOUND_HELP =
  'Everything sent to this address is parsed into the Sales queue. It is unique to your account — do not hand it out as a public contact address.'

const ROUND_UP_HELP =
  'A customer asking for 380 ft of 1-1/2" PVC gets 400 ft — conduit sells in 10 ft sticks. The original request stays on the line so you can see what changed.'

/* --------------------------------------------------------------------- screen */

export default function Settings({ params, navigate }) {
  const toast = useToast()
  const [section, setSection] = useState('email')

  const [copied, copy] = useCopy()
  const [autoReply, setAutoReply] = useState(true)
  const [outlook, setOutlook] = useState(true)
  const [gmail, setGmail] = useState(false)
  const [autoAssign, setAutoAssign] = useState(false)
  const [splitBranches, setSplitBranches] = useState(false)
  const [roundUp, setRoundUp] = useState(true)

  const disconnectAll = useCallback(() => {
    const prev = { outlook, gmail }
    setOutlook(false)
    setGmail(false)
    toast.warning('All inboxes disconnected', {
      description: 'Nothing new will be parsed until you reconnect.',
      onUndo: () => {
        setOutlook(prev.outlook)
        setGmail(prev.gmail)
      },
    })
  }, [gmail, outlook, toast])

  const note = ADMIN_SECTIONS[section]

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-ink-200 bg-white px-5">
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-ink-900">Settings</h1>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-[12px] text-ink-500">Changes save as you make them</span>
          <Button
            icon={History}
            onClick={() =>
              toast.info('Audit log', { description: 'Last change: parsing rules, 3 days ago.' })
            }
          >
            Audit log
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-start gap-5">
          {/* ------------------------------------------------- section nav */}
          <nav aria-label="Settings sections" className="w-48 shrink-0">
            <div className="sticky top-0 flex flex-col gap-0.5">
              {SECTIONS.map((s) => {
                const active = section === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSection(s.key)}
                    aria-current={active ? 'true' : undefined}
                    className={cx(
                      'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                    )}
                  >
                    <s.icon
                      className={cx('size-4 shrink-0', active ? 'text-brand-600' : 'text-ink-400')}
                      strokeWidth={2}
                    />
                    <span className="truncate">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* ----------------------------------------------------- content */}
          <div className="min-w-0 max-w-3xl flex-1 space-y-3">
            {note ? (
              <Card className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                  {React.createElement(SECTIONS.find((s) => s.key === section).icon, {
                    className: 'size-4',
                    strokeWidth: 2,
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[13px] font-semibold text-ink-900">{note.title}</h2>
                  <p className="mt-1 text-[12px] leading-[1.5] text-ink-500">{note.body}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => toast.info(note.action, { description: note.title })}
                >
                  {note.action}
                </Button>
              </Card>
            ) : (
              <>
                {/* -------------------------------------- inbound address */}
                <Panel title="Inbound address" help={INBOUND_HELP}>
                  <div className="flex items-center gap-2">
                    <TextInput
                      readOnly
                      value={INBOUND_EMAIL}
                      aria-label="Inbound email address"
                      className="font-mono tracking-[-0.01em]"
                    />
                    <Button icon={copied ? Check : Copy} onClick={() => copy(INBOUND_EMAIL)}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="mt-2 text-[12px] leading-[1.5] text-ink-500">
                    Point a forwarding rule at this address from the mailbox customers already
                    write to, or put it on your quote footer. Attachments are parsed too — PDFs,
                    spreadsheets and photos of a takeoff.
                  </p>
                  <div className="mt-2.5 border-t border-ink-200 pt-2.5">
                    <Checkbox
                      checked={autoReply}
                      onChange={setAutoReply}
                      label="Send an auto-reply confirming we received the request"
                    />
                    <p className="mt-1 pl-6 text-[11px] text-ink-400">
                      Goes out within a minute of parsing and names the rep who owns the account.
                    </p>
                  </div>
                </Panel>

                {/* ------------------------------------- connected inboxes */}
                <Panel
                  title="Connected inboxes"
                  /* `!` so it beats Panel's own p-3 — Tailwind resolves the
                     conflict by stylesheet order, where p-3 comes last. */
                  bodyClass="p-0!"
                  action={
                    <Button
                      size="xs"
                      variant="link"
                      icon={Plus}
                      onClick={() =>
                        toast.info('Add an inbox', {
                          description: 'Outlook, Gmail or IMAP.',
                        })
                      }
                    >
                      Add inbox
                    </Button>
                  }
                >
                  <InboxRow
                    name="Outlook — Microsoft 365"
                    account="orders@meridiansupply.com"
                    connected={outlook}
                    meta={
                      outlook
                        ? 'Last synced 2 minutes ago · 1,284 messages parsed'
                        : 'Reconnect to resume parsing — nothing is lost while it is off.'
                    }
                    onConnect={() => {
                      setOutlook(true)
                      toast.success('Outlook reconnected', {
                        description: 'orders@meridiansupply.com',
                      })
                    }}
                    onDisconnect={() => {
                      setOutlook(false)
                      toast.warning('Outlook disconnected', {
                        description: 'New mail will stop landing in the queue.',
                        onUndo: () => setOutlook(true),
                      })
                    }}
                  />
                  <InboxRow
                    name="Gmail — Google Workspace"
                    account="quotes@meridiansupply.com"
                    connected={gmail}
                    meta={
                      gmail
                        ? 'Last synced just now'
                        : 'A Workspace admin approves access once'
                    }
                    onConnect={() => {
                      setGmail(true)
                      toast.success('Gmail connected', {
                        description: 'quotes@meridiansupply.com',
                      })
                    }}
                    onDisconnect={() => {
                      setGmail(false)
                      toast.warning('Gmail disconnected', { onUndo: () => setGmail(true) })
                    }}
                  />
                </Panel>

                {/* ---------------------------------------- parsing rules */}
                <Panel title="Parsing rules" bodyClass="p-0!">
                  <RuleRow
                    title="Auto-assign to the account owner"
                    description="New requests go straight to the rep who owns the customer instead of sitting unassigned in the queue."
                    checked={autoAssign}
                    onChange={setAutoAssign}
                  />
                  <RuleRow
                    title="Split multi-branch requests automatically"
                    description="When lines have to ship from two yards, create one quote per branch instead of a single mixed quote."
                    checked={splitBranches}
                    onChange={setSplitBranches}
                  />
                  <RuleRow
                    title="Round quantities up to sellable multiples"
                    help={ROUND_UP_HELP}
                    description="Applies to conduit, wire reels and anything else sold by the stick, spool or carton."
                    checked={roundUp}
                    onChange={setRoundUp}
                  />
                </Panel>

                {/* ------------------------------------------- danger zone */}
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5 shadow-panel">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 ring-1 ring-red-200 ring-inset">
                      <TriangleAlert className="size-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[11px] font-semibold tracking-[0.04em] text-red-700 uppercase">
                        Danger zone
                      </h2>
                      <p className="mt-1 text-[13px] font-medium text-ink-900">
                        Disconnect all inboxes
                      </p>
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-600">
                        Parsing stops immediately for the whole account. Requests already in the
                        queue stay put; anything sent after that sits unread in the source mailbox.
                        Reconnecting Outlook needs a Microsoft admin approval again.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!outlook && !gmail}
                      onClick={disconnectAll}
                    >
                      Disconnect all inboxes
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------- pieces */

function InboxRow({ name, account, meta, connected, onConnect, onDisconnect }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-200 px-3 py-3 last:border-b-0">
      <span
        className={cx(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border',
          connected ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-ink-200 bg-ink-50 text-ink-400',
        )}
      >
        <Mail className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink-900">{name}</span>
          {connected ? (
            <Badge tone="green" dot>
              Connected
            </Badge>
          ) : (
            <Badge tone="slate">Not connected</Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-ink-500">
          <span className="font-mono tracking-[-0.01em]">{account}</span>
          <span className="mx-1.5 text-ink-300">·</span>
          {meta}
        </p>
      </div>
      {connected ? (
        <Button size="sm" variant="ghost" onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button size="sm" variant="primary" icon={LogIn} onClick={onConnect}>
          Log in
        </Button>
      )}
    </div>
  )
}

function RuleRow({ title, description, help, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 border-b border-ink-200 px-3 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink-900">{title}</span>
          {help && <HelpTip content={help} />}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-500">{description}</p>
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        className="mt-1 shrink-0"
        label={<span className="sr-only">{title}</span>}
      />
    </div>
  )
}
