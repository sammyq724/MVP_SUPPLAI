import React, { useState, useMemo, useCallback } from 'react'
import TopBar from './order/TopBar.jsx'
import SourcePane from './order/SourcePane.jsx'
import QuoteToPanel from './order/QuoteToPanel.jsx'
import ShipToPanel from './order/ShipToPanel.jsx'
import OrderMetaPanel from './order/OrderMetaPanel.jsx'
import ProductsSection from './order/ProductsSection.jsx'
import SummaryBar from './order/SummaryBar.jsx'
import { lineItems, moreCandidates, order } from '../data/order.js'
import { useToast } from '../ui/toast.jsx'

/**
 * Screen 3 — the core request/order detail. Two panes: the source document on
 * the left, the order builder on the right. All shared line-item state lives
 * here so the products list and the sticky summary stay in lockstep.
 */
export default function OrderDetail({ params, navigate }) {
  const toast = useToast()
  const resolvedMode = params.state === 'resolved'

  const [selections, setSelections] = useState(() => {
    const base = Object.fromEntries(lineItems.map((li) => [li.id, li.selected]))
    if (resolvedMode) {
      // The "everything matched" state: take each outstanding line's top candidate.
      for (const li of lineItems) if (!base[li.id]) base[li.id] = li.candidates[0].id
    }
    return base
  })
  const [qtys, setQtys] = useState(() =>
    Object.fromEntries(
      lineItems.flatMap((li) => li.candidates.map((c) => [`${li.id}:${c.id}`, c.qty])),
    ),
  )
  const [expanded, setExpanded] = useState(() => new Set(params.more ? [params.more] : []))
  const [checked, setChecked] = useState(() => new Set())
  const [openOnly, setOpenOnly] = useState(false)
  const [recording, setRecording] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightOutstanding, setHighlightOutstanding] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(params.delivery === '1')

  const candidatesFor = useCallback(
    (li) =>
      expanded.has(li.id) ? [...li.candidates, ...(moreCandidates[li.id] ?? [])] : li.candidates,
    [expanded],
  )

  const select = useCallback(
    (lineId, candId) => {
      const prev = selections[lineId]
      setSelections((s) => ({ ...s, [lineId]: candId }))
      toast.success('Item updated', {
        onUndo: () => setSelections((s) => ({ ...s, [lineId]: prev })),
      })
    },
    [selections, toast],
  )

  const setQty = useCallback((lineId, candId, v) => {
    setQtys((q) => ({ ...q, [`${lineId}:${candId}`]: v }))
  }, [])

  const toggleMore = useCallback((lineId) => {
    setExpanded((s) => {
      const next = new Set(s)
      next.has(lineId) ? next.delete(lineId) : next.add(lineId)
      return next
    })
  }, [])

  const visibleItems = useMemo(() => {
    let items = lineItems
    if (openOnly || highlightOutstanding) items = items.filter((li) => !selections[li.id])
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (li) =>
          li.requested.toLowerCase().includes(q) ||
          li.candidates.some(
            (c) =>
              c.sku.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
          ),
      )
    }
    return items
  }, [openOnly, highlightOutstanding, search, selections])

  const outstanding = lineItems.filter((li) => !selections[li.id])
  const total = useMemo(
    () =>
      lineItems.reduce((sum, li) => {
        const id = selections[li.id]
        if (!id) return sum
        const cand = [...li.candidates, ...(moreCandidates[li.id] ?? [])].find((c) => c.id === id)
        if (!cand) return sum
        return sum + cand.unitPrice * (qtys[`${li.id}:${cand.id}`] ?? cand.qty)
      }, 0),
    [selections, qtys],
  )

  return (
    <>
      <TopBar
        subject={order.subject}
        date={order.date}
        status={outstanding.length ? 'In Progress' : 'New'}
        index={order.positionIndex}
        total={order.positionTotal}
        navigate={navigate}
      />

      <div className="flex min-h-0 flex-1">
        <SourcePane initialTab={params.tab === 'document' ? 'document' : 'email'} />

        <section className="relative flex min-w-0 flex-1 flex-col bg-ink-100">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-40">
            <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
              <QuoteToPanel />
              {/* Ship To takes the full row while the delivery form is open — a
                  two-column address form is unreadable in a one-third column. */}
              <div className={deliveryOpen ? 'xl:order-last xl:col-span-3' : undefined}>
                <ShipToPanel
                  defaultDeliveryOpen={params.delivery === '1'}
                  onDeliveryToggle={setDeliveryOpen}
                />
              </div>
              <div className={deliveryOpen ? 'xl:col-span-2' : undefined}>
                <OrderMetaPanel />
              </div>
            </div>

            <ProductsSection
              items={visibleItems}
              allCount={lineItems.length}
              selections={selections}
              onSelect={select}
              qtys={qtys}
              onQty={setQty}
              expanded={expanded}
              onToggleMore={toggleMore}
              candidatesFor={candidatesFor}
              checked={checked}
              onCheck={setChecked}
              openOnly={openOnly}
              onOpenOnly={setOpenOnly}
              recording={recording}
              onRecording={setRecording}
              search={search}
              onSearch={setSearch}
              filtered={openOnly || highlightOutstanding || !!search.trim()}
              onClearFilter={() => {
                setOpenOnly(false)
                setHighlightOutstanding(false)
                setSearch('')
              }}
            />
          </div>

          <SummaryBar
            total={total}
            outstanding={outstanding.length}
            defaultMenuOpen={params.menu === 'create'}
            onShowOutstanding={() => setHighlightOutstanding(true)}
          />
        </section>
      </div>
    </>
  )
}
