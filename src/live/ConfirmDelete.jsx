import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Modal } from '../ui/primitives.jsx'

/**
 * The delete confirmation, with inbox.html's wording kept verbatim — it names
 * the email, says exactly what deleting does and does not touch, and calls out
 * the two destructive side effects that are otherwise invisible:
 *
 *  - deleting a gate-skipped PO ALSO deletes the quote it matched, which is the
 *    only path in the whole system that deletes a quote;
 *  - a Split Quote entry's lines do not go back to the entry they came from.
 *
 * Nothing disappears off this dashboard on a single click (Sam).
 */
export default function ConfirmDelete({ job, open, onCancel, onConfirm, busy }) {
  if (!job) return null
  const quotes = job.closed_quotes || []

  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} width="max-w-md" labelledBy="confirmDeleteTitle">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <AlertTriangle className="size-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 id="confirmDeleteTitle" className="text-[15px] font-semibold text-ink-900">
              Delete this email?
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-700">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-ink-900">{job.subject || '(no subject)'}</span>?
            </p>

            {job.split_from_job_id && (
              <p className="mt-2.5 text-[13px] leading-5 text-ink-700">
                This is a <strong>Split Quote</strong> entry — its lines will <strong>not</strong> go
                back to the entry they were split from. They are deleted with it.
              </p>
            )}

            <p className="mt-2.5 text-[13px] leading-5 text-ink-700">
              It disappears from the inbox and you won’t be able to review or submit it. Nothing
              already in the review queue is affected.
            </p>

            {quotes.length > 0 && (
              <p className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[12px] leading-5 text-red-800">
                <strong>This also deletes quote {quotes.join(', ')}</strong> from the quote index for
                good. If you only meant “the gate got this wrong,” use{' '}
                <strong>Predict anyway</strong> instead — that reopens the quote and keeps it.
              </p>
            )}

            {job.status === 'pending' && (
              <p className="mt-2.5 text-[13px] leading-5 text-ink-500">
                This one is still predicting. The run in progress can’t be stopped, but its result
                will be thrown away instead of coming back to the inbox.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} disabled={busy}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
