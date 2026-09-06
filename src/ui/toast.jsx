import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle2, X, ChevronDown, Loader2, AlertTriangle, Info } from 'lucide-react'
import { cx } from './primitives.jsx'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

let seq = 0

/**
 * Bottom-right toast stack.
 *  - kind: 'success' | 'info' | 'warning'  → single-line confirmation, optional Undo link
 *  - kind: 'processing'                    → collapsible card, chevron reveals per-item rows
 *                                            with a live elapsed-time counter ("2s")
 */
export function ToastProvider({ children, initial = [] }) {
  const [toasts, setToasts] = useState(() =>
    initial.map((t) => ({ id: `seed-${seq++}`, startedAt: Date.now(), ...t })),
  )
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const h = timers.current.get(id)
    if (h) clearTimeout(h)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (toast) => {
      const id = `t-${seq++}`
      const t = { id, startedAt: Date.now(), duration: 5000, ...toast }
      setToasts((ts) => [...ts, t])
      if (t.duration && t.kind !== 'processing') {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), t.duration),
        )
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const api = {
    push,
    dismiss,
    success: (title, opts = {}) => push({ kind: 'success', title, ...opts }),
    info: (title, opts = {}) => push({ kind: 'info', title, ...opts }),
    warning: (title, opts = {}) => push({ kind: 'warning', title, ...opts }),
    processing: (title, items, opts = {}) =>
      push({ kind: 'processing', title, items, duration: null, ...opts }),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-200 flex w-[21rem] flex-col-reverse gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function elapsed(since) {
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function Toast({ toast, onDismiss }) {
  const [open, setOpen] = useState(!!toast.defaultExpanded)
  const [, tick] = useState(0)

  useEffect(() => {
    if (toast.kind !== 'processing') return
    const h = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(h)
  }, [toast.kind])

  if (toast.kind === 'processing') {
    return (
      <div className="animate-in-up pointer-events-auto overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" strokeWidth={2.25} />
          <span className="flex-1 text-[13px] font-medium text-ink-800">{toast.title}</span>
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-5 items-center justify-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <ChevronDown
              className={cx('size-3.5 transition-transform', open && 'rotate-180')}
              strokeWidth={2.25}
            />
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="inline-flex size-5 items-center justify-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="size-3.5" strokeWidth={2.25} />
          </button>
        </div>
        {open && (
          <div className="animate-in-fade border-t border-ink-200 bg-ink-50/70">
            {(toast.items ?? []).map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-2 border-b border-ink-200/70 px-3 py-2 last:border-0"
              >
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                <span className="flex-1 truncate text-[12px] text-ink-600">{it.label}</span>
                <span className="nums rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-ink-500 ring-1 ring-ink-200 ring-inset">
                  {it.startedAt ? elapsed(it.startedAt) : (it.elapsed ?? elapsed(toast.startedAt))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const Icon =
    toast.kind === 'warning' ? AlertTriangle : toast.kind === 'info' ? Info : CheckCircle2
  const iconTone =
    toast.kind === 'warning' ? 'text-amber-500' : toast.kind === 'info' ? 'text-brand-600' : 'text-emerald-500'

  return (
    <div className="animate-in-up pointer-events-auto flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 shadow-pop">
      <Icon className={cx('size-4 shrink-0', iconTone)} strokeWidth={2.25} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink-800">{toast.title}</p>
        {toast.description && (
          <p className="truncate text-[11px] text-ink-500">{toast.description}</p>
        )}
      </div>
      {toast.onUndo !== undefined && (
        <button
          type="button"
          onClick={() => {
            toast.onUndo?.()
            onDismiss()
          }}
          className="shrink-0 text-[12px] font-semibold text-brand-600 hover:text-brand-700 hover:underline underline-offset-2"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
      >
        <X className="size-3.5" strokeWidth={2.25} />
      </button>
    </div>
  )
}
