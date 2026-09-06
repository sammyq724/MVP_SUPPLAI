import React from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import OrderDetail from '../src/screens/OrderDetail.jsx'
import { ToastProvider } from '../src/ui/toast.jsx'

const params = Object.fromEntries(new URLSearchParams(location.search))
createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <div className="flex h-screen flex-col overflow-hidden bg-ink-100">
      <OrderDetail params={params} navigate={() => {}} />
    </div>
  </ToastProvider>,
)
