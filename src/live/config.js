/**
 * LIVE MODE SWITCH.
 *
 * Mock mode is the published demo (GitHub Pages) and what `npm run shots`
 * screenshots; live mode talks to the HQPSPLBAI backend. The default is chosen
 * by build mode rather than by a flag someone has to remember:
 *
 *   npm run dev      -> LIVE  (vite proxies /api and /attachment to :3000)
 *   npm run build    -> MOCK  (what Pages serves, and what shots asserts)
 *   npm run build:live -> LIVE, based at /app, for webapp/public/app
 *
 * VITE_LIVE=1 / VITE_LIVE=0 overrides either direction.
 */
const override = import.meta.env.VITE_LIVE

export const LIVE = override === undefined || override === '' ? import.meta.env.DEV : override === '1' || override === 'true'

/**
 * Same-origin by default. In dev that is vite, which proxies to the backend;
 * served from /app it is the backend itself. VITE_API_BASE exists only for the
 * odd case of running the UI somewhere else entirely — note the backend sets
 * no CORS headers, so that is not a supported deployment, just a debugging door.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

/** Matches inbox.html's own poll intervals, so both pages refresh alike. */
export const LIST_POLL_MS = 10000
export const DETAIL_POLL_MS = 4000
