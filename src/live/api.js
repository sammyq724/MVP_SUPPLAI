/**
 * The backend call. A port of inbox.html's `api()`, including its auth
 * behaviour, so both pages fail the same way.
 *
 * Every endpoint except /attachment/<token> is a POST carrying the shared site
 * password in the body — not a header and not a query string, because a
 * password in a URL lands in browser history, Referer headers and Render's
 * access log. The password lives in sessionStorage under the same key
 * inbox.html uses, so signing in on one page signs you in on the other.
 */
import { API_BASE } from './config.js'

const KEY = 'site_password'

export const getPassword = () => sessionStorage.getItem(KEY) || ''
export const setPassword = (pw) => sessionStorage.setItem(KEY, pw)
export const clearPassword = () => sessionStorage.removeItem(KEY)

/** Thrown for a 401 so callers can bail out silently while the page reloads. */
export const AUTH_ERROR = 'auth'

/**
 * An error carrying the HTTP status, because submit has to tell 409 ("already
 * submitted"), 502 ("saved but not pushed — keep the rep's state") and 400
 * ("show the server's message") apart, and they are otherwise identical.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: getPassword(), ...(payload || {}) }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    clearPassword()
    location.reload()
    throw new ApiError(AUTH_ERROR, 401)
  }
  if (!res.ok) throw new ApiError(data.error || 'Request failed.', res.status)
  return data
}

/** Unauthenticated by design — see server.js's /attachment/:token comment. */
export const attachmentUrl = (token, { download = false } = {}) =>
  `${API_BASE}/attachment/${encodeURIComponent(token)}${download ? '?download=1' : ''}`

export async function checkPassword(pw) {
  const res = await fetch(`${API_BASE}/api/check-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  const data = await res.json().catch(() => ({}))
  return !!data.ok
}
