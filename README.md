# Solder — Order Desk UI

High-fidelity, **working** mockups for a B2B order desk: the internal tool distributor
sales/ops staff use to turn incoming purchase and quote requests — arriving by email, PDF,
or phone — into priced, validated sales orders. An AI matching layer suggests catalog
products for each requested line; this UI displays and lets a rep confirm that output.

Built as a real React app rather than static images so every interactive state is
clickable: hover a status pill, expand the delivery section, pick a suggested product and
undo it from the toast, watch the Create Quote button flip from disabled to enabled as the
last line gets matched.

**Live demo → https://sammyq724.github.io/MVP_SUPPLAI/**

Deployed from this branch by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
on every push. Because routing is hash-based, every state below is directly linkable —
e.g. [`#/order?state=resolved`](https://sammyq724.github.io/MVP_SUPPLAI/#/order?state=resolved).
The workflow ends by fetching the published page and failing if it isn't serving the
built bundle, so a green run means the link genuinely works.

> **One setting worth changing:** this repo's Pages **Source** is still *Deploy from a
> branch*, so every push also runs a Jekyll build of the repo root. That publishes the
> unbuilt Vite template — a page whose only script tag is `/src/main.jsx`, which renders
> blank — to the same URL our artifact goes to, last writer wins. The workflow currently
> works around it by waiting for that build to finish before deploying. Setting
> **Settings → Pages → Source → GitHub Actions** removes the race entirely; the workflow
> tries to do this itself on every run but the Actions token lacks the admin scope for it.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

Rendered PNGs of every state are checked into [`mockups/`](mockups). To regenerate them:

```bash
npm run shots        # build → preview → screenshot all 20 states into ./mockups
```

The harness fails loudly: any console error, React warning, or failed request on a
screen marks that shot `✗`. All twenty currently pass clean.

## Live mode — real inbox data from HQPSPLBAI

By default this repo is a mockup: `src/data/*.js`, no backend, no network call. **Live mode**
points the Sales screens at the real [HQPSPLBAI](https://github.com/sammyq724/HQPSPLBAI) backend
— the Node/Express app that receives order emails from Make.com, predicts item IDs with Claude,
and until now showed them only on its own plain-HTML dashboard at `/inbox`. In live mode this UI
renders the same emails, the same predictions and the same review controls, and submits to the
same `review_queue2.csv`.

Which mode you get is decided by build mode, not by a flag anyone has to remember:

| Command | Mode | Base | Used for |
|---|---|---|---|
| `npm run dev` | **live** | `/MVP_SUPPLAI/` | working against a local backend |
| `npm run build` | mock | `/MVP_SUPPLAI/` | the GitHub Pages demo, and `npm run shots` |
| `npm run build:live` | **live** | `/app/` | the bundle HQPSPLBAI serves at `/`, `/inbox` and `/app` |

`VITE_LIVE=1` / `VITE_LIVE=0` overrides either direction.

### Running it against a local backend

```bash
# 1. in a HQPSPLBAI checkout — a sandbox copy of the data, nothing pushed
./scripts/dev_sandbox.sh          # serves :3000, SITE_PASSWORD=test

# 2. here
npm run dev                       # http://127.0.0.1:5173/MVP_SUPPLAI/
```

Vite proxies `/api` and `/attachment` to the backend, so live mode is same-origin. That matters
twice over: the backend sets no CORS headers, and the shared password travels in a POST body.

**Never point this at production Render or the real repo.** `dev_sandbox.sh` exists so a test
submit writes to a throwaway `review_queue2.csv`; it leaves `GITHUB_*` unset, which makes
`sync.js` refuse to run git at all.

| Env var | Default | What it does |
|---|---|---|
| `VITE_LIVE` | `1` in dev, `0` in build | force live or mock |
| `VITE_API_TARGET` | `http://127.0.0.1:3000` | where the dev proxy sends `/api` and `/attachment` |
| `VITE_BASE` | `/MVP_SUPPLAI/` | public base path (`/app/` for the live build) |
| `VITE_API_BASE` | *(empty — same origin)* | debugging door only; the backend sends no CORS headers |

### What live mode covers, and what it doesn't

Live: the inbox queue (polled every 10s), the order detail with the email and every attachment,
line items parsed from the prediction, the pick between equivalent item IDs, the "mark wrong" X
and per-line notes, and submit to the review queue. Delete, the blue flag, Retry and
Predict-anyway are all wired to their real endpoints. Plus, added 2026-10-08:

**Build New Quote/PO — typed and attached orders.** Text, files or both go to `POST /api/jobs`,
the same endpoint arriving email uses, so a hand-entered order becomes an ordinary inbox card:
predicted in the background, reviewed and submitted exactly like an email rather than down a
second parallel path. `email_type` is deliberately not sent, so the quote gate returns
`not_checked` before making any call — a rep typing an order in is explicitly asking for a
prediction, so having the gate decide it duplicates a quote and skip it would be absurd. The card
is badged **Typed in**, and its review-queue rows are written `manual_entry` rather than being
mislabelled `email_auto`.

**In progress, and progress that is actually saved.** Reviewing a 16-line email is not one
sitting. Picks, flags, notes and the two header fields are written to `localStorage` as the rep
works (`src/live/useDraft.js`), the summary bar says *Saving your progress…* then *Progress
saved*, and the queue shows the email as **In progress** — a sixth status that exists only in
this browser, since it is `ready` plus a draft. Deliberately local: nothing here is a decision
yet, and a half-finished review synced to `review_queue2.csv` would put rows in the retrain
corpus that nobody ever submitted. Cleared on submit or delete, pruned when the email is gone.

**Split Quote** (`POST /api/inbox/split`). Hidden behind a button until clicked — a checkbox
column is noise on an ordinary order — then checkboxes, a count, and the *must leave at least one
item* guardrail enforced in the page as well as on the server. Rows keep their original `#`
through the move, so gaps are expected and a *"Row 12: Not lead free?"* follow-up still lines up.
Both sides are tagged **Split Quote** and say which is which underneath.

**Skipped lives in History, not the inbox.** A gate skip predicts nothing and moves nothing — the
email stays in Gmail — so a card in this inbox claimed an action that had not happened. They are
a record of a decision, and History gains a third tab for them, with the matched quote, the
confidence and the adjudicator's reasoning on every row. A wrong skip is the expensive failure,
so it is listed rather than hidden; opening one leads to **Predict anyway**.

**As of 2026-10-07 this is HQPSPLBAI's landing page** — `/` and `/inbox` both serve it. The two
pages it replaced are still there and are linked from the sidebar under *"Not in Solder yet"*,
because each still does something this does not: `/inbox-classic` is the only place with Split
Quote and the Quotes tab, and `/predict` is the only way to predict an order that did not arrive
by email.

Not live: Settings (labelled **Preview** in the sidebar), Find Item, and History's Submitted and
Deleted tabs (each labelled **Preview** on the tab itself — History's Skipped tab is real). Anything needing Prophet 21 — unit price,
availability, UoM, totals, the item-master finder — reads `—` rather than a plausible-looking
number, and the total line says *Pricing needs P21*.

### `src/live/`

All of it lives there, so mock mode is untouched and `npm run shots` cannot regress:

| File | Job |
|---|---|
| `config.js` | the `LIVE` switch and poll intervals |
| `api.js` | POST + shared password, `ApiError` carrying the HTTP status |
| `PasswordGate.jsx` | the gate; same `sessionStorage` key as `/inbox` |
| `parse.js` | **the prediction-table parser** — a port of `inbox.html`'s |
| `adapt.js` | job summary → queue row, status → pill, Make's envelope → readable email |
| `useInbox.js` / `useJob.js` | polling and the per-email actions |
| `useDraft.js` | in-progress review state in `localStorage`, and the In progress derivation |
| `submitManual.js` | Build New Quote/PO — base64 the files, `POST /api/jobs` |
| `LiveSkipped.jsx` | History's Skipped tab |
| `LiveInbox.jsx`, `LiveOrderDetail.jsx`, `LiveSourcePane.jsx`, `LiveLineBlock.jsx`, `LiveBanners.jsx`, `LiveTopBar.jsx`, `LiveStatusPill.jsx`, `ConfirmDelete.jsx` | the screens |

The five shared components that needed both behaviours — `QuoteToPanel`, `ShipToPanel`,
`OrderMetaPanel`, `SummaryBar`, `Sidebar` — take a `live` prop and branch at the top; the mock
path is byte-for-byte what it was.

### Parser parity

`src/live/parse.js` re-implements `/inbox`'s table parsing. If the two ever disagree a row
silently changes number — and a row number is what a Split Quote names, what the server's
"must leave at least one item" guardrail counts, and what a *"Row 12: Not lead free?"* follow-up
points at. So it is checked rather than trusted:

```bash
npm run parity -- --repo ../plumbing-data     # $0, offline, read-only
```

It lifts `parseResult`, `tablesForJob` and `parseChoiceCell` straight out of `inbox.html`,
runs both implementations over **every** `predicted` payload in `inbox_log.csv`, and diffs row
count, numbering, split-off hiding, table labels, trailing text and the `" OR "` choice split
(ids *and* the descriptions paired with them). It cross-checks row numbering against
`webapp/rows.js` as a third opinion, adds five synthetic edge cases for shapes the real corpus
does not contain yet, and fails if the corpus stops covering a two-choice row, a
`NO_PREDICTION`, a multi-part job or a split job.

**If you change `parseResult` in `inbox.html`, change it here and in `rows.js`.**

## Screens

| # | Screen | Route |
|---|--------|-------|
| 1 | Sales — the request queue (home) | `#/inbox` |
| 2 | "New order" modal — text and/or files | `#/inbox?modal=new` |
| 3 | Request / Order Detail | `#/order` |
| 4 | History — submitted and deleted documents | `#/history` |
| 5 | Settings | `#/settings` |

Three sections — Sales, History and Settings. Single user, single branch: there is no assignee column,
no branch selection and no team management, because right now there is one salesman and one
branch. Orders arrive by email, by attachment, over the phone, or typed in by hand —
**Build New Quote/PO** takes typed text and file attachments together, since an off-channel
order is usually a short note *plus* the customer's takeoff.

The queue carries seven columns: Customer (with the contact beneath), Subject, Status, Order
Number, PO Number, Date and Lines.

### Every interactive state is addressable by URL

Deliberate, so states can be reviewed and screenshotted deterministically rather than
clicked into.

**Screen 1 — Request Queue**

| State | Route |
|---|---|
| Default (14 rows) | `#/inbox` |
| Status tooltip forced open | `#/inbox?tips=1` |

**Screen 2 — New order modal**

| State | Route |
|---|---|
| Empty — Submit disabled | `#/inbox?modal=new` |
| Submitted empty — "Please fill out this field" | `#/inbox?modal=new&error=1` |
| Text entered — Submit enabled | `#/inbox?modal=new&filled=1` |
| Files attached, no text — Submit still enabled | `#/inbox?modal=new&files=1` |
| After submit — processing toast + new queue row | `#/inbox?processing=1` |

**Screen 3 — Order Detail**

| State | Route |
|---|---|
| 2 lines outstanding — red banner, actions disabled | `#/order` |
| All lines matched — actions enabled | `#/order?state=resolved` |
| Create Quote dropdown open (4 options) | `#/order?state=resolved&menu=create` |
| Attachment tab — document rendered inline with zoom | `#/order?tab=document` |
| Delivery address + instructions expanded | `#/order?delivery=1` |
| Provenance connector, email → matched item | `#/order?trace=li-1` |
| Provenance connector from the takeoff row | `#/order?trace=li-3&tab=document` |
| Find Item lookup open for a line | `#/order?find=li-4` |
| Find Item grouped by a column | `#/order?find=li-4&group=productType` |

**Screen 4 — History**

| State | Route |
|---|---|
| Submitted quotes and orders | `#/history` |
| A row expanded to pricing / shipping / billing | `#/history?open=h-1` |
| Deleted documents, with the reason each was dropped | `#/history?tab=deleted` |

### Provenance connector

Hovering a line item — or the customer's own words on the left — draws a line between
the two, boxing the source text and ringing the matched card. It answers the question a
rep actually has in front of an AI-parsed order: *where did this line come from?*

It works on both source tabs (the email's list and the takeoff's rows), in both
directions, and drops out rather than lying when either end scrolls out of its pane. A
`?trace=` deep link centres both ends first, so the link doesn't depend on wherever the
panes happened to open.

### Find Item

Every line's "Search for a product" row escalates to **Find Item**, an item-master
lookup modelled on the ERP finder reps already use, so the muscle memory carries over:

- **Search Text** plus an operator — Contains, Does not contain, Is equal to, Is not
  equal to, Starts with, Ends with, Is null, Is not null.
- **Search all bold Columns** — on, the search text runs against every bold (searchable)
  column; off, against Item ID alone.
- **A per-column filter row** where each funnel opens the same operator list. Column
  filters AND together, and AND with the global search.
- **Group by any column** — drag a header into the drop zone, or use the column's kebab
  menu. Groups collapse and carry counts.
- **A kebab on every column** for sort, group, filter and hide.

Typing in the line's own box filters the suggestions already on that line; pressing Enter
(or the **Find item** button) escalates to the finder, carrying the text with it. Picking
an item selects it on the line as a normal candidate — it inherits the line's quantity and
flows into the running total like any suggested match.

Most lines carry a **single** suggestion. Only the genuinely ambiguous ones offer a second —
which is why the two-suggestion lines are exactly the ones that start outstanding. Anything
wider than that is Find Item's job, so there is no "show more" pile to dig through.

## Design language

- **One accent** — `brand-*` (blue, `brand-600`) for primary buttons, links, the active nav
  item, and the logo. Neutrals are `ink-*`.
- **Status colors** — emerald for good/new, amber for in-progress/needs-attention, red for
  blocking warnings.
- **Density first** on tables and line-item lists; whitespace is spent on headers and empty
  states, not on rows.
- **Small pills and badges** for status and line state — but *not* for match
  confidence: suggested products carry no "exact / close / alternate" labels, so the rep
  reads SKU, description, stock and price instead of a colour.
- **Toasts** stack in the bottom-right, carry an Undo link where the action is reversible,
  and the processing toast is collapsible with a live elapsed-time counter.
- **`?` help tips** next to any field whose meaning isn't obvious — Avail, rounded
  quantities, the Writer field, the finder's bold-column toggle.
- Numeric columns use a `nums` (tabular-figures) utility so figures align down the column.

Tokens live in `src/index.css`; the primitives that enforce them live in `src/ui/`.

## Layout

```
src/
  App.jsx                 hash router + route/state contract
  index.css               design tokens (brand/ink ramps, shadows, motion)
  layout/Sidebar.jsx      collapsible nav — Sales, Settings
  ui/
    primitives.jsx        Button, SplitButton, Menu, Badge, StatusPill, Tooltip, HelpTip,
                          Checkbox, Toggle, TextInput, Select, Field, Chip,
                          Card, Panel, Modal, Pagination
    toast.jsx             stacking toasts, Undo, collapsible processing toast
    ProductThumb.jsx      SVG catalog thumbnails (no binary assets)
  data/
    queue.js              14 queue rows
    history.js            10 submitted + 4 deleted documents, each with its
                          pricing, shipping and billing block
    order.js              email thread, PDF takeoff, header data, 6 parsed lines
                          with ranked AI product suggestions
    catalog.js            54-row item master + the finder's column and operator
                          contracts, and the operator matcher itself
  screens/
    Inbox.jsx             Screen 1
    NewOrderModal.jsx     Screen 2 — typed text + file attachments
    OrderDetail.jsx       Screen 3 container — owns all shared line-item state
    History.jsx           Screen 4 — Submitted / Deleted tabs
    order/                TopBar, SourcePane, QuoteToPanel, ShipToPanel,
                          OrderMetaPanel, ProductsSection, LineItemBlock,
                          FindItemModal, TraceConnector, SummaryBar
    Settings.jsx          Screen 5
```

All data is mock data. There is no backend, no network call, and no binary asset —
thumbnails and the rendered PDF page are drawn in SVG/CSS.
