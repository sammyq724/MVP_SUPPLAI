import React, { useEffect, useState } from 'react'

/**
 * The provenance connector — a line drawn across the two panes from the
 * customer's own words to the item matched against them.
 *
 * Rendered as one fixed, click-through SVG over the whole app rather than
 * inside either pane, because the two ends live in separately scrolling
 * containers and a line clipped by either one would be useless. Endpoints are
 * measured from the DOM (`[data-source-line]` → `[data-line-block]`) and
 * re-measured whenever anything scrolls or resizes.
 */

const ELBOW = 18 // straight run out of each endpoint before the diagonal
const GUTTER = 6 // keeps an endpoint from touching the edge of its pane

function measure(lineId) {
  const source = document.querySelector(`[data-source-line="${lineId}"]`)
  const target = document.querySelector(`[data-line-block="${lineId}"]`)
  if (!source || !target) return null

  const sourcePane = document.querySelector('[data-scroll="source"]')
  const builderPane = document.querySelector('[data-scroll="builder"]')
  const a = source.getBoundingClientRect()
  const b = target.getBoundingClientRect()

  // Either end scrolled out of its own pane means there is nothing honest to
  // point at — drop the line and leave the two highlights to carry the link.
  const within = (rect, pane) => {
    if (!pane) return true
    const p = pane.getBoundingClientRect()
    const y = rect.top + rect.height / 2
    return y > p.top + GUTTER && y < p.bottom - GUTTER
  }
  if (!within(a, sourcePane) || !within(b, builderPane)) return null

  const x1 = a.right + 2
  const y1 = a.top + a.height / 2
  const x2 = b.left - 2
  // Aim at the card's header row, where the requested text sits, not its middle.
  const y2 = b.top + Math.min(26, b.height / 2)
  if (x2 - x1 < ELBOW * 2) return null

  return { x1, y1, x2, y2 }
}

export default function TraceConnector({ lineId }) {
  const [geom, setGeom] = useState(null)

  useEffect(() => {
    if (!lineId) {
      setGeom(null)
      return
    }
    let raf = 0
    const run = () => setGeom(measure(lineId))
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(run)
    }
    schedule()
    // Capture phase so scrolling either inner pane is caught, not just the window.
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    }
  }, [lineId])

  if (!geom) return null
  const { x1, y1, x2, y2 } = geom

  return (
    <svg
      aria-hidden="true"
      className="animate-in-fade pointer-events-none fixed inset-0 z-50 h-full w-full"
    >
      <path
        d={`M ${x1} ${y1} H ${x1 + ELBOW} L ${x2 - ELBOW} ${y2} H ${x2}`}
        fill="none"
        stroke="var(--color-brand-600)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx={x1} cy={y1} r="3" fill="var(--color-brand-600)" />
      <circle cx={x2} cy={y2} r="3" fill="var(--color-brand-600)" />
    </svg>
  )
}
