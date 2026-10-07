import React from 'react'
import { Check, Hammer, Link2, Search, Table2, X } from 'lucide-react'
import { Badge, Card, TextInput, Tooltip, cx } from '../ui/primitives.jsx'

/**
 * One predicted line, with the review-loop controls /inbox carries.
 *
 * The red X and the Notes box are not decoration: they are the only two things
 * a salesman adds to a prediction, they travel into review_queue2.csv on
 * submit, and the weekly retrain pass reads `notes` first on every row flagged
 * incorrect. Losing either would break the active-learning loop.
 *
 * Pricing is deliberately absent. There is no P21 connection yet, so unit
 * price, availability, UoM and totals are "—" rather than plausible-looking
 * numbers a rep might quote from.
 */

const DASH = <span className="text-ink-300">—</span>

/* Column widths, matched to the mock's LineItemBlock so live and mock lines
   sit at the same rhythm. */
const COL_UOM = 'w-12'
const COL_AVAIL = 'w-16'
const COL_QTY = 'w-[6.5rem]'
const COL_UNIT = 'w-20'
const COL_TOTAL = 'w-24'

function CandidateRow({ cand, selectable, selected, onSelect, qty, name }) {
  const Wrapper = selectable ? 'button' : 'div'
  return (
    <Wrapper
      {...(selectable
        ? { type: 'button', role: 'radio', name, 'aria-checked': selected, onClick: onSelect }
        : {})}
      className={cx(
        'flex w-full items-center gap-3 border-b border-ink-100 py-2 pr-3 pl-3 text-left transition-colors last:border-0',
        selectable && 'cursor-pointer hover:bg-ink-50',
        selected && 'bg-brand-50 ring-1 ring-brand-200 ring-inset',
      )}
    >
      {selectable && (
        <span
          className={cx(
            'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            selected ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white',
          )}
          aria-hidden="true"
        >
          {selected && <span className="size-1.5 rounded-full bg-white" />}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className={cx(
            'block truncate font-mono text-[12px] font-semibold',
            selected ? 'text-brand-800' : 'text-ink-900',
          )}
        >
          {cand.id}
        </span>
        {/* Wraps rather than truncates: two equivalent options often differ only
            at the tail ("CORED PLUG" vs "SOLID PLUG"), which is the very thing
            the rep is choosing between. */}
        {cand.desc && (
          <span className="line-clamp-2 text-[12px] leading-4 text-ink-500">{cand.desc}</span>
        )}
      </span>

      <span className={cx('shrink-0 text-right text-[12px]', COL_UOM)}>{DASH}</span>
      <span className={cx('shrink-0 text-right text-[12px]', COL_AVAIL)}>{DASH}</span>
      <span className={cx('nums shrink-0 pr-2 text-right text-[12px] text-ink-800', COL_QTY)}>
        {qty || DASH}
      </span>
      <span className={cx('shrink-0 text-right text-[12px]', COL_UNIT)}>{DASH}</span>
      <span className={cx('shrink-0 text-right text-[12px]', COL_TOTAL)}>{DASH}</span>
    </Wrapper>
  )
}

export default function LiveLineBlock({ line, state, onChange, readOnly }) {
  const { classified: c, n } = line
  const isChoice = c.kind === 'choice'
  const unresolved = isChoice && !state.chosen
  const missing = c.kind === 'none'
  const patch = (next) => onChange(n, { ...state, ...next })

  return (
    <Card
      data-live-line={n}
      className={cx(
        'mt-2 overflow-hidden',
        state.flagged
          ? 'ring-1 ring-red-300'
          : unresolved
            ? 'ring-1 ring-amber-300'
            : missing
              ? 'ring-1 ring-amber-300'
              : undefined,
      )}
    >
      <div className={cx((unresolved || missing) && 'bg-amber-50/30', state.flagged && 'bg-red-50/30')}>
        {/* ----------------------------------------------------------- header */}
        <div className="flex items-start gap-3 px-3 py-2.5">
          <span className="nums mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-ink-100 text-[11px] font-semibold text-ink-600">
            {n}
          </span>
          <div className="min-w-0 flex-1">
            {/* The customer's own words, exactly as typed — this is column 5 of
                the mandatory output table and what review_queue2.csv stores. */}
            <p className="text-[13px] leading-5 font-semibold break-words text-ink-900">
              {line.input_text || <span className="text-ink-400">(no input text)</span>}
            </p>
            {line.quantity && (
              <p className="mt-0.5 text-[12px] text-ink-400">
                Qty <span className="nums text-ink-600">{line.quantity}</span>
              </p>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {unresolved ? (
              <Badge tone="amber">Needs selection</Badge>
            ) : missing ? (
              <Badge tone="amber">{String(line.predicted_item_id).toUpperCase()}</Badge>
            ) : c.kind === 'makeup' ? (
              <Badge tone="blue" icon={Link2}>
                Make-up
              </Badge>
            ) : c.kind === 'fab' ? (
              <Badge tone="slate" icon={Hammer}>
                Fabrication
              </Badge>
            ) : (
              <Badge tone="green" icon={Check}>
                Matched
              </Badge>
            )}

            {!readOnly && (
              <Tooltip
                side="top"
                content={state.flagged ? 'Marked wrong — click to clear' : 'Mark this line incorrect'}
              >
                <button
                  type="button"
                  aria-pressed={state.flagged}
                  aria-label={`Mark line ${n} incorrect`}
                  onClick={() => patch({ flagged: !state.flagged })}
                  className={cx(
                    'inline-flex size-6 items-center justify-center rounded-md border transition-colors',
                    state.flagged
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                      : 'border-ink-300 bg-white text-ink-400 hover:border-red-400 hover:text-red-600',
                  )}
                >
                  <X className="size-3.5" strokeWidth={2.75} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------ line search */}
        {/* Present, and plainly off: the finder needs a live item master. */}
        {!readOnly && (
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <Tooltip content="Needs P21 connection" side="top">
              <div className="min-w-0 flex-1">
                <TextInput
                  icon={Search}
                  size="sm"
                  disabled
                  readOnly
                  placeholder="Search for a product"
                  aria-label={`Search catalog for line ${n} (needs P21 connection)`}
                />
              </div>
            </Tooltip>
            <Tooltip content="Needs P21 connection" side="top">
              <span className="inline-flex h-7 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md border border-ink-200 bg-ink-100 px-2.5 text-[12px] font-medium text-ink-400">
                <Table2 className="size-3.5 shrink-0" strokeWidth={2} />
                Find item
              </span>
            </Tooltip>
          </div>
        )}

        {/* --------------------------------------------------- column headers */}
        <div className="flex h-6 items-center gap-3 border-t border-ink-200 bg-ink-50/70 px-3 text-[10px] font-medium tracking-wide text-ink-400 uppercase">
          <span className="min-w-0 flex-1">{isChoice ? 'Pick one' : 'Predicted item'}</span>
          <span className={cx('shrink-0 text-right', COL_UOM)}>UoM</span>
          <span className={cx('shrink-0 text-right', COL_AVAIL)}>Avail</span>
          <span className={cx('shrink-0 pr-2 text-right', COL_QTY)}>Qty</span>
          <span className={cx('shrink-0 text-right', COL_UNIT)}>Unit price</span>
          <span className={cx('shrink-0 text-right', COL_TOTAL)}>Total price</span>
        </div>

        {/* -------------------------------------------------------- candidates */}
        {missing ? (
          <div className="px-3 py-2.5">
            {/* rules.md: for a NO_PREDICTION row the Item Description states
                exactly what is missing, instead of describing an item. */}
            <p className="text-[12px] leading-5 text-amber-800">
              {line.item_description || 'No prediction was made for this line.'}
            </p>
            {!readOnly && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-56">
                  <TextInput
                    size="sm"
                    value={state.manualId}
                    onChange={(e) => patch({ manualId: e.target.value })}
                    placeholder="Item ID, if you know it"
                    aria-label={`Item ID for line ${n}`}
                    className="font-mono"
                  />
                </div>
                <p className="text-[11px] leading-4 text-ink-500">
                  {state.manualId.trim()
                    ? 'Submitted instead of ' + String(line.predicted_item_id).toUpperCase() + '.'
                    : 'Optional — this line can be submitted as it is.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            role={isChoice ? 'radiogroup' : undefined}
            aria-label={isChoice ? `Equivalent options for line ${n}` : undefined}
          >
            {c.candidates.map((cand, i) => (
              <CandidateRow
                key={cand.id + ':' + i}
                cand={cand}
                name={`line-${n}`}
                selectable={isChoice && !readOnly}
                selected={isChoice ? state.chosen === cand.id : true}
                onSelect={() => patch({ chosen: cand.id, chosenDesc: cand.desc || cand.id })}
                // A make-up is several fittings for ONE requested line, so the
                // quantity belongs to the line, not to each part of it.
                qty={i === 0 ? line.quantity : ''}
              />
            ))}
          </div>
        )}

        {isChoice && !readOnly && (
          <p className="border-t border-ink-100 px-3 py-1.5 text-[11px] text-ink-500">
            Pick one — both are equivalent, no brand was specified.
          </p>
        )}
        {c.kind === 'makeup' && (
          <p className="border-t border-ink-100 px-3 py-1.5 text-[11px] text-ink-500">
            Make-up — the exact item isn’t stocked, so both are ordered together.
          </p>
        )}

        {/* ---------------------------------------------- follow-up questions */}
        {/* The LF "Not lead free? (Y/n)", the PVC schedule question, the
            Pipe-O-Let second size — rules.md appends these as text under the
            table referencing a row number, so they belong against that row. */}
        {line.followUps.length > 0 && (
          <div className="border-t border-ink-100 bg-brand-50/40 px-3 py-2">
            {line.followUps.map((t, i) => (
              <p key={i} className="text-[12px] leading-5 text-brand-900">
                {t}
              </p>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------ notes */}
        {!readOnly ? (
          <div className="border-t border-ink-100 px-3 py-2">
            <TextInput
              size="sm"
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder={state.flagged ? 'Why is this wrong?' : 'Notes for this line (optional)'}
              aria-label={`Notes for line ${n}`}
            />
          </div>
        ) : (
          state.notes && (
            <div className="border-t border-ink-100 px-3 py-2 text-[12px] text-ink-600">
              {state.notes}
            </div>
          )
        )}
      </div>
    </Card>
  )
}
