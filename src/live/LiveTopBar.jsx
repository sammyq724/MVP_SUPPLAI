import React from 'react'
import { ArrowLeft, ChevronRight, Flag, PencilLine, Trash2 } from 'lucide-react'
import { Badge, IconButton, Tooltip, cx } from '../ui/primitives.jsx'
import LiveStatusPill from './LiveStatusPill.jsx'

/**
 * Detail header in live mode. Deliberately not the mock TopBar: there is no
 * queue position to walk (the list is polled and reorders itself), and Print /
 * Duplicate / Archive are mock actions. What belongs here instead are the two
 * real per-email controls — Sam's blue flag and Delete.
 *
 * The flag is purely a "come back to this one" marker: it changes nothing about
 * the prediction and writes nothing to review_queue2.csv, which is why it is
 * offered in every status, submitted included. Distinct from the red X on a
 * prediction ROW, which means "this line is wrong" and does travel to the
 * review queue.
 */
export default function LiveTopBar({ job, inProgress = false, onBack, onFlag, onDelete }) {
  const canDelete = job.status !== 'submitted'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4">
      <IconButton icon={ArrowLeft} label="Back to inbox" onClick={onBack} />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-[13px] font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
        >
          Inbox
        </button>
        <ChevronRight className="size-3.5 shrink-0 text-ink-300" strokeWidth={2} aria-hidden="true" />
        <h1 className="min-w-0 truncate text-[13px] font-medium text-ink-900" title={job.subject}>
          {job.subject || '(no subject)'}
        </h1>
      </nav>

      {/* Wraps rather than sitting on one line: four tags beside a truncating
          breadcrumb used to collide at narrow widths. */}
      <div className="flex min-w-0 shrink flex-wrap items-center gap-1.5">
        <LiveStatusPill status={job.status} />
        {inProgress && (
          <Badge tone="amber" icon={PencilLine}>
            In progress
          </Badge>
        )}
        {job.overturned && <Badge tone="violet">gate overturned</Badge>}
        {/* Both sides of a split carry the tag: the child because it IS one,
            the parent because lines of it now live somewhere else. */}
        {(job.split_label || job.split_off_rows?.length > 0) && (
          <Badge tone="blue">Split Quote</Badge>
        )}
        {job.split_off_rows?.length > 0 && (
          <span className="text-[11px] whitespace-nowrap text-ink-400">
            {job.split_off_rows.length} line{job.split_off_rows.length === 1 ? '' : 's'} split off into{' '}
            {job.split_children?.length || 0} other entr
            {(job.split_children?.length || 0) === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Tooltip content={job.flagged ? 'Remove the blue flag' : 'Flag this email'}>
          <button
            type="button"
            aria-pressed={!!job.flagged}
            aria-label={job.flagged ? 'Remove the blue flag' : 'Flag this email'}
            onClick={() => onFlag(!job.flagged)}
            className={cx(
              'inline-flex size-8 items-center justify-center rounded-lg border transition-colors',
              job.flagged
                ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
                : 'border-ink-300 bg-white text-ink-400 hover:border-brand-400 hover:text-brand-600',
            )}
          >
            <Flag className="size-3.5" strokeWidth={2} fill={job.flagged ? 'currentColor' : 'none'} />
          </button>
        </Tooltip>

        {canDelete && (
          <Tooltip content="Delete this email">
            <button
              type="button"
              aria-label="Delete this email"
              onClick={onDelete}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-300 bg-white text-ink-400 transition-colors hover:border-red-400 hover:text-red-600"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
