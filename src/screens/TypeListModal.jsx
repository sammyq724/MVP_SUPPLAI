import React, { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, Eraser, Lightbulb, X } from 'lucide-react'
import { Button, HelpTip, IconButton, Modal, cx } from '../ui/primitives.jsx'

/**
 * Screen 2 — "Type list".
 *
 * A rep pastes the order the way the customer wrote it (email body, phone
 * notes, a takeoff copied out of a spreadsheet) and we parse it downstream.
 * One line item per line; the parser reads qty, unit and description.
 */

/** Filled in by the "See an example" toggle — reads like a real rough-in ask. */
const EXAMPLE_ORDER = [
  '400 ft 1-1/2" PVC sch 40 conduit, belled end',
  '60 ea 1-1/2" PVC male adapters',
  '2500 ft #10 THHN stranded, black',
  '45 ea 4-11/16" square boxes, 2-1/8" deep',
].join('\n')

const HELP_COPY =
  'Quantities, units and part descriptions are all picked up — "400 ft 1-1/2\" PVC sch 40" parses as qty 400, unit FT, PVC conduit. Pasting straight out of the customer\'s email is fine; greetings, signatures and blank lines are ignored.'

const countLines = (v) => v.split('\n').filter((l) => l.trim().length > 0).length

export default function TypeListModal({
  open,
  onClose,
  onSubmit,
  defaultText = '',
  defaultError = false,
}) {
  const [text, setText] = useState(defaultText)
  const [error, setError] = useState(defaultError)
  const areaRef = useRef(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const fieldId = `${uid}-order`
  const hintId = `${uid}-hint`
  const errorId = `${uid}-error`

  // Re-seed from props every time the dialog is opened so URL-driven states
  // (?modal=typelist&filled=1 / &error=1) render deterministically.
  useEffect(() => {
    if (!open) return
    setText(defaultText)
    setError(defaultError)
    const id = requestAnimationFrame(() => {
      const el = areaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
    return () => cancelAnimationFrame(id)
  }, [open, defaultText, defaultError])

  const lines = countLines(text)
  const filled = text.trim().length > 0

  const submit = () => {
    if (!text.trim()) {
      setError(true)
      areaRef.current?.focus()
      return
    }
    onSubmit?.(text)
    setText('')
    setError(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    // ⌘/Ctrl+Enter always submits. A bare Enter in an empty box submits too, so
    // the required-field validation fires instead of inserting a newline.
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      submit()
    } else if (!text.trim()) {
      e.preventDefault()
      submit()
    }
  }

  const showingExample = text === EXAMPLE_ORDER

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" labelledBy={titleId}>
      <form noValidate onSubmit={handleSubmit}>
        {/* ---------------------------------------------------------- header */}
        <div className="flex items-start gap-3 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[15px] font-semibold text-ink-900">
              Type list
            </h2>
            <p className="mt-0.5 text-[12px] leading-[1.45] text-ink-500">
              Paste or type an order the way the customer sent it — one line item per line.
              We&apos;ll parse it and match products.
            </p>
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mr-1.5" />
        </div>

        {/* ------------------------------------------------------------ body */}
        <div className="p-5">
          <div className="mb-1 flex items-center gap-1">
            <label
              htmlFor={fieldId}
              className="text-[11px] font-medium tracking-[0.01em] text-ink-500"
            >
              Order
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <HelpTip content={HELP_COPY} />
          </div>

          <textarea
            ref={areaRef}
            id={fieldId}
            name="order"
            rows={11}
            required
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (error) setError(false)
            }}
            onKeyDown={handleKeyDown}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={cx(hintId, error && errorId)}
            placeholder="Type the order here."
            className={cx(
              'w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-[13px] leading-6 text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors placeholder:text-ink-400 focus:outline-none',
              error
                ? 'border-red-400 ring-1 ring-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus-visible:outline-red-500'
                : 'border-ink-300 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            )}
          />

          {error && (
            <p
              id={errorId}
              role="alert"
              className="mt-2 flex items-center gap-1.5 text-[12px] text-red-600"
            >
              <AlertCircle className="size-3.5 shrink-0" strokeWidth={2.25} />
              Please fill out this field
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <span id={hintId} className="text-[11px] text-ink-400">
              {lines === 0 ? (
                <>
                  <span className="nums">0</span> lines
                </>
              ) : (
                <>
                  <span className="nums font-medium text-ink-500">{lines}</span>{' '}
                  {lines === 1 ? 'line' : 'lines'} detected
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setText(showingExample ? '' : EXAMPLE_ORDER)
                setError(false)
                areaRef.current?.focus()
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              {showingExample ? (
                <Eraser className="size-3.5 shrink-0" strokeWidth={2} />
              ) : (
                <Lightbulb className="size-3.5 shrink-0" strokeWidth={2} />
              )}
              {showingExample ? 'Clear example' : 'See an example'}
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------------- footer */}
        <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3.5">
          <span className="flex items-center gap-1 text-[11px] text-ink-400">
            <Kbd>⌘</Kbd>
            <span className="text-ink-300">+</span>
            <Kbd>Enter</Kbd>
            <span className="ml-1">to submit</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!filled}>
              Submit
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-ink-200 bg-ink-50 px-1 font-sans text-[10px] leading-none font-medium text-ink-500 shadow-[0_1px_0_0_rgb(15_23_42_/_0.05)]">
      {children}
    </kbd>
  )
}
