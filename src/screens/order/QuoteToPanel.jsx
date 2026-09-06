import React, { useState } from 'react'
import { Building2, User, Plus, Mail, Phone, AlertTriangle } from 'lucide-react'
import { Panel, Chip, Badge, HelpTip } from '../../ui/primitives.jsx'
import { customer, contact, HELP } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * Screen 3 header, panel 1 — who the quote is priced and billed to.
 * Both slots are resolved chips by default; clearing one collapses the block to
 * a dashed "add" affordance so an incomplete header is impossible to miss.
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

export default function QuoteToPanel() {
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
    <Panel
      title="Quote To"
      help="The account this quote is priced and billed to. Pulled from the sender domain, then confirmed against the ERP account list."
    >
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
