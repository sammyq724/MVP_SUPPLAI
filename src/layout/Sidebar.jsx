import React from 'react'
import { ChevronsLeft, ChevronsRight, Inbox, Settings as SettingsIcon } from 'lucide-react'
import { cx, Tooltip } from '../ui/primitives.jsx'

export const NAV = [
  { key: 'inbox', label: 'Sales', icon: Inbox, hint: 'The request queue' },
  { key: 'settings', label: 'Settings', icon: SettingsIcon, hint: 'Account & integrations' },
]

export function Logo({ collapsed }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-[0_1px_2px_0_rgb(37_99_235_/_0.4)]">
        <svg viewBox="0 0 24 24" className="size-4 text-white" aria-hidden="true">
          <path
            d="M12 2.6 20.5 7v10L12 21.4 3.5 17V7L12 2.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M7.6 12h8.8M12 7.6v8.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {!collapsed && (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
          Solder
        </span>
      )}
    </div>
  )
}

export default function Sidebar({ active, onNavigate, collapsed, onToggle }) {
  return (
    <aside
      className={cx(
        'flex shrink-0 flex-col border-r border-ink-200 bg-white transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      <div
        className={cx(
          'flex h-14 shrink-0 items-center border-b border-ink-200',
          collapsed ? 'justify-center px-2' : 'px-3',
        )}
      >
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <ChevronsLeft className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <nav className={cx('flex flex-1 flex-col gap-0.5 py-3', collapsed ? 'px-2' : 'px-2.5')}>
        {!collapsed && (
          <p className="mb-1 px-2 text-[10px] font-semibold tracking-[0.06em] text-ink-400 uppercase">
            Workspace
          </p>
        )}
        {NAV.map((item) => {
          const isActive = active === item.key
          const btn = (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate?.(item.key)}
              aria-current={isActive ? 'page' : undefined}
              className={cx(
                'group flex h-8 w-full items-center rounded-lg text-[13px] font-medium transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
              )}
            >
              <item.icon
                className={cx('size-4 shrink-0', isActive ? 'text-brand-600' : 'text-ink-400')}
                strokeWidth={2}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.key === 'inbox' && (
                <span className="nums ml-auto rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  5
                </span>
              )}
            </button>
          )
          return collapsed ? (
            <Tooltip key={item.key} content={item.label} side="right">
              {btn}
            </Tooltip>
          ) : (
            btn
          )
        })}
      </nav>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mb-2 inline-flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <ChevronsRight className="size-4" strokeWidth={2} />
        </button>
      )}

      <div className={cx('border-t border-ink-200 py-2.5', collapsed ? 'px-2' : 'px-2.5')}>
        <div
          className={cx(
            'flex items-center rounded-lg p-1 transition-colors hover:bg-ink-100',
            collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-800 text-[11px] font-semibold text-white">
            SQ
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink-800">Sam Quinn</span>
              <span className="block truncate text-[11px] text-ink-400">Meridian Supply</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}
