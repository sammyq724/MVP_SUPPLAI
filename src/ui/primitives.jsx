import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import { ChevronDown, Check, X, HelpCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export const cx = (...a) => a.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ Button */

const BTN_VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-panel hover:bg-brand-700 active:bg-brand-800 border border-brand-600 hover:border-brand-700',
  secondary:
    'bg-white text-ink-700 border border-ink-300 shadow-panel hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100',
  ghost: 'bg-transparent text-ink-600 border border-transparent hover:bg-ink-100 hover:text-ink-800',
  danger:
    'bg-red-600 text-white border border-red-600 shadow-panel hover:bg-red-700 hover:border-red-700',
  link: 'bg-transparent text-brand-600 border border-transparent hover:text-brand-700 hover:underline underline-offset-2 px-0',
}

const BTN_SIZES = {
  xs: 'h-6 px-2 text-[11px] gap-1 rounded-md',
  sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  lg: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none',
        BTN_SIZES[size],
        BTN_VARIANTS[variant],
        disabled &&
          'pointer-events-none border-ink-200 bg-ink-100 text-ink-400 shadow-none hover:bg-ink-100',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={2} />}
      {children}
      {IconRight && <IconRight className="size-3.5 shrink-0" strokeWidth={2} />}
    </button>
  )
}

export function IconButton({ icon: Icon, label, size = 'md', className, active, ...rest }) {
  const box = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-9' : 'size-7'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800',
        active && 'bg-ink-100 text-ink-800',
        box,
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2} />
    </button>
  )
}

/* --------------------------------------------------- Split (dropdown) button */

export function SplitButton({
  label,
  variant = 'primary',
  size = 'lg',
  options = [],
  onSelect,
  disabled,
  align = 'right',
  open: openProp,
  defaultOpen = false,
  icon,
}) {
  const [openState, setOpen] = useState(defaultOpen)
  const open = openProp ?? openState
  const ref = useRef(null)
  useOnClickOutside(ref, () => openProp === undefined && setOpen(false))

  const wrap =
    variant === 'primary'
      ? 'bg-brand-600 border-brand-600 text-white hover:bg-brand-700'
      : 'bg-white border-ink-300 text-ink-700 hover:bg-ink-50'
  const divider = variant === 'primary' ? 'border-brand-500/70' : 'border-ink-300'

  return (
    <div className="relative" ref={ref}>
      <div
        className={cx(
          'inline-flex items-stretch overflow-hidden rounded-lg border shadow-panel transition-colors',
          wrap,
          size === 'lg' ? 'h-9' : 'h-8',
          disabled &&
            'pointer-events-none border-ink-200 bg-ink-100 text-ink-400 shadow-none hover:bg-ink-100',
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect?.(options[0])}
          className="inline-flex items-center gap-1.5 px-3.5 text-[13px] font-medium whitespace-nowrap"
        >
          {icon && React.createElement(icon, { className: 'size-3.5', strokeWidth: 2 })}
          {label}
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label} options`}
          onClick={() => setOpen((o) => !o)}
          className={cx('inline-flex items-center border-l px-1.5', divider)}
        >
          <ChevronDown className={cx('size-3.5 transition-transform', open && 'rotate-180')} strokeWidth={2.25} />
        </button>
      </div>
      {open && (
        <div
          className={cx(
            'animate-in-up absolute bottom-full z-40 mb-1.5 min-w-[15rem] overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options.map((o) => (
            <button
              key={o.label ?? o}
              type="button"
              onClick={() => {
                onSelect?.(o)
                setOpen(false)
              }}
              className="flex w-full items-start gap-2.5 px-3 py-1.5 text-left text-[13px] text-ink-700 hover:bg-ink-50"
            >
              {o.icon && <o.icon className="mt-0.5 size-3.5 shrink-0 text-ink-400" strokeWidth={2} />}
              <span className="min-w-0">
                <span className="block font-medium">{o.label ?? o}</span>
                {o.hint && <span className="block text-[11px] text-ink-400">{o.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Dropdown menu */

export function Menu({ trigger, items = [], align = 'right', width = 'w-56', open: openProp }) {
  const [openState, setOpen] = useState(false)
  const open = openProp ?? openState
  const ref = useRef(null)
  useOnClickOutside(ref, () => openProp === undefined && setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          className={cx(
            'animate-in-up absolute top-full z-40 mt-1 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {items.map((it, i) =>
            it === '-' ? (
              <div key={i} className="my-1 border-t border-ink-200" />
            ) : (
              <button
                key={it.label}
                type="button"
                onClick={() => {
                  it.onClick?.()
                  setOpen(false)
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] hover:bg-ink-50',
                  it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink-700',
                )}
              >
                {it.icon && <it.icon className="size-3.5 shrink-0 opacity-70" strokeWidth={2} />}
                <span className="flex-1">{it.label}</span>
                {it.shortcut && <span className="text-[11px] text-ink-400">{it.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- Badge/pill */

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  slate: 'bg-ink-100 text-ink-600 ring-ink-500/20',
}

export function Badge({ tone = 'slate', dot = false, icon: Icon, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium ring-1 ring-inset',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-70" />}
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.25} />}
      {children}
    </span>
  )
}

/** Status pill with an explanatory hover tooltip (queue + detail header). */
export function StatusPill({ status, tooltip, forceTooltip = false, className }) {
  const tone = status === 'New' ? 'green' : status === 'In Progress' ? 'amber' : 'slate'
  return (
    <Tooltip content={tooltip} open={forceTooltip || undefined} width="w-64">
      <Badge tone={tone} dot className={cx('cursor-default', className)}>
        {status}
      </Badge>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------- Tooltip */

export function Tooltip({ content, children, side = 'bottom', open: openProp, width = 'w-max max-w-xs' }) {
  const [hover, setHover] = useState(false)
  const show = openProp ?? hover
  if (!content) return children
  const pos = {
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  }[side]
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          className={cx(
            'animate-in-fade pointer-events-none absolute z-50 rounded-lg bg-ink-900 px-2.5 py-1.5 text-[11px] leading-4 font-normal text-white shadow-pop',
            width,
            pos,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/** The small "?" affordance next to less-obvious field labels. */
export function HelpTip({ content, side = 'bottom', open }) {
  return (
    <Tooltip content={content} side={side} open={open} width="w-60">
      <HelpCircle
        className="size-3.5 shrink-0 cursor-help text-ink-400 transition-colors hover:text-ink-600"
        strokeWidth={2}
      />
    </Tooltip>
  )
}

/** Rich hover popover — used by the "Split quote" tag. */
export function Popover({ content, children, open: openProp, side = 'bottom', width = 'w-72' }) {
  const [hover, setHover] = useState(false)
  const show = openProp ?? hover
  const pos = {
    bottom: 'top-full left-0 mt-1.5',
    top: 'bottom-full left-0 mb-1.5',
  }[side]
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {show && (
        <span
          className={cx(
            'animate-in-up absolute z-50 rounded-xl border border-ink-200 bg-white p-3 text-left text-[12px] leading-[1.45] font-normal text-ink-600 shadow-pop',
            width,
            pos,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ Controls */

export function Checkbox({ checked, indeterminate, onChange, label, className, disabled }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  const box = (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer size-4 cursor-pointer appearance-none rounded-[4px] border border-ink-300 bg-white transition-colors checked:border-brand-600 checked:bg-brand-600 indeterminate:border-brand-600 indeterminate:bg-brand-600 hover:border-ink-400 checked:hover:border-brand-700 disabled:cursor-not-allowed disabled:bg-ink-100"
      />
      <Check
        className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
        strokeWidth={3.25}
      />
      {indeterminate && !checked && (
        <span className="pointer-events-none absolute h-0.5 w-2 rounded-full bg-white" />
      )}
    </span>
  )
  if (!label) return <span className={className}>{box}</span>
  return (
    <label
      className={cx('inline-flex cursor-pointer items-center gap-2 text-[12px] text-ink-600', className)}
    >
      {box}
      <span className="select-none">{label}</span>
    </label>
  )
}

export function Toggle({ checked, onChange, label, tone = 'brand', className }) {
  const on = tone === 'red' ? 'bg-red-500' : 'bg-brand-600'
  return (
    <label className={cx('inline-flex cursor-pointer items-center gap-2', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cx(
          'relative h-4 w-7 shrink-0 rounded-full transition-colors',
          checked ? on : 'bg-ink-300',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-3.5' : 'left-0.5',
          )}
        />
      </button>
      {label && (
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 select-none">
          {label}
          {checked && tone === 'red' && (
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          )}
        </span>
      )}
    </label>
  )
}

export function TextInput({
  className,
  invalid,
  icon: Icon,
  suffix,
  size = 'md',
  readOnly,
  ...rest
}) {
  const h = size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]'
  return (
    <div className="relative w-full">
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400"
          strokeWidth={2}
        />
      )}
      <input
        readOnly={readOnly}
        className={cx(
          'w-full rounded-lg border bg-white px-2.5 text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors placeholder:text-ink-400',
          h,
          Icon && 'pl-7.5',
          suffix && 'pr-8',
          invalid
            ? 'border-red-400 ring-1 ring-red-200 focus:border-red-500'
            : 'border-ink-300 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          readOnly && 'cursor-default border-ink-200 bg-ink-50 text-ink-500 hover:border-ink-200',
          'focus:outline-none',
          className,
        )}
        {...rest}
      />
      {suffix && (
        <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-ink-400">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function SearchInput({ placeholder = 'Search', className, width = 'w-64', ...rest }) {
  return (
    <div className={cx(width, className)}>
      <TextInput icon={Search} placeholder={placeholder} size="sm" {...rest} />
    </div>
  )
}

export function Select({ children, className, size = 'md', icon: Icon, placeholder, ...rest }) {
  const h = size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]'
  return (
    <div className="relative w-full">
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400"
          strokeWidth={2}
        />
      )}
      <select
        className={cx(
          'w-full cursor-pointer appearance-none rounded-lg border border-ink-300 bg-white px-2.5 pr-7 text-ink-800 shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)] transition-colors hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none',
          h,
          Icon && 'pl-7.5',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-400"
        strokeWidth={2}
      />
    </div>
  )
}

/** Label row with optional "?" help icon. */
export function Field({ label, help, children, className, required, hint }) {
  const id = useId()
  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <div className="mb-1 flex items-center gap-1">
          <label htmlFor={id} className="text-[11px] font-medium tracking-[0.01em] text-ink-500">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          {help && <HelpTip content={help} />}
        </div>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- Removable chip */

export function Chip({ children, onRemove, tone = 'default', icon: Icon, className }) {
  const tones = {
    default: 'bg-white border-ink-300 text-ink-800',
    soft: 'bg-brand-50 border-brand-200 text-brand-800',
  }
  return (
    <span
      className={cx(
        'group inline-flex max-w-full items-center gap-1.5 rounded-lg border py-1 pr-1 pl-2 text-[12px] font-medium shadow-[0_1px_1px_0_rgb(15_23_42_/_0.03)]',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0 text-ink-400" strokeWidth={2} />}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------- Surfaces */

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cx('rounded-xl border border-ink-200 bg-white shadow-panel', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Panel({ title, help, action, className, bodyClass, children }) {
  return (
    <Card className={cx('flex min-w-0 flex-col', className)}>
      <div className="flex h-9 items-center gap-1.5 border-b border-ink-200 px-3">
        <h3 className="text-[11px] font-semibold tracking-[0.04em] text-ink-500 uppercase">
          {title}
        </h3>
        {help && <HelpTip content={help} />}
        <div className="ml-auto flex items-center gap-1">{action}</div>
      </div>
      <div className={cx('flex-1 p-3', bodyClass)}>{children}</div>
    </Card>
  )
}

export function Modal({ open, onClose, children, width = 'max-w-xl', labelledBy }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto p-6 pt-[12vh]">
      <div className="animate-in-fade fixed inset-0 bg-ink-900/45 backdrop-blur-[1.5px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cx(
          'animate-in-pop relative w-full rounded-2xl border border-ink-200 bg-white shadow-modal',
          width,
        )}
      >
        {children}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Pagination */

export function Pagination({ from = 1, to = 14, total = 14, pageSize = 25, onPageSize, className }) {
  return (
    <div className={cx('flex items-center justify-end gap-4 px-4 py-2.5 text-[12px]', className)}>
      <span className="nums text-ink-500">
        Showing <span className="font-medium text-ink-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-ink-700">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-ink-500">Rows</span>
        <div className="w-16">
          <Select size="sm" value={pageSize} onChange={(e) => onPageSize?.(+e.target.value)}>
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Previous page" size="sm" disabled className="opacity-40" />
        <IconButton icon={ChevronRight} label="Next page" size="sm" disabled className="opacity-40" />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- hooks */

export function useOnClickOutside(ref, handler) {
  const saved = useRef(handler)
  saved.current = handler
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      saved.current(e)
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref])
}

export function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text) => {
    navigator.clipboard?.writeText?.(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [])
  return [copied, copy]
}

export const money = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
