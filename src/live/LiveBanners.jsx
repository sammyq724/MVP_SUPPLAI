import React from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { Button, cx } from '../ui/primitives.jsx'
import { timeAgo } from './adapt.js'

/**
 * The status banners from /inbox, wording kept. Each one was written to answer
 * a specific question a salesman asks in front of that state, so paraphrasing
 * them loses the point:
 *
 *  - a gate SKIP has to say which quote it matched and offer the way out,
 *    because a wrong skip is otherwise invisible and unfixable;
 *  - a POTENTIAL match has to say "check before entering this so it isn't
 *    ordered twice" — it was predicted, and the quote is still open;
 *  - NO QUOTE FOUND has to read as "just a PO, no quote on file", not as an
 *    error.
 */

function Banner({ tone = 'slate', icon: Icon, children, className }) {
  const tones = {
    slate: 'border-ink-200 bg-ink-50 text-ink-700',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    red: 'border-red-300 bg-red-50 text-red-800',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    blue: 'border-brand-200 bg-brand-50 text-brand-900',
  }
  return (
    <div className={cx('mt-3 rounded-xl border px-3.5 py-3 text-[13px] leading-5', tones[tone], className)}>
      <div className="flex items-start gap-2.5">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function Why({ summary, children }) {
  if (!children) return null
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-[12px] font-medium opacity-80 select-none">{summary}</summary>
      <div className="mt-1 text-[12px] leading-5 whitespace-pre-wrap opacity-90">{children}</div>
    </details>
  )
}

export default function LiveBanners({ job, onRetry, onPredictAnyway, busy }) {
  const out = []

  if (job.status === 'pending') {
    out.push(
      <Banner key="pending" tone="blue" icon={Loader2}>
        <span className="inline-flex items-center gap-2">
          <span className="font-medium">Predicting</span>
        </span>
        <p className="mt-0.5">
          This usually takes 20–90 seconds. You can leave this page; the result will be waiting in
          the inbox.
        </p>
      </Banner>,
    )
  }

  if (job.status === 'error') {
    out.push(
      <Banner key="error" tone="red" icon={AlertCircle}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1">{job.error || 'Prediction failed.'}</span>
          <Button size="sm" variant="danger" onClick={onRetry} disabled={busy}>
            {busy ? 'Retrying…' : 'Retry prediction'}
          </Button>
        </div>
      </Banner>,
    )
  }

  // A low-confidence gate match: predicted, and the quote left OPEN.
  if (job.status !== 'skipped' && job.potential_match) {
    const pm = job.potential_match
    const all = [pm, ...(pm.alternates || [])]
    out.push(
      <Banner key="pm" tone="amber" icon={AlertCircle}>
        <p className="font-semibold">Potential PO quote match</p>
        <p className="mt-0.5">
          This may duplicate{' '}
          {all.map((q, i) => (
            <React.Fragment key={q.quote_ref + i}>
              {i > 0 && ', or '}
              quote <strong>{q.quote_ref}</strong>
              {q.customer_name ? ` (${q.customer_name})` : ''}
            </React.Fragment>
          ))}
          . We checked it against open quotes and the match wasn’t strong enough to skip it
          {pm.confidence_invalid ? ' (the matcher’s answer was incomplete)' : ''}. Check before
          entering this so it isn’t ordered twice.
        </p>
        <Why summary="Why it looked like a match">{pm.reasoning}</Why>
      </Banner>,
    )
  } else if (job.status !== 'skipped' && job.no_quote_found) {
    out.push(
      <Banner key="nq" tone="slate" icon={Info}>
        <p>
          <strong>No quote found for PO</strong> — no open quote on file matches this order. Nothing
          was closed.
        </p>
        <Why summary="Why">{job.gate_reason}</Why>
      </Banner>,
    )
  } else if (job.status !== 'skipped' && job.gate_reason) {
    out.push(
      <Banner key="gate" tone="slate" icon={Info}>
        <Why summary="Quote gate: not matched to an existing quote">{job.gate_reason}</Why>
      </Banner>,
    )
  }

  if (job.status === 'skipped') {
    const meta = []
    if (job.customer_name || job.customer_id) {
      meta.push(`Customer ${job.customer_id || '?'}${job.customer_name ? ` — ${job.customer_name}` : ''}`)
    }
    if (job.confidence) meta.push(`${job.confidence} confidence`)
    meta.push(
      job.tier === 'quote_ref'
        ? 'matched because the PO cites the quote number'
        : job.tier === 'deepseek'
          ? 'matched by adjudication'
          : job.tier || 'matched',
    )
    const closed = job.closed_quotes || []
    out.push(
      <Banner key="skip" tone="amber" icon={AlertCircle}>
        <p className="font-semibold">
          Not predicted — this looks like a release against quote {job.matched_quote || '(unknown)'}
        </p>
        {job.reason && <p className="mt-0.5">{job.reason}</p>}
        <p className="mt-1 text-[12px] opacity-80">{meta.join(' · ')}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <Button size="sm" variant="primary" onClick={onPredictAnyway} disabled={busy}>
            {busy ? 'Starting…' : 'Predict anyway'}
          </Button>
          <span className="min-w-0 flex-1 text-[12px] leading-5">
            {closed.length ? (
              <>
                Convert quote {closed.join(', ')} in the ERP. Or, if the gate got it wrong:{' '}
                <strong>Predict anyway</strong> reopens that quote and predicts this email; the{' '}
                <strong>Delete</strong> button above deletes both the email and the quote.
              </>
            ) : (
              'Convert the existing quote in the ERP, or predict this as a new order if the gate got it wrong.'
            )}
          </span>
        </div>
      </Banner>,
    )
  }

  if (job.status === 'submitted') {
    out.push(
      <Banner key="done" tone="green" icon={CheckCircle2}>
        Submitted to the review queue as order <strong>{job.order_ref || '(none)'}</strong>
        {job.customer_id ? `, customer ${job.customer_id}` : ''} — {job.row_count || 0} line(s),{' '}
        {timeAgo(job.reviewed_at)}.
      </Banner>,
    )
  }

  if (job.note) {
    out.push(
      <Banner key="note" tone="slate" icon={Info}>
        {job.note}
      </Banner>,
    )
  }

  return out.length ? <>{out}</> : null
}
