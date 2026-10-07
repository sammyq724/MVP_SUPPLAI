import React, { useEffect, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { Button, TextInput } from '../ui/primitives.jsx'
import { checkPassword, getPassword, setPassword } from './api.js'

/**
 * The shared-password gate, same model as /inbox: one password for everybody,
 * held in sessionStorage under the same key, so signing in on either page
 * signs you in on both. Accounts and logins are a later phase.
 */
export default function PasswordGate({ children }) {
  const [state, setState] = useState('checking') // checking | locked | open
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const stored = getPassword()
    if (!stored) { setState('locked'); return }
    checkPassword(stored)
      .then((ok) => alive && setState(ok ? 'open' : 'locked'))
      // A backend that is not running is not a wrong password. Say so, rather
      // than sending someone off to re-type a password that was fine.
      .catch(() => alive && setState('locked'))
    return () => { alive = false }
  }, [])

  const submit = async (e) => {
    e?.preventDefault()
    if (!value || busy) return
    setBusy(true)
    setError('')
    try {
      if (await checkPassword(value)) {
        setPassword(value)
        setState('open')
      } else {
        setError('Incorrect password.')
      }
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'open') return children
  if (state === 'checking') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-ink-100">
        <Loader2 className="size-5 animate-spin text-ink-400" strokeWidth={2} />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ink-100 px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-6 shadow-panel"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Lock className="size-4" strokeWidth={2} />
        </span>
        <h1 className="mt-3 text-[16px] font-semibold text-ink-900">Solder — order desk</h1>
        <p className="mt-1 text-[12px] leading-5 text-ink-500">
          Enter the shared site password. It is the same one the{' '}
          <span className="font-mono">/inbox</span> dashboard uses.
        </p>
        <div className="mt-4">
          <TextInput
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Password"
            aria-label="Site password"
            aria-invalid={!!error}
          />
          {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
        </div>
        <Button type="submit" variant="primary" className="mt-4 w-full justify-center" disabled={busy || !value}>
          {busy ? 'Checking…' : 'Enter'}
        </Button>
      </form>
    </div>
  )
}
