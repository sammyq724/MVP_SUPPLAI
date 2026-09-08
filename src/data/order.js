/**
 * The working order behind Screen 3 — source document, header data, and the
 * parsed line items with the AI layer's suggested product matches.
 *
 * Source lines — both the email's list and the takeoff's rows — carry the
 * `lineId` they were parsed into, which is what lets the UI draw a connector
 * from the customer's own words to the item matched against them.
 *
 * Line items carry `requested` (the customer's literal words), `qty` (what we
 * will actually order — may be rounded up to a sellable multiple), and up to 10
 * ranked candidates. `selected` is null until a rep picks one.
 */

export const order = {
  id: 'req-1041',
  subject: 'RFQ — Riverbend Tower phase 2 rough-in',
  date: 'Sep 5, 2026',
  status: 'In Progress',
  positionIndex: 1,
  positionTotal: 14,
  writer: 'q.sam@meridian-supply.com',
  orderNumber: null,
  customerPO: 'PO-88412',
  shipDate: '2026-09-11',
  shipTime: '07:30',
}

export const customer = {
  name: 'Brightline Mechanical',
  account: 'BRT-4471',
  address: '4820 Wingate Blvd, Suite 300\nHouston, TX 77032',
}

export const contact = {
  name: 'Dana Whitfield',
  email: 'd.whitfield@brightlinemech.com',
  phone: '(713) 555-0142',
}

export const shipTo = {
  label: 'Riverbend Tower — Job Site',
  address: '1290 Riverbend Loop, Gate 4\nHouston, TX 77043',
}

export const branches = {
  price: 'Houston — North (HOU-01)',
  ship: 'Katy Supply (KTY-07)',
}

export const shipViaOptions = [
  'Company truck — next run',
  'Company truck — dedicated',
  'Customer pickup (will call)',
  'LTL freight — collect',
  'LTL freight — prepaid & add',
  'Parcel — ground',
]

export const deliveryDetail = {
  street: '1290 Riverbend Loop',
  complement: 'Gate 4 — call ahead for crane window',
  city: 'Houston',
  state: 'TX',
  country: 'United States',
  postal: '77043',
  instructions:
    'Deliver to the west laydown yard. Driver must check in at the trailer for a badge. No deliveries between 11:30a–1:00p (crane picks).',
  carrier: 'Meridian Fleet',
  tracking: '',
  route: 'HOU-WEST-AM',
  freight: 'PPD — Prepaid & allowed',
}

export const emailThread = {
  from: { name: 'Dana Whitfield', email: 'd.whitfield@brightlinemech.com' },
  to: [{ name: 'Meridian Orders', email: 'orders@meridian.solder.com' }],
  cc: [{ name: 'Luis Ferrer', email: 'l.ferrer@brightlinemech.com' }],
  subject: 'RFQ — Riverbend Tower phase 2 rough-in',
  date: 'Fri, Sep 5, 2026 at 4:12 PM',
  attachments: [{ name: 'riverbend-ph2-takeoff.pdf', size: '412 KB', pages: 3 }],
  body: [
    'Hi team,',
    'We are starting phase 2 rough-in at Riverbend Tower next Thursday and need pricing on the list below. Same job as the phase 1 order back in June — please use the Katy branch for stock since that is closer to the site.',
    'LIST:',
    {
      list: [
        { lineId: 'li-1', text: '1½" PVC conduit — 400 ft' },
        { lineId: 'li-2', text: '1½" PVC male adapters — 60 ea' },
        { lineId: 'li-3', text: '#10 THHN stranded, black — 2500 ft' },
        { lineId: 'li-4', text: '4-11/16" square boxes, 2-1/8" deep — 45' },
        { lineId: 'li-5', text: '1-5/8" strut, 12 ga slotted — 240 ft' },
        { lineId: 'li-6', text: '3/8" strut clamps for 1½" conduit — 150' },
      ],
    },
    'Please quote delivered to the site, Gate 4. We need it on the ground by Thursday morning — if anything is short, let me know and we will pull it from another branch.',
    'Also: PO-88412 is open for this. Bill to the Wingate office as usual.',
    'Thanks,\nDana Whitfield\nProject Manager, Brightline Mechanical\n(713) 555-0142',
  ],
}

/** Pages of the attached takeoff PDF, rendered inline in the Document tab. */
export const documentPages = [
  {
    title: 'RIVERBEND TOWER — PHASE 2 ROUGH-IN TAKEOFF',
    meta: [
      ['Project', 'Riverbend Tower — Phase 2'],
      ['Prepared by', 'D. Whitfield'],
      ['Date', '09/04/2026'],
      ['PO', 'PO-88412'],
    ],
    rows: [
      { lineId: 'li-1', cells: ['1', '1-1/2" PVC conduit, sch 40, belled end', '400', 'FT'] },
      { lineId: 'li-2', cells: ['2', '1-1/2" PVC male adapter', '60', 'EA'] },
      { lineId: 'li-3', cells: ['3', '#10 THHN stranded copper, black', '2500', 'FT'] },
      { lineId: 'li-4', cells: ['4', '4-11/16" sq box, 2-1/8" deep, 1/2-3/4 KO', '45', 'EA'] },
      { lineId: 'li-5', cells: ['5', '1-5/8" strut, 12 ga, slotted, PG', '240', 'FT'] },
      { lineId: 'li-6', cells: ['6', '3/8" strut pipe clamp for 1-1/2" conduit', '150', 'EA'] },
    ],
    note: 'Deliver to Gate 4 laydown yard. Crane window 1:00p–4:00p. Partial shipments acceptable if noted on the packing slip.',
  },
]

/* ------------------------------------------------------------- line items */

export const lineItems = [
  {
    id: 'li-1',
    requested: '1½" PVC conduit x 400 ft',
    note: 'sch 40, belled end',
    selected: 'c-1a',
    roundedUp: true,
    candidates: [
      {
        id: 'c-1a',
        sku: 'PVC-40-150-B',
        description: 'Cantex 1-1/2 in. Schedule 40 PVC Conduit, Belled End, 10 ft length',
        thumb: 'conduit',
        uom: 'FT',
        avail: 1840,
        qty: 400,
        unitPrice: 1.42,
      },
      {
        id: 'c-1b',
        sku: 'PVC-40-150-P',
        description: 'Cantex 1-1/2 in. Schedule 40 PVC Conduit, Plain End, 10 ft length',
        thumb: 'conduit',
        uom: 'FT',
        avail: 620,
        qty: 400,
        unitPrice: 1.38,
      },
      {
        id: 'c-1c',
        sku: 'PVC-80-150-B',
        description: 'Cantex 1-1/2 in. Schedule 80 PVC Conduit, Belled End, 10 ft length',
        thumb: 'conduit',
        uom: 'FT',
        avail: 310,
        qty: 400,
        unitPrice: 2.61,
      },
      {
        id: 'c-1d',
        sku: 'PVC-40-150-B-EL',
        description: 'Eastern Lite 1-1/2 in. Sch 40 PVC Conduit, Belled End, 10 ft — house brand',
        thumb: 'conduit',
        uom: 'FT',
        avail: 2400,
        qty: 400,
        unitPrice: 1.19,
      },
      {
        id: 'c-1e',
        sku: 'EMT-150-10',
        description: 'Allied 1-1/2 in. EMT Conduit, galvanized steel, 10 ft length',
        thumb: 'conduit',
        uom: 'FT',
        avail: 980,
        qty: 400,
        unitPrice: 3.04,
      },
    ],
  },
  {
    id: 'li-2',
    requested: '1½" PVC male adapters x 60 ea',
    selected: 'c-2a',
    candidates: [
      {
        id: 'c-2a',
        sku: 'PVC-MA-150',
        description: 'Cantex 1-1/2 in. PVC Male Terminal Adapter, Schedule 40',
        thumb: 'coupling',
        uom: 'EA',
        avail: 412,
        qty: 60,
        unitPrice: 0.94,
      },
      {
        id: 'c-2b',
        sku: 'PVC-FA-150',
        description: 'Cantex 1-1/2 in. PVC Female Adapter, Schedule 40',
        thumb: 'coupling',
        uom: 'EA',
        avail: 388,
        qty: 60,
        unitPrice: 1.02,
      },
      {
        id: 'c-2c',
        sku: 'PVC-MA-150-STL',
        description: 'Steel City 1-1/2 in. PVC-to-Steel Male Adapter, zinc plated',
        thumb: 'coupling',
        uom: 'EA',
        avail: 96,
        qty: 60,
        unitPrice: 1.87,
      },
    ],
  },
  {
    id: 'li-3',
    requested: '#10 THHN stranded, black x 2500 ft',
    selected: 'c-3a',
    roundedUp: true,
    candidates: [
      {
        id: 'c-3a',
        sku: 'THHN-10-STR-BK',
        description: 'Southwire #10 AWG THHN/THWN-2 Stranded Copper, Black — 2500 ft reel',
        thumb: 'wire',
        uom: 'FT',
        avail: 7500,
        qty: 2500,
        unitPrice: 0.31,
      },
      {
        id: 'c-3b',
        sku: 'THHN-10-STR-BK-500',
        description: 'Southwire #10 AWG THHN/THWN-2 Stranded Copper, Black — 500 ft spool',
        thumb: 'wire',
        uom: 'FT',
        avail: 12000,
        qty: 2500,
        unitPrice: 0.36,
      },
      {
        id: 'c-3c',
        sku: 'THHN-10-SOL-BK',
        description: 'Southwire #10 AWG THHN Solid Copper, Black — 500 ft spool',
        thumb: 'wire',
        uom: 'FT',
        avail: 4000,
        qty: 2500,
        unitPrice: 0.28,
      },
    ],
  },
  {
    id: 'li-4',
    requested: '4-11/16" square boxes, 2-1/8" deep x 45',
    note: 'customer did not state knockout config',
    selected: null,
    candidates: [
      {
        id: 'c-4a',
        sku: 'BOX-4116-212-1234',
        description: 'RACO 4-11/16 in. Square Box, 2-1/8 in. deep, 1/2 & 3/4 in. KO, welded',
        thumb: 'box',
        uom: 'EA',
        avail: 240,
        qty: 45,
        unitPrice: 4.18,
      },
      {
        id: 'c-4b',
        sku: 'BOX-4116-212-34',
        description: 'RACO 4-11/16 in. Square Box, 2-1/8 in. deep, 3/4 in. KO only, welded',
        thumb: 'box',
        uom: 'EA',
        avail: 155,
        qty: 45,
        unitPrice: 4.02,
      },
      {
        id: 'c-4c',
        sku: 'BOX-4116-212-CG',
        description: 'Steel City 4-11/16 in. Square Box, 2-1/8 in. deep, drawn, 1/2-3/4 KO',
        thumb: 'box',
        uom: 'EA',
        avail: 88,
        qty: 45,
        unitPrice: 3.79,
      },
    ],
  },
  {
    id: 'li-5',
    requested: '1-5/8" strut, 12 ga slotted x 240 ft',
    selected: 'c-5a',
    candidates: [
      {
        id: 'c-5a',
        sku: 'STRUT-1625-12-SL-PG',
        description: 'Unistrut P1000T 1-5/8 in. x 1-5/8 in. 12 ga Slotted Strut, Pre-Galvanized, 10 ft',
        thumb: 'strut',
        uom: 'FT',
        avail: 960,
        qty: 240,
        unitPrice: 3.86,
      },
      {
        id: 'c-5b',
        sku: 'STRUT-1625-12-SL-HG',
        description: 'Unistrut P1000T 1-5/8 in. 12 ga Slotted Strut, Hot-Dip Galvanized, 10 ft',
        thumb: 'strut',
        uom: 'FT',
        avail: 300,
        qty: 240,
        unitPrice: 5.44,
      },
      {
        id: 'c-5c',
        sku: 'STRUT-1625-12-SOLID',
        description: 'Unistrut P1000 1-5/8 in. 12 ga Solid Strut, Pre-Galvanized, 10 ft',
        thumb: 'strut',
        uom: 'FT',
        avail: 1200,
        qty: 240,
        unitPrice: 3.71,
      },
    ],
  },
  {
    id: 'li-6',
    requested: '3/8" strut clamps for 1½" conduit x 150',
    note: 'ambiguous — clamp size vs. conduit size',
    selected: null,
    candidates: [
      {
        id: 'c-6a',
        sku: 'CLAMP-STRUT-150',
        description: 'Unistrut P1109 Universal Pipe Clamp for 1-1/2 in. rigid/IMC, electro-galv',
        thumb: 'clamp',
        uom: 'EA',
        avail: 74,
        qty: 150,
        unitPrice: 2.31,
      },
      {
        id: 'c-6b',
        sku: 'CLAMP-STRUT-150-PVC',
        description: 'Unistrut P2024 Pipe Clamp for 1-1/2 in. PVC conduit, with 3/8 in. hardware',
        thumb: 'clamp',
        uom: 'EA',
        avail: 260,
        qty: 150,
        unitPrice: 2.64,
      },
      {
        id: 'c-6c',
        sku: 'CLAMP-CONDUIT-150-2H',
        description: 'Two-hole strap, 1-1/2 in. conduit, zinc plated steel',
        thumb: 'clamp',
        uom: 'EA',
        avail: 1400,
        qty: 150,
        unitPrice: 0.62,
      },
    ],
  },
]

/** Extra candidates surfaced by "Show more" (ranks 4–10). */
export const moreCandidates = {
  'li-4': [
    {
      id: 'c-4d',
      sku: 'BOX-4116-212-EXT',
      description: 'RACO 4-11/16 in. Square Extension Ring, 2-1/8 in. deep',
      thumb: 'box',
      uom: 'EA',
      avail: 320,
      qty: 45,
      unitPrice: 3.44,
    },
    {
      id: 'c-4e',
      sku: 'BOX-4116-158-1234',
      description: 'RACO 4-11/16 in. Square Box, 1-1/2 in. deep, 1/2 & 3/4 in. KO',
      thumb: 'box',
      uom: 'EA',
      avail: 610,
      qty: 45,
      unitPrice: 3.28,
    },
    {
      id: 'c-4f',
      sku: 'BOX-4116-212-NM',
      description: 'Steel City 4-11/16 in. Square Box, 2-1/8 in. deep, NM cable clamps',
      thumb: 'box',
      uom: 'EA',
      avail: 46,
      qty: 45,
      unitPrice: 5.11,
    },
    {
      id: 'c-4g',
      sku: 'BOX-4116-212-SS',
      description: 'RACO 4-11/16 in. Square Box, 2-1/8 in. deep, 316 stainless',
      thumb: 'box',
      uom: 'EA',
      avail: 0,
      qty: 45,
      unitPrice: 19.4,
    },
  ],
  'li-6': [
    {
      id: 'c-6d',
      sku: 'CLAMP-STRUT-150-SS',
      description: 'Unistrut P1109 Pipe Clamp, 1-1/2 in., 304 stainless',
      thumb: 'clamp',
      uom: 'EA',
      avail: 40,
      qty: 150,
      unitPrice: 7.9,
    },
    {
      id: 'c-6e',
      sku: 'CLAMP-CUSH-150',
      description: 'Cush-a-Clamp 1-1/2 in. cushioned pipe clamp with 3/8 in. stud',
      thumb: 'clamp',
      uom: 'EA',
      avail: 520,
      qty: 150,
      unitPrice: 3.15,
    },
    {
      id: 'c-6f',
      sku: 'CLAMP-BEAM-38',
      description: '3/8 in. beam clamp, malleable iron, for threaded rod',
      thumb: 'clamp',
      uom: 'EA',
      avail: 880,
      qty: 150,
      unitPrice: 1.44,
    },
  ],
}

export const HELP = {
  contact:
    'The person we reply to and who receives the quote PDF. Auto-matched from the sender address on the inbound email — change it if someone else owns this job.',
  priceBranch:
    'Branch whose price list and contract pricing this order is quoted from. Usually the branch that owns the customer account.',
  shipBranch:
    'Branch that physically picks and ships the goods. Can differ from the price branch when stock is closer to the job site.',
  customerPO:
    'The customer’s own purchase order number. Printed on the quote, the packing slip, and the invoice.',
  orderNumber:
    'Assigned by the ERP the moment you create the quote or order. Shows “Pending” until then.',
  shipVia: 'How the goods travel. Drives freight terms and the promised delivery window.',
  avail: 'On-hand quantity at the ship branch right now, net of what is already committed to other orders.',
  qty: 'Quantity we will actually order. May be rounded up from the request to the next sellable multiple.',
  writer: 'The rep credited with this order in the ERP. Always the signed-in user.',
}
