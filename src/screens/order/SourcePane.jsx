import React, { useState, useEffect } from 'react'
import { Mail, FileText, Download, Minus, Plus } from 'lucide-react'
import { Button, IconButton, HelpTip, cx } from '../../ui/primitives.jsx'
import { emailThread, documentPages } from '../../data/order.js'
import { useToast } from '../../ui/toast.jsx'

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10

const DOC_HELP =
  'The customer’s original attachment, exactly as it arrived. Every line on the right was read out of this file — edit the line, never the document.'

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

const addr = (p) => `${p.name} <${p.email}>`

/**
 * Left half of Screen 3 — the request as the customer sent it. Two tabs: the
 * email body, and the attached takeoff rendered inline so the rep never has to
 * leave the app to check a line.
 */
export default function SourcePane({ initialTab = 'email' }) {
  const toast = useToast()
  const [tab, setTab] = useState(initialTab)
  useEffect(() => setTab(initialTab), [initialTab])

  const file = emailThread.attachments[0]
  const download = () =>
    toast?.info('Downloading attachment', { description: `${file.name} · ${file.size}` })

  return (
    <section className="flex w-[46%] min-w-[26rem] shrink-0 flex-col border-r border-ink-200 bg-white">
      <div
        role="tablist"
        aria-label="Request source"
        className="flex h-10 shrink-0 items-end gap-1 border-b border-ink-200 px-3"
      >
        <Tab
          icon={Mail}
          label="Email"
          active={tab === 'email'}
          onClick={() => setTab('email')}
        />
        <Tab
          icon={FileText}
          label={file.name}
          meta={`${file.pages} pages`}
          active={tab === 'document'}
          onClick={() => setTab('document')}
        />
      </div>

      {tab === 'email' ? (
        <EmailTab file={file} onOpenDoc={() => setTab('document')} onDownload={download} />
      ) : (
        <DocumentTab pages={file.pages} onDownload={download} />
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- tabs */

function Tab({ icon: Icon, label, meta, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      title={label}
      className={cx(
        'flex h-10 max-w-[17rem] min-w-0 flex-col justify-end rounded-t-md transition-colors',
        active ? 'text-ink-900' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5 px-2.5 pb-2">
        <Icon className="size-3.5 shrink-0" strokeWidth={2} />
        <span className={cx('truncate text-[13px]', active && 'font-medium')}>{label}</span>
        {meta && <span className="nums shrink-0 text-[11px] text-ink-400">{meta}</span>}
      </span>
      <span
        className={cx('-mb-px h-0.5 rounded-full', active ? 'bg-brand-600' : 'bg-transparent')}
      />
    </button>
  )
}

/* -------------------------------------------------------------- email tab */

function EmailTab({ file, onOpenDoc, onDownload }) {
  const { from, to, cc, subject, date, body } = emailThread
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
          {initials(from.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink-900">{from.name}</p>
          <p className="truncate text-[12px] text-ink-400">{from.email}</p>
        </div>
        <span className="shrink-0 pt-0.5 text-[12px] whitespace-nowrap text-ink-400">{date}</span>
      </div>

      <table className="mt-3 w-full text-[12px]">
        <tbody>
          <tr>
            <td className="w-8 py-0.5 align-top text-ink-400">To</td>
            <td className="py-0.5 text-ink-600">{to.map(addr).join(', ')}</td>
          </tr>
          {cc?.length > 0 && (
            <tr>
              <td className="w-8 py-0.5 align-top text-ink-400">Cc</td>
              <td className="py-0.5 text-ink-600">{cc.map(addr).join(', ')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="mt-3 border-t border-ink-200 pt-3 text-[14px] font-semibold text-ink-900">
        {subject}
      </h2>

      <div className="mt-1">
        {body.map((block, i) =>
          typeof block === 'string' ? (
            <p key={i} className="mt-3 text-[13px] leading-6 whitespace-pre-line text-ink-700">
              {block}
            </p>
          ) : (
            <ul
              key={i}
              className="mt-3 space-y-1 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3"
            >
              {block.list.map((line) => (
                <li key={line} className="flex gap-2 font-mono text-[12px] leading-5 text-ink-700">
                  <span className="shrink-0 text-ink-400 select-none">–</span>
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          ),
        )}
      </div>

      <div className="mt-5 border-t border-ink-200 pt-3">
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
          1 attachment
        </p>
        <div className="flex items-center gap-2.5 rounded-lg border border-ink-200 p-2.5 transition-colors hover:bg-ink-50">
          <FileText className="size-4 shrink-0 text-ink-400" strokeWidth={2} />
          <button
            type="button"
            onClick={onOpenDoc}
            className="min-w-0 flex-1 text-left"
            title="Open in the document tab"
          >
            <span className="block truncate text-[13px] font-medium text-ink-800">{file.name}</span>
            <span className="nums block text-[11px] text-ink-400">
              PDF · {file.size} · {file.pages} pages
            </span>
          </button>
          <Button variant="link" size="sm" icon={Download} onClick={onDownload}>
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- document tab */

function DocumentTab({ pages, onDownload }) {
  const [pct, setPct] = useState(100)
  const page = documentPages[0]
  const clamp = (v) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v))

  return (
    <>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ink-200 bg-ink-50 px-3">
        <IconButton
          icon={Minus}
          label="Zoom out"
          size="sm"
          disabled={pct <= ZOOM_MIN}
          onClick={() => setPct((p) => clamp(p - ZOOM_STEP))}
          className={cx(pct <= ZOOM_MIN && 'pointer-events-none opacity-35')}
        />
        <button
          type="button"
          onDoubleClick={() => setPct(100)}
          aria-label="Zoom level — double-click to reset to 100%"
          title="Double-click to reset to 100%"
          className="nums w-12 rounded px-1 py-0.5 text-center text-[12px] text-ink-600 transition-colors hover:bg-ink-200/70"
        >
          {pct}%
        </button>
        <IconButton
          icon={Plus}
          label="Zoom in"
          size="sm"
          disabled={pct >= ZOOM_MAX}
          onClick={() => setPct((p) => clamp(p + ZOOM_STEP))}
          className={cx(pct >= ZOOM_MAX && 'pointer-events-none opacity-35')}
        />

        <span className="h-4 w-px shrink-0 bg-ink-300" aria-hidden="true" />

        <span className="nums text-[12px] whitespace-nowrap text-ink-500">Page 1 of {pages}</span>
        <HelpTip content={DOC_HELP} />

        <div className="ml-auto">
          <Button variant="link" size="sm" icon={Download} onClick={onDownload}>
            Download file
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-ink-200/60 p-5">
        <div
          className="mx-auto w-full max-w-[46rem] bg-white p-8 shadow-lg ring-1 ring-ink-300"
          style={{ zoom: pct / 100 }}
        >
          <div className="font-serif text-ink-900">
            <h3 className="text-center text-[15px] leading-5 font-bold tracking-[0.02em] uppercase">
              {page.title}
            </h3>
            <div className="mt-2 border-b-[3px] border-double border-ink-800" />

            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[11px]">
              {page.meta.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline gap-3 border-b border-dotted border-ink-300 pb-1"
                >
                  <dt className="w-24 shrink-0 font-semibold tracking-[0.06em] whitespace-nowrap text-ink-500 uppercase">
                    {k}
                  </dt>
                  <dd className="min-w-0 flex-1 break-words text-ink-800">{v}</dd>
                </div>
              ))}
            </dl>

            <table className="mt-6 w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-ink-800">
                  <th
                    scope="col"
                    className="w-8 pb-1.5 text-left text-[10px] font-bold tracking-[0.08em] text-ink-600 uppercase"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="pb-1.5 text-left text-[10px] font-bold tracking-[0.08em] text-ink-600 uppercase"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="w-16 pb-1.5 text-right text-[10px] font-bold tracking-[0.08em] text-ink-600 uppercase"
                  >
                    Qty
                  </th>
                  <th
                    scope="col"
                    className="w-14 pb-1.5 pl-3 text-left text-[10px] font-bold tracking-[0.08em] text-ink-600 uppercase"
                  >
                    UOM
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map(([n, description, qty, uom]) => (
                  <tr key={n} className="border-b border-ink-200">
                    <td className="nums py-1.5 align-top text-[12px] text-ink-500">{n}</td>
                    <td className="py-1.5 align-top text-[12px] leading-5 text-ink-900">
                      {description}
                    </td>
                    <td className="nums py-1.5 text-right align-top text-[12px] text-ink-900">
                      {qty}
                    </td>
                    <td className="py-1.5 pl-3 align-top text-[11px] tracking-[0.04em] text-ink-600 uppercase">
                      {uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-6 border-t border-ink-200 pt-3 text-[11px] leading-5 text-ink-600 italic">
              <span className="font-semibold not-italic">Note: </span>
              {page.note}
            </p>

            <p className="nums mt-8 text-center text-[10px] tracking-[0.08em] text-ink-400 uppercase">
              Page 1 of {pages}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
