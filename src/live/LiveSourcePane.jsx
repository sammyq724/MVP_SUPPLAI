import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, Image as ImageIcon, Mail, Minus, Plus } from 'lucide-react'
import { IconButton, cx } from '../ui/primitives.jsx'
import { attachmentUrl } from './api.js'
import { initials, parseAddress, parseEmailBody } from './adapt.js'

const ZOOM_MIN = 50
const ZOOM_MAX = 400
const ZOOM_STEP = 25

/* ------------------------------------------------------------ byte check */

/**
 * The bytes CAN be gone: a file whose first git push had not landed when Render
 * replaced the instance. /attachment/<token> answers 410 for that (as opposed
 * to 404 for a token that never existed), specifically so the page can say
 * "no longer stored" instead of showing a broken-image icon.
 *
 * An <img> reports that through onError, but an <iframe> holding a PDF does
 * not, so both go through one HEAD probe instead of two different mechanisms.
 */
function useAttachmentStatus(token) {
  const [status, setStatus] = useState('checking')
  useEffect(() => {
    if (!token) return
    let alive = true
    setStatus('checking')
    fetch(attachmentUrl(token), { method: 'HEAD' })
      .then((r) => {
        if (!alive) return
        setStatus(r.ok ? 'ok' : r.status === 410 ? 'gone' : r.status === 404 ? 'missing' : 'error')
      })
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [token])
  return [status, setStatus]
}

function Unavailable({ status, filename }) {
  const text =
    status === 'gone'
      ? 'This file is no longer stored on the server.'
      : status === 'missing'
        ? 'This attachment is not on the server.'
        : 'Could not load this attachment.'
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 bg-ink-200/60 px-6 text-center">
      <FileText className="size-6 text-ink-400" strokeWidth={1.75} />
      <p className="text-[13px] font-medium text-ink-700">{text}</p>
      <p className="max-w-xs text-[12px] text-ink-500">
        {filename} · the email’s own copy is still in Gmail.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------ image tab */

/**
 * The image, fitted to the pane exactly.
 *
 * At 100% the <img> is absolutely positioned to the full viewport with
 * object-fit: contain, inside an overflow-hidden parent — so the whole photo is
 * visible, nothing is cropped, and there are no scrollbars at default zoom
 * whatever the photo's aspect ratio. Zooming scales about the centre and
 * dragging pans; the pan is clamped so an edge can never be dragged past the
 * middle of the viewport and lost.
 */
function ImageView({ file }) {
  const [pct, setPct] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useAttachmentStatus(file.token)
  const viewport = useRef(null)
  const drag = useRef(null)

  const scale = pct / 100
  const clamp = (v) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v))

  // Zooming back out must not leave the photo parked off to one side.
  const zoom = (next) => {
    const z = clamp(next)
    setPct(z)
    if (z <= 100) setPan({ x: 0, y: 0 })
  }

  /**
   * transform is `scale(s) translate(t)`, so a translate of t moves the image
   * s*t screen pixels — divide the pointer delta by s to keep dragging 1:1.
   * The image fills the viewport on its long axis, so the overflow per side is
   * W(s-1)/2 screen px, i.e. W(s-1)/(2s) in translate units.
   */
  const onPointerDown = (e) => {
    if (scale <= 1) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, pan }
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const box = viewport.current?.getBoundingClientRect()
    if (!box) return
    const limitX = (box.width * (scale - 1)) / (2 * scale)
    const limitY = (box.height * (scale - 1)) / (2 * scale)
    const nx = drag.current.pan.x + (e.clientX - drag.current.x) / scale
    const ny = drag.current.pan.y + (e.clientY - drag.current.y) / scale
    setPan({
      x: Math.min(limitX, Math.max(-limitX, nx)),
      y: Math.min(limitY, Math.max(-limitY, ny)),
    })
  }
  const endDrag = () => { drag.current = null; setDragging(false) }

  if (status === 'gone' || status === 'missing' || status === 'error') {
    return (
      <>
        <ZoomBar pct={pct} onZoom={zoom} disabled file={file} />
        <Unavailable status={status} filename={file.filename} />
      </>
    )
  }

  return (
    <>
      <ZoomBar pct={pct} onZoom={zoom} file={file} hint={scale > 1 ? 'Drag to pan' : null} />
      <div
        ref={viewport}
        data-scroll="source"
        className="relative min-h-0 flex-1 overflow-hidden bg-ink-200/60"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          src={attachmentUrl(file.token)}
          alt={file.filename}
          draggable={false}
          onError={() => setStatus('gone')}
          className="absolute inset-0 size-full select-none"
          style={{
            objectFit: 'contain',
            transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
            transition: dragging ? 'none' : 'transform 120ms ease-out',
          }}
        />
      </div>
    </>
  )
}

function ZoomBar({ pct, onZoom, file, disabled, hint }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ink-200 bg-ink-50 px-3">
      <IconButton
        icon={Minus}
        label="Zoom out"
        size="sm"
        disabled={disabled || pct <= ZOOM_MIN}
        onClick={() => onZoom(pct - ZOOM_STEP)}
        className={cx((disabled || pct <= ZOOM_MIN) && 'pointer-events-none opacity-35')}
      />
      <button
        type="button"
        onClick={() => onZoom(100)}
        aria-label="Zoom level — click to fit the pane"
        title="Click to fit the pane"
        className="nums w-12 rounded px-1 py-0.5 text-center text-[12px] text-ink-600 transition-colors hover:bg-ink-200/70"
      >
        {pct}%
      </button>
      <IconButton
        icon={Plus}
        label="Zoom in"
        size="sm"
        disabled={disabled || pct >= ZOOM_MAX}
        onClick={() => onZoom(pct + ZOOM_STEP)}
        className={cx((disabled || pct >= ZOOM_MAX) && 'pointer-events-none opacity-35')}
      />
      {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      <div className="ml-auto flex items-center gap-2">
        <span className="nums hidden text-[11px] text-ink-400 sm:inline">
          {file.bytes ? `${Math.max(1, Math.round(file.bytes / 1024))} KB` : ''}
        </span>
        <a
          href={attachmentUrl(file.token, { download: true })}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-600 underline-offset-2 hover:underline"
        >
          <Download className="size-3.5 shrink-0" strokeWidth={2} />
          Download
        </a>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- pdf tab */

/**
 * An <iframe>, not a link: /attachment/<token> already serves
 * Content-Type: application/pdf with an inline disposition, so the browser's
 * own viewer renders it here — with paging, scrolling and zoom for free, which
 * beats anything hand-built for a multi-page PO. #view=FitH fits the page width
 * to the pane so the first page lands readable rather than at 100% of a
 * letter-size sheet.
 */
function PdfView({ file }) {
  const [status] = useAttachmentStatus(file.token)
  if (status === 'checking') {
    return <div className="min-h-0 flex-1 bg-ink-200/60" />
  }
  if (status !== 'ok') return <Unavailable status={status} filename={file.filename} />
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ink-200 bg-ink-50 px-3">
        <span className="truncate text-[12px] text-ink-600">{file.filename}</span>
        <span className="nums shrink-0 text-[11px] text-ink-400">
          {file.bytes ? `${Math.max(1, Math.round(file.bytes / 1024))} KB` : ''}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href={attachmentUrl(file.token)}
            target="_blank"
            rel="noopener"
            className="text-[12px] font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Open full page
          </a>
          <a
            href={attachmentUrl(file.token, { download: true })}
            className="text-[12px] font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Download
          </a>
        </div>
      </div>
      <iframe
        src={`${attachmentUrl(file.token)}#view=FitH`}
        title={file.filename}
        className="min-h-0 w-full flex-1 border-0 bg-ink-200/60"
      />
    </div>
  )
}

/* ------------------------------------------------------------ email tab */

function EmailView({ job }) {
  const parsed = parseEmailBody(job.body)
  const who = parseAddress(job.from)
  const notes = job.attachment_notes || []
  const files = job.attachments || []

  return (
    <div data-scroll="source" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
          {initials(who.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink-900">{who.name || '(unknown sender)'}</p>
          {who.email !== who.name && (
            <p className="truncate text-[12px] text-ink-400">{who.email}</p>
          )}
        </div>
        <span className="shrink-0 pt-0.5 text-[12px] whitespace-nowrap text-ink-400">
          {new Date(job.received_at).toLocaleString('en-US')}
        </span>
      </div>

      {parsed.ok && parsed.headers.length > 0 && (
        <table className="mt-3 w-full text-[12px]">
          <tbody>
            {parsed.headers
              .filter((h) => !/^subject$/i.test(h.key))
              .map((h) => (
                <tr key={h.key}>
                  <td className="w-10 py-0.5 align-top text-ink-400">{h.key}</td>
                  <td className="py-0.5 break-words text-ink-600">{h.value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h2 className="mt-3 border-t border-ink-200 pt-3 text-[14px] font-semibold text-ink-900">
        {job.subject || '(no subject)'}
      </h2>

      {parsed.ok ? (
        <>
          <p className="mt-2 text-[13px] leading-6 whitespace-pre-wrap text-ink-700">{parsed.body}</p>
          {parsed.sections.map((s) => (
            <div key={s.title} className="mt-4">
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
                {s.title}
              </p>
              <pre className="overflow-x-auto rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[12px] leading-5 whitespace-pre-wrap text-ink-700">
                {s.text}
              </pre>
            </div>
          ))}
        </>
      ) : (
        // Not every email arrives in Make's envelope — 8 of 37 real bodies are
        // raw order text. Rendering those as preformatted text keeps the
        // customer's own line breaks, which are what the lines were read from.
        <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-5 whitespace-pre-wrap text-ink-700">
          {parsed.raw || '(this email had no body)'}
        </pre>
      )}

      {(files.length > 0 || notes.length > 0) && (
        <div className="mt-5 border-t border-ink-200 pt-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
            {files.length
              ? `${files.length} attachment${files.length === 1 ? '' : 's'}`
              : 'Attachments'}
          </p>
          <div className="space-y-1.5">
            {files.map((f) => (
              <div key={f.token} className="flex items-center gap-2.5 rounded-lg border border-ink-200 p-2.5">
                {f.mime_type === 'application/pdf' ? (
                  <FileText className="size-4 shrink-0 text-ink-400" strokeWidth={2} />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-ink-400" strokeWidth={2} />
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink-800">{f.filename}</span>
                  <span className="nums block text-[11px] text-ink-400">
                    {f.mime_type} · {f.bytes ? `${Math.max(1, Math.round(f.bytes / 1024))} KB` : 'size unknown'}
                  </span>
                </div>
              </div>
            ))}
            {/* Anything Make sent that was NOT stored is named rather than
                dropped silently — otherwise "the photo isn't showing" has no
                explanation. */}
            {notes.map((n, i) => (
              <p
                key={i}
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] leading-5 text-amber-800"
              >
                Not stored — {n}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ pane */

function Tab({ icon: Icon, label, meta, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      title={label}
      className={cx(
        'flex h-10 max-w-[15rem] min-w-0 flex-col justify-end rounded-t-md transition-colors',
        active ? 'text-ink-900' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 px-2.5 pb-2">
        <Icon className="size-3.5 shrink-0" strokeWidth={2} />
        <span className={cx('truncate text-[13px]', active && 'font-medium')}>{label}</span>
        {meta && <span className="nums shrink-0 text-[11px] text-ink-400">{meta}</span>}
      </span>
      <span className={cx('-mb-px h-0.5 rounded-full', active ? 'bg-brand-600' : 'bg-transparent')} />
    </button>
  )
}

/**
 * Left half of the order detail in live mode: the email itself, plus one tab
 * per stored attachment. The mock's SVG "takeoff" is deliberately absent — it
 * is a drawing, and there is a real file here instead.
 */
export default function LiveSourcePane({ job }) {
  const files = job.attachments || []
  const [tab, setTab] = useState('email')
  // An attachment arriving on a later poll (POST /api/inbox/attach) must not
  // knock the pane off whatever tab the rep is reading.
  useEffect(() => {
    if (tab !== 'email' && !files.some((f) => f.token === tab)) setTab('email')
  }, [files, tab])

  const active = files.find((f) => f.token === tab)

  return (
    <section className="flex w-[40%] min-w-[23rem] shrink-0 flex-col border-r border-ink-200 bg-white">
      <div
        role="tablist"
        aria-label="Request source"
        className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto border-b border-ink-200 px-3"
      >
        <Tab icon={Mail} label="Email" active={tab === 'email'} onClick={() => setTab('email')} />
        {files.map((f) => (
          <Tab
            key={f.token}
            icon={f.mime_type === 'application/pdf' ? FileText : ImageIcon}
            label={f.filename}
            active={tab === f.token}
            onClick={() => setTab(f.token)}
          />
        ))}
      </div>

      {tab === 'email' || !active ? (
        <EmailView job={job} />
      ) : active.mime_type === 'application/pdf' ? (
        <PdfView key={active.token} file={active} />
      ) : (
        <ImageView key={active.token} file={active} />
      )}
    </section>
  )
}
