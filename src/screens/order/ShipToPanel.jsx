import React, { useState } from 'react'
import {
  MapPin,
  MapPinPlus,
  Plus,
  Truck,
  Info,
  ChevronRight,
  Warehouse,
  Building2,
} from 'lucide-react'
import { Panel, Chip, Field, Select, TextInput, HelpTip, cx } from '../../ui/primitives.jsx'
import { shipTo, branches, shipViaOptions, deliveryDetail, HELP } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

/**
 * Screen 3 header, panel 2 — where the goods go, which branches price and pick
 * them, and the collapsed delivery block. Everything the driver and the
 * warehouse need lives behind the "Add delivery address and instructions"
 * toggle so the common case stays one screen tall.
 */

/* Options that are branch/carrier config in the real ERP, not order data. */
const COUNTRIES = ['United States', 'Canada', 'Mexico', 'Puerto Rico']
const CARRIERS = [
  'Meridian Fleet',
  'Old Dominion Freight Line',
  'Southeastern Freight Lines',
  'Averitt Express',
  'Customer pickup — will call',
]
const ROUTES = ['HOU-WEST-AM', 'HOU-WEST-PM', 'HOU-NORTH-AM', 'KTY-JOBSITE-AM', 'Unrouted — hold at dock']
const FREIGHT_CODES = [
  'PPD — Prepaid & allowed',
  'PPA — Prepaid & add',
  'COL — Collect',
  'TPB — Third party bill',
]

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

export default function ShipToPanel({ defaultDeliveryOpen = false }) {
  const toast = useToast()

  const [hasAddress, setHasAddress] = useState(true)
  const [hasPriceBranch, setHasPriceBranch] = useState(true)
  const [hasShipBranch, setHasShipBranch] = useState(true)
  const [shipVia, setShipVia] = useState('')
  const [open, setOpen] = useState(defaultDeliveryOpen)
  const [d, setD] = useState(deliveryDetail)

  const set = (key) => (e) => setD((prev) => ({ ...prev, [key]: e.target.value }))

  const branchMismatch =
    hasPriceBranch && hasShipBranch && branches.price !== branches.ship

  // Collapsed one-liner so the rep can tell a filled block from an empty one.
  const gate = d.complement ? d.complement.split('—')[0].trim() : ''
  const summary = [gate, d.carrier, d.route].filter(Boolean).join(' · ')

  return (
    <Panel
      title="Ship To"
      help="Where the goods physically land. Freight terms and the promised window follow from this block, not from the billing address."
    >
      {/* ------------------------------------------------------ destination */}
      {hasAddress ? (
        <>
          <Chip
            icon={MapPin}
            onRemove={() => {
              setHasAddress(false)
              toast?.warning('Ship-to address cleared', {
                description: shipTo.label,
                onUndo: () => setHasAddress(true),
              })
            }}
          >
            {shipTo.label}
          </Chip>
          <p className="mt-1.5 text-[11px] leading-4 whitespace-pre-line text-ink-500">
            {shipTo.address}
          </p>
        </>
      ) : (
        <div>
          <AddSlot label="Add ship-to address" onClick={() => setHasAddress(true)} />
          <p className="mt-1.5 text-[11px] leading-4 text-amber-600">
            No destination — the order cannot be routed.
          </p>
        </div>
      )}

      {/* ---------------------------------------------------------- branches */}
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Field label="Price Branch" help={HELP.priceBranch}>
          {hasPriceBranch ? (
            <Chip
              icon={Building2}
              onRemove={() => {
                setHasPriceBranch(false)
                toast?.warning('Price branch cleared', { onUndo: () => setHasPriceBranch(true) })
              }}
            >
              {branches.price}
            </Chip>
          ) : (
            <AddSlot label="Add branch" onClick={() => setHasPriceBranch(true)} />
          )}
        </Field>

        <Field label="Ship Branch" help={HELP.shipBranch}>
          {hasShipBranch ? (
            <Chip
              icon={Warehouse}
              onRemove={() => {
                setHasShipBranch(false)
                toast?.warning('Ship branch cleared', { onUndo: () => setHasShipBranch(true) })
              }}
            >
              {branches.ship}
            </Chip>
          ) : (
            <AddSlot label="Add branch" onClick={() => setHasShipBranch(true)} />
          )}
        </Field>
      </div>

      {branchMismatch && (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-4 text-amber-600">
          <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          Shipping from a different branch than pricing.
        </p>
      )}

      {/* ---------------------------------------------------------- ship via */}
      <div className="mt-2.5">
        <Field label="Ship Via" help={HELP.shipVia}>
          <Select
            icon={Truck}
            value={shipVia}
            onChange={(e) => setShipVia(e.target.value)}
            aria-label="Ship Via"
            className={cx(!shipVia && 'text-ink-400')}
          >
            <option value="">Enter a Ship Via</option>
            {shipViaOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* -------------------------------------------------- delivery details */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-2.5 flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left text-[12px] font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        <MapPinPlus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>Add delivery address and instructions</span>
        <ChevronRight
          className={cx('ml-auto size-3.5 shrink-0 transition-transform', open && 'rotate-90')}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>

      {!open && summary && (
        <p className="truncate px-1 text-[11px] text-ink-400" title={summary}>
          {summary}
        </p>
      )}

      {open && (
        <div className="animate-in-fade mt-2.5 grid grid-cols-1 gap-x-3 gap-y-2.5 border-t border-ink-200 pt-3 lg:grid-cols-2">
          {/* left — the address the driver navigates to */}
          <div className="space-y-2.5">
            <Field label="Street address">
              <TextInput
                value={d.street}
                onChange={set('street')}
                placeholder="1290 Riverbend Loop"
                aria-label="Street address"
              />
            </Field>
            <Field label="Address complement" hint="Gate, dock, building or suite.">
              <TextInput
                value={d.complement}
                onChange={set('complement')}
                placeholder="Gate, dock or suite"
                aria-label="Address complement"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="City">
                <TextInput value={d.city} onChange={set('city')} aria-label="City" />
              </Field>
              <Field label="State">
                <TextInput value={d.state} onChange={set('state')} maxLength={2} aria-label="State" />
              </Field>
            </div>
            <Field label="Country">
              <Select value={d.country} onChange={set('country')} aria-label="Country">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Postal code">
              <TextInput
                value={d.postal}
                onChange={set('postal')}
                className="nums"
                inputMode="numeric"
                aria-label="Postal code"
              />
            </Field>
          </div>

          {/* right — what the warehouse and the driver need to know */}
          <div className="space-y-2.5">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-1">
                <label
                  htmlFor="delivery-instructions"
                  className="text-[11px] font-medium tracking-[0.01em] text-ink-500"
                >
                  Delivery Instructions
                </label>
                <HelpTip content="Prints on the packing slip and is sent to the driver's tablet with the stop. Keep it to site access, hours and check-in." />
              </div>
              <textarea
                id="delivery-instructions"
                rows={4}
                value={d.instructions}
                onChange={set('instructions')}
                placeholder="Gate code, check-in, receiving hours…"
                className="w-full resize-y rounded-lg border border-ink-300 bg-white px-2.5 py-1.5 text-[13px] leading-[1.45] text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            <Field label="Shipping Carrier">
              <Select
                value={d.carrier}
                onChange={set('carrier')}
                aria-label="Shipping Carrier"
                className={cx(!d.carrier && 'text-ink-400')}
              >
                <option value="">Select a carrier</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Tracking Code"
              hint={d.carrier ? undefined : 'Pick a carrier first.'}
            >
              <TextInput
                value={d.tracking}
                onChange={set('tracking')}
                disabled={!d.carrier}
                placeholder="Added when the truck is loaded"
                aria-label="Tracking Code"
                className={cx(
                  'nums',
                  !d.carrier && 'cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400',
                )}
              />
            </Field>

            <Field label="Shipping Route" help="Truck run the stop is dropped on. Drives the cutoff time for same-day loading.">
              <Select value={d.route} onChange={set('route')} aria-label="Shipping Route">
                {ROUTES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Freight Code" help="Who pays the freight and whether it is billed on this invoice.">
              <Select value={d.freight} onChange={set('freight')} aria-label="Freight Code">
                {FREIGHT_CODES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}
    </Panel>
  )
}
