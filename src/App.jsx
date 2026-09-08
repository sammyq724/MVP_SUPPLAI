import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './layout/Sidebar.jsx'
import { ToastProvider } from './ui/toast.jsx'
import Inbox from './screens/Inbox.jsx'
import OrderDetail from './screens/OrderDetail.jsx'
import Settings from './screens/Settings.jsx'

/**
 * Hash router.
 *
 * Routes and the state flags each accepts — every documented interactive state
 * is reachable by URL so the mockups can be reviewed (and screenshotted)
 * deterministically.
 *
 *   #/inbox                       Screen 1 — request queue
 *     ?modal=new                    Screen 2 — New order modal, empty
 *     ?modal=new&filled=1           …with text entered (Submit enabled)
 *     ?modal=new&files=1            …with a file attached and no text
 *     ?modal=new&error=1            …submitted empty (inline validation)
 *     ?processing=1                 post-submit: processing toast + new row
 *     ?banner=0                     inbox-connect banner dismissed
 *     ?tips=1                       force the status tooltip open
 *   #/order                       Screen 3 — order detail (2 lines outstanding)
 *     ?state=resolved               every line matched, actions enabled
 *     ?tab=document                 source pane on the attachment tab
 *     ?delivery=1                   delivery address + instructions expanded
 *     ?more=li-4                    "Show more" candidates expanded for a line
 *     ?menu=create                  Create Quote dropdown open
 *     ?trace=li-1                   provenance connector: source line → matched item
 *     ?find=li-4                    Find Item lookup open for a line
 *     ?find=li-4&group=productType  …grouped by a column
 *   #/settings                    Account, inbox and parsing settings
 */
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, qs] = raw.split('?')
  const params = Object.fromEntries(new URLSearchParams(qs ?? ''))
  return { route: path || 'inbox', params }
}

export function useRouter() {
  const [state, setState] = useState(parseHash)
  useEffect(() => {
    const onHash = () => setState(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const navigate = useCallback((route, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    window.location.hash = `#/${route}${qs ? `?${qs}` : ''}`
  }, [])
  return { ...state, navigate }
}

export default function App() {
  const { route, params, navigate } = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  // "Sales" stays lit while drilled into a request.
  const activeNav = route === 'order' ? 'inbox' : route

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-ink-100">
        <Sidebar
          active={activeNav}
          onNavigate={(k) => navigate(k)}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {route === 'inbox' && <Inbox params={params} navigate={navigate} />}
          {route === 'order' && <OrderDetail params={params} navigate={navigate} />}
          {route === 'settings' && <Settings params={params} navigate={navigate} />}
        </main>
      </div>
    </ToastProvider>
  )
}
