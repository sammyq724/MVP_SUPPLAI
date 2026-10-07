import React from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, Tooltip, cx } from '../ui/primitives.jsx'
import { statusMeta } from './adapt.js'

/**
 * The queue's status pill, over the five real job statuses rather than the
 * mock's two. Separate from ui/primitives' StatusPill so the mock's New /
 * In Progress mapping is untouched.
 */
export default function LiveStatusPill({ status, className, forceTooltip }) {
  const meta = statusMeta(status)
  return (
    <Tooltip content={meta.help} open={forceTooltip || undefined} width="w-64">
      <Badge tone={meta.tone} dot={!meta.spinner} className={cx('cursor-default', className)}>
        {meta.spinner && <Loader2 className="size-3 shrink-0 animate-spin" strokeWidth={2.5} />}
        {meta.label}
      </Badge>
    </Tooltip>
  )
}
