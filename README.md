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
npm run shots        # build → preview → screenshot all 18 states into ./mockups
```

The harness fails loudly: any console error, React warning, or failed request on a
screen marks that shot `✗`. All eighteen currently pass clean.

## Screens

| # | Screen | Route |
|---|--------|-------|
| 1 | Sales — the request queue (home) | `#/inbox` |
| 2 | "New order" modal — text and/or files | `#/inbox?modal=new` |
| 3 | Request / Order Detail | `#/order` |
| 4 | Settings | `#/settings` |

Two sections, Sales and Settings. Single user, single branch: there is no assignee column,
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
| Default (14 rows, connect-inbox banner shown) | `#/inbox` |
| Status tooltip forced open | `#/inbox?tips=1` |
| Banner dismissed | `#/inbox?banner=0` |

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
| "Show more" suggestions expanded (up to 10) | `#/order?more=li-4` |
| Provenance connector, email → matched item | `#/order?trace=li-1` |
| Provenance connector from the takeoff row | `#/order?trace=li-3&tab=document` |
| Find Item lookup open for a line | `#/order?find=li-4` |
| Find Item grouped by a column | `#/order?find=li-4&group=productType` |

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
    order.js              email thread, PDF takeoff, header data, 6 parsed lines
                          with ranked AI product suggestions
    catalog.js            54-row item master + the finder's column and operator
                          contracts, and the operator matcher itself
  screens/
    Inbox.jsx             Screen 1
    NewOrderModal.jsx     Screen 2 — typed text + file attachments
    OrderDetail.jsx       Screen 3 container — owns all shared line-item state
    order/                TopBar, SourcePane, QuoteToPanel, ShipToPanel,
                          OrderMetaPanel, ProductsSection, LineItemBlock,
                          FindItemModal, TraceConnector, SummaryBar
    Settings.jsx          Screen 4
```

All data is mock data. There is no backend, no network call, and no binary asset —
thumbnails and the rendered PDF page are drawn in SVG/CSS.
