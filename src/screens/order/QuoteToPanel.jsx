import React, { useEffect, useState } from 'react'
import { Building2, User, Plus, Mail, Phone, AlertTriangle } from 'lucide-react'
import { Panel, Chip, Badge, Field, TextInput, HelpTip } from '../../ui/primitives.jsx'
import { customer, contact, HELP } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * Screen 3 header, panel 1 — who the quote is priced and billed to.
 *
 * MOCK: both slots are resolved chips; clearing one collapses the block to a
 * dashed "add" affordance so an incomplete header is impossible to miss.
 *
 * LIVE: plain editable fields, prefilled with the little the backend actually
 * knows. `createJob()` never records a customer id — only a gate skip and a
 * submitted job carry one — so on an ordinary predicted email the sender
 * address is the whole of the customer identity we have, and Customer # starts
 * empty. It is one of only two required fields on the page precisely because
 * nothing else can supply it. Everything else here is editable, optional, and
 * is not sent anywhere yet.
 */

/** Dashed placeholder shown wherever a required chip has been cleared. */
function AddSlot({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-ink-300 px-2.5 text-[12px] text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600"
    >
      <Plus className="size-3.5 shrink-0" strokeWidth={2.25} />
      {label}
    </button>
  )
}

function BlockLabel({ children, help }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <span className="text-[11px] font-medium tracking-[0.01em] text-ink-500">{children}</span>
      {help && <HelpTip content={help} />}
    </div>
  )
}

const PANEL_HELP =
  'The account this quote is priced and billed to. Pulled from the sender domain, then confirmed against the ERP account list.'

const CUSTOMER_NO_HELP =
  'The ERP account number. Required: it stamps every review-queue row, and a quote is indexed by it so a purchase order arriving weeks later can be matched back to this.'

/* ------------------------------------------------------------------- live */

function LiveQuoteTo({
  customerId,
  onCustomerId,
  customerName,
  contactName,
  contactEmail,
  showRequired,
  readOnly,
}) {
  const [name, setName] = useState(customerName || '')
  const [billing, setBilling] = useState('')
  const [who, setWho] = useState(contactName || '')
  const [email, setEmail] = useState(contactEmail || '')
  const [phone, setPhone] = useState('')

  // A poll can fill these in after the first render, but must never overwrite
  // what the rep has typed — hence the `v || …` rather than a plain set.
  useEffect(() => { setName((v) => v || customerName || '') }, [customerName])
  useEffect(() => { setWho((v) => v || contactName || '') }, [contactName])
  useEffect(() => { setEmail((v) => v || contactEmail || '') }, [contactEmail])

  const area =
    'w-full resize-y rounded-lg border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] leading-[1.45] text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none read-only:cursor-default read-only:border-ink-200 read-only:bg-ink-50 read-only:text-ink-500'

  return (
    <Panel title="Quote To" help={PANEL_HELP}>
      <div className="space-y-2.5">
        <Field label="Customer #" required help={CUSTOMER_NO_HELP}>
          <TextInput
            value={customerId}
            onChange={(e) => onCustomerId(e.target.value)}
            placeholder="e.g. 10253"
            aria-label="Customer number"
            className="nums"
            invalid={showRequired}
            readOnly={readOnly}
          />
          {showRequired && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
              <AlertTriangle className="size-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              Required
            </p>
          )}
        </Field>

        <Field label="Customer name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Not on file"
            aria-label="Customer name"
            readOnly={readOnly}
          />
        </Field>

        <Field label="Billing address">
          <textarea
            rows={2}
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
            readOnly={readOnly}
            placeholder="Street, city, state, ZIP"
            aria-label="Billing address"
            className={area}
          />
        </Field>
      </div>

      <div className="mt-2.5 space-y-2.5 border-t border-ink-200 pt-2.5">
        <Field label="Contact" help={HELP.contact}>
          <TextInput
            icon={User}
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Who sent this"
            aria-label="Contact name"
            readOnly={readOnly}
          />
        </Field>
        <Field label="Email">
          <TextInput
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Sender address"
            aria-label="Contact email"
            readOnly={readOnly}
          />
        </Field>
        <Field label="Phone">
          <TextInput
            icon={Phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Not on file"
            aria-label="Contact phone"
            className="nums"
            readOnly={readOnly}
          />
        </Field>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------- mock */

export default function QuoteToPanel(props) {
  return props.live ? <LiveQuoteTo {...props} /> : <MockQuoteTo />
}

function MockQuoteTo() {
  const toast = useToast()
  const [hasCustomer, setHasCustomer] = useState(true)
  const [hasContact, setHasContact] = useState(true)

  const clear = (what, restore) => {
    if (what === 'customer') setHasCustomer(false)
    else setHasContact(false)
    toast?.warning(what === 'customer' ? 'Customer cleared' : 'Contact cleared', {
      description: 'The quote cannot be sent until it is set again',
      onUndo: restore,
    })
  }

  return (
    <Panel title="Quote To" help={PANEL_HELP}>
      {/* -------------------------------------------------------- customer */}
      <div>
        <BlockLabel>Customer</BlockLabel>
        {hasCustomer ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip icon={Building2} onRemove={() => clear('customer', () => setHasCustomer(true))}>
                {customer.name}
              </Chip>
              <Badge tone="slate" className="nums">
                {customer.account}
              </Badge>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 whitespace-pre-line text-ink-500">
              {customer.address}
            </p>
          </>
        ) : (
          <div>
            <AddSlot label="Add customer" onClick={() => setHasCustomer(true)} />
            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-4 text-amber-600">
              <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              No account — pricing falls back to list.
            </p>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- contact */}
      <div className="mt-2.5 border-t border-ink-200 pt-2.5">
        <BlockLabel help={HELP.contact}>Contact</BlockLabel>
        {hasContact ? (
          <>
            <Chip icon={User} onRemove={() => clear('contact', () => setHasContact(true))}>
              {contact.name}
            </Chip>
            <div className="mt-1.5 space-y-0.5 text-[11px] leading-4 text-ink-500">
              <p className="flex items-center gap-1.5">
                <Mail className="size-3 shrink-0 text-ink-400" strokeWidth={2} aria-hidden="true" />
                <a
                  href={`mailto:${contact.email}`}
                  className="truncate text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
                >
                  {contact.email}
                </a>
              </p>
              <p className="nums flex items-center gap-1.5">
                <Phone className="size-3 shrink-0 text-ink-400" strokeWidth={2} aria-hidden="true" />
                {contact.phone}
              </p>
            </div>
          </>
        ) : (
          <div>
            <AddSlot label="Add contact" onClick={() => setHasContact(true)} />
            <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-4 text-amber-600">
              <AlertTriangle className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
              Nobody to send the quote to.
            </p>
          </div>
        )}
      </div>
    </Panel>
  )
}
