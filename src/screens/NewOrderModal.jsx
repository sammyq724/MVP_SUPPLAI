import React, { useEffect, useId, useRef, useState } from 'react'
import { AlertCircle, Eraser, FileText, Lightbulb, Paperclip, Upload, X } from 'lucide-react'
import { Button, HelpTip, IconButton, Modal, cx } from '../ui/primitives.jsx'

/**
 * Screen 2 — "New order".
 *
 * One entry point for both ways an order arrives off-channel: the rep pastes
 * what the customer wrote (email body, phone notes, a takeoff copied out of a
 * spreadsheet) and/or attaches the file they sent. Either alone is enough, and
 * both together is the common case — a short email plus the takeoff PDF.
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

const FILE_HELP =
  'PDFs, spreadsheets and photos of a takeoff all work. Line items are read out of the file the same way they are read out of typed text, so you can attach the takeoff and leave the box empty.'

const ACCEPT = '.pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.heic,.txt'

const countLines = (v) => v.split('\n').filter((l) => l.trim().length > 0).length

const prettySize = (bytes) => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewOrderModal({
  open,
  onClose,
  onSubmit,
  defaultText = '',
  defaultFiles = [],
  defaultError = false,
}) {
  const [text, setText] = useState(defaultText)
  const [files, setFiles] = useState(defaultFiles)
  const [error, setError] = useState(defaultError)
  const [dragging, setDragging] = useState(false)
  const areaRef = useRef(null)
  const inputRef = useRef(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const fieldId = `${uid}-order`
  const hintId = `${uid}-hint`
  const errorId = `${uid}-error`

  // Re-seed from props every time the dialog is opened so URL-driven states
  // (?modal=new&filled=1 / &files=1 / &error=1) render deterministically.
  useEffect(() => {
    if (!open) return
    setText(defaultText)
    setFiles(defaultFiles)
    setError(defaultError)
    setDragging(false)
    const id = requestAnimationFrame(() => {
      const el = areaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultText, defaultError])

  const lines = countLines(text)
  const hasText = text.trim().length > 0
  // Either input satisfies the form — an attached takeoff needs no typed text.
  const filled = hasText || files.length > 0

  const addFiles = (list) => {
    const incoming = Array.from(list ?? []).map((f) => ({
      name: f.name,
      size: prettySize(f.size),
    }))
    if (!incoming.length) return
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name))
      return [...prev, ...incoming.filter((f) => !seen.has(f.name))]
    })
    setError(false)
  }

  const submit = () => {
    if (!filled) {
      setError(true)
      areaRef.current?.focus()
      return
    }
    onSubmit?.({ text, files })
    setText('')
    setFiles([])
    setError(false)
  }

  const reset = () => {
    setText('')
    setFiles([])
    setError(false)
    areaRef.current?.focus()
  }

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl" labelledBy={titleId}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {/* ------------------------------------------------------------ header */}
        <div className="flex items-start gap-3 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[15px] font-semibold text-ink-900">
              New order
            </h2>
            <p className="mt-0.5 text-[12px] leading-5 text-ink-500">
              Paste the order the way the customer sent it, attach their file, or both. We&rsquo;ll
              parse it and match products.
            </p>
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mt-1 -mr-1.5" />
        </div>

        {/* -------------------------------------------------------------- body */}
        <div className="p-5">
          <div className="mb-1 flex items-center gap-1">
            <label htmlFor={fieldId} className="text-[11px] font-medium text-ink-500">
              Order
            </label>
            <HelpTip content={HELP_COPY} side="right" />
          </div>

          <textarea
            id={fieldId}
            ref={areaRef}
            rows={9}
            value={text}
            aria-invalid={error || undefined}
            aria-describedby={error ? errorId : hintId}
            onChange={(e) => {
              setText(e.target.value)
              if (error) setError(false)
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Type the order here."
            className={cx(
              'w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-[13px] leading-6 text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors placeholder:text-ink-400 focus:outline-none',
              error
                ? 'border-red-400 ring-1 ring-red-200 focus:border-red-500'
                : 'border-ink-300 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            )}
          />

          {error ? (
            <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-600">
              <AlertCircle className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              Please fill out this field
            </p>
          ) : (
            <div className="mt-1.5 flex items-center gap-3">
              <p id={hintId} className="nums text-[11px] text-ink-400">
                {lines === 0
                  ? 'No lines yet'
                  : `${lines} line${lines === 1 ? '' : 's'} detected`}
              </p>
              <div className="ml-auto flex items-center gap-1">
                {(hasText || files.length > 0) && (
                  <Button variant="link" size="xs" icon={Eraser} onClick={reset}>
                    Clear
                  </Button>
                )}
                <Button
                  variant="link"
                  size="xs"
                  icon={Lightbulb}
                  onClick={() => {
                    setText(EXAMPLE_ORDER)
                    setError(false)
                    areaRef.current?.focus()
                  }}
                >
                  See an example
                </Button>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- files */}
          <div className="mt-4">
            <div className="mb-1 flex items-center gap-1">
              <span className="text-[11px] font-medium text-ink-500">Attachments</span>
              <HelpTip content={FILE_HELP} side="right" />
              <span className="text-[11px] text-ink-400">optional</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                addFiles(e.dataTransfer?.files)
              }}
              className={cx(
                'rounded-lg border border-dashed transition-colors',
                dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-300 bg-ink-50/60',
              )}
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
              >
                <Upload className="size-4 shrink-0 text-ink-400" strokeWidth={2} />
                <span className="min-w-0 flex-1 text-[12px] text-ink-600">
                  <span className="font-medium text-brand-600">Choose files</span> or drag them here
                </span>
                <span className="shrink-0 text-[11px] text-ink-400">
                  PDF, spreadsheet or photo
                </span>
              </button>

              {files.length > 0 && (
                <ul className="border-t border-ink-200 px-2 py-1.5">
                  {files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white"
                    >
                      <FileText className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-700">
                        {f.name}
                      </span>
                      {f.size && (
                        <span className="nums shrink-0 text-[11px] text-ink-400">{f.size}</span>
                      )}
                      <IconButton
                        size="sm"
                        icon={X}
                        label={`Remove ${f.name}`}
                        onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ footer */}
        <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3.5">
          <p className="flex items-center gap-1 text-[11px] text-ink-400">
            <Kbd>⌘</Kbd>
            <span>+</span>
            <Kbd>Enter</Kbd>
            <span className="ml-0.5">to submit</span>
          </p>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <span className="nums mr-1 flex items-center gap-1 text-[11px] text-ink-500">
                <Paperclip className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
                {files.length}
              </span>
            )}
            <Button onClick={onClose}>Cancel</Button>
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
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-ink-300 bg-ink-50 px-1 font-sans text-[10px] font-medium text-ink-500">
      {children}
    </kbd>
  )
}
