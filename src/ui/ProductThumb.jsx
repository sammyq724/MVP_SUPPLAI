import React from 'react'
import { cx } from './primitives.jsx'

/**
 * Catalog thumbnails. Real deployments swap these for photography; drawn as
 * SVG here so the mockups stay self-contained and crisp at any zoom.
 */
const SHAPES = {
  conduit: (
    <>
      <rect x="4" y="16" width="40" height="16" rx="8" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <rect x="4" y="16" width="9" height="16" rx="4" className="fill-ink-300 stroke-ink-400" strokeWidth="1.5" />
      <path d="M20 16v16M28 16v16M36 16v16" className="stroke-ink-300" strokeWidth="1.25" />
    </>
  ),
  coupling: (
    <>
      <rect x="8" y="18" width="32" height="12" rx="3" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <rect x="17" y="14" width="14" height="20" rx="2" className="fill-ink-300 stroke-ink-400" strokeWidth="1.5" />
      <path d="M12 18v12M36 18v12" className="stroke-ink-400" strokeWidth="1.25" />
    </>
  ),
  wire: (
    <>
      <circle cx="24" cy="24" r="15" className="fill-ink-100 stroke-ink-400" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="6" className="fill-white stroke-ink-400" strokeWidth="1.5" />
      <path d="M24 9a15 15 0 0 1 13 7.5" className="stroke-ink-500" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M11 31.5A15 15 0 0 0 24 39" className="stroke-ink-500" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  box: (
    <>
      <rect x="9" y="9" width="30" height="30" rx="2.5" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <rect x="15" y="15" width="18" height="18" rx="1.5" className="fill-white stroke-ink-300" strokeWidth="1.25" />
      <circle cx="12.5" cy="12.5" r="1.5" className="fill-ink-400" />
      <circle cx="35.5" cy="35.5" r="1.5" className="fill-ink-400" />
    </>
  ),
  strut: (
    <>
      <path d="M6 18h36v12H6z" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <path d="M6 18v12M42 18v12" className="stroke-ink-400" strokeWidth="1.5" />
      <rect x="11" y="21" width="6" height="6" rx="1" className="fill-white stroke-ink-300" strokeWidth="1.25" />
      <rect x="21" y="21" width="6" height="6" rx="1" className="fill-white stroke-ink-300" strokeWidth="1.25" />
      <rect x="31" y="21" width="6" height="6" rx="1" className="fill-white stroke-ink-300" strokeWidth="1.25" />
    </>
  ),
  clamp: (
    <>
      <path
        d="M16 30a8 8 0 1 1 16 0"
        className="fill-none stroke-ink-400"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="10" y="30" width="28" height="6" rx="2" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <circle cx="14.5" cy="33" r="1.5" className="fill-ink-400" />
      <circle cx="33.5" cy="33" r="1.5" className="fill-ink-400" />
    </>
  ),
  elbow: (
    <>
      <path
        d="M12 36V24a12 12 0 0 1 12-12h12"
        className="fill-none stroke-ink-400"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M12 36V24a12 12 0 0 1 12-12h12"
        className="fill-none stroke-ink-200"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </>
  ),
  connector: (
    <>
      <rect x="6" y="20" width="18" height="8" rx="2" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <rect x="24" y="16" width="8" height="16" rx="1.5" className="fill-ink-300 stroke-ink-400" strokeWidth="1.5" />
      <rect x="32" y="21" width="10" height="6" rx="2" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
    </>
  ),
  breaker: (
    <>
      <rect x="13" y="8" width="22" height="32" rx="3" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <rect x="19" y="18" width="10" height="12" rx="2" className="fill-white stroke-ink-400" strokeWidth="1.5" />
      <path d="M24 12v4" className="stroke-ink-400" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  fitting: (
    <>
      <circle cx="24" cy="24" r="13" className="fill-ink-200 stroke-ink-400" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="6" className="fill-white stroke-ink-400" strokeWidth="1.5" />
      <path d="M24 11v-4M24 41v-4M11 24h-4M41 24h4" className="stroke-ink-400" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
}

export function ProductThumb({ shape = 'conduit', size = 'md', className }) {
  const box = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-8' : 'size-10'
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50',
        box,
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-[80%]" aria-hidden="true">
        {SHAPES[shape] ?? SHAPES.fitting}
      </svg>
    </div>
  )
}
