/**
 * The searchable item master behind the "Find Item" lookup.
 *
 * Stands in for the ERP's item table: every row a rep could put on a line,
 * whether or not the AI layer suggested it. `productType` is the ERP's own
 * stocking classification, which is what reps group and filter by most.
 *
 * The first rows deliberately share SKUs with the suggested matches in
 * `order.js`, so picking one out of the finder lines up with what the matching
 * engine already proposed.
 */

export const PRODUCT_TYPES = ['Stock', 'Non-Stock', 'Special Order', 'Direct Ship', 'Temporary']

const item = (itemId, description, productType, uom, avail, unitPrice, thumb) => ({
  itemId,
  description,
  productType,
  uom,
  avail,
  unitPrice,
  thumb,
})

export const catalog = [
  // ---- conduit -------------------------------------------------------------
  item('PVC-40-150-B', 'CANTEX 1-1/2" SCH 40 PVC CONDUIT BELLED END 10FT', 'Stock', 'FT', 1840, 1.42, 'conduit'),
  item('PVC-40-150-P', 'CANTEX 1-1/2" SCH 40 PVC CONDUIT PLAIN END 10FT', 'Stock', 'FT', 620, 1.38, 'conduit'),
  item('PVC-80-150-B', 'CANTEX 1-1/2" SCH 80 PVC CONDUIT BELLED END 10FT', 'Stock', 'FT', 310, 2.61, 'conduit'),
  item('PVC-40-150-B-EL', 'EASTERN LITE 1-1/2" SCH 40 PVC BELLED END 10FT', 'Stock', 'FT', 2400, 1.19, 'conduit'),
  item('PVC-40-200-B', 'CANTEX 2" SCH 40 PVC CONDUIT BELLED END 10FT', 'Stock', 'FT', 1560, 1.94, 'conduit'),
  item('PVC-40-075-B', 'CANTEX 3/4" SCH 40 PVC CONDUIT BELLED END 10FT', 'Stock', 'FT', 4200, 0.61, 'conduit'),
  item('EMT-150-10', 'ALLIED 1-1/2" EMT CONDUIT GALV STEEL 10FT', 'Stock', 'FT', 980, 3.04, 'conduit'),
  item('EMT-075-10', 'ALLIED 3/4" EMT CONDUIT GALV STEEL 10FT', 'Stock', 'FT', 6100, 1.12, 'conduit'),
  item('RGD-150-10', 'ALLIED 1-1/2" RIGID GALV CONDUIT THREADED 10FT', 'Non-Stock', 'FT', 240, 8.76, 'conduit'),
  item('RGD-200-10', 'ALLIED 2" RIGID GALV CONDUIT THREADED 10FT', 'Non-Stock', 'FT', 180, 11.4, 'conduit'),
  item('FMC-150-25', 'SOUTHWIRE 1-1/2" FLEX METAL CONDUIT 25FT COIL', 'Stock', 'FT', 750, 2.18, 'conduit'),

  // ---- fittings & adapters -------------------------------------------------
  item('PVC-MA-150', 'CANTEX 1-1/2" PVC MALE TERMINAL ADAPTER SCH 40', 'Stock', 'EA', 412, 0.94, 'coupling'),
  item('PVC-FA-150', 'CANTEX 1-1/2" PVC FEMALE ADAPTER SCH 40', 'Stock', 'EA', 388, 1.02, 'coupling'),
  item('PVC-MA-150-STL', 'STEEL CITY 1-1/2" PVC-TO-STEEL MALE ADAPTER ZINC', 'Non-Stock', 'EA', 96, 1.87, 'coupling'),
  item('PVC-CPL-150', 'CANTEX 1-1/2" PVC SLIP COUPLING SCH 40', 'Stock', 'EA', 1260, 0.71, 'coupling'),
  item('PVC-ELL-150-90', 'CANTEX 1-1/2" PVC 90 DEG ELBOW SCH 40 BELLED', 'Stock', 'EA', 540, 3.22, 'elbow'),
  item('PVC-ELL-150-45', 'CANTEX 1-1/2" PVC 45 DEG ELBOW SCH 40 BELLED', 'Stock', 'EA', 310, 3.08, 'elbow'),
  item('PVC-ELL-200-90', 'CANTEX 2" PVC 90 DEG ELBOW SCH 40 BELLED', 'Stock', 'EA', 265, 4.86, 'elbow'),
  item('EMT-CN-150-C', 'BRIDGEPORT 1-1/2" EMT COMPRESSION CONNECTOR STL', 'Stock', 'EA', 880, 2.44, 'connector'),
  item('EMT-CN-075-C', 'BRIDGEPORT 3/4" EMT COMPRESSION CONNECTOR STL', 'Stock', 'EA', 3400, 0.68, 'connector'),
  item('EMT-CPL-150-C', 'BRIDGEPORT 1-1/2" EMT COMPRESSION COUPLING STL', 'Stock', 'EA', 720, 2.92, 'coupling'),
  item('RGD-UNI-150', 'APPLETON 1-1/2" ERICKSON UNION RIGID CONDUIT', 'Special Order', 'EA', 0, 14.85, 'fitting'),

  // ---- wire & cable --------------------------------------------------------
  item('THHN-10-STR-BK', 'SOUTHWIRE #10 THHN/THWN-2 STR CU BLACK 2500FT REEL', 'Stock', 'FT', 7500, 0.31, 'wire'),
  item('THHN-10-STR-BK-500', 'SOUTHWIRE #10 THHN/THWN-2 STR CU BLACK 500FT SPOOL', 'Stock', 'FT', 12000, 0.36, 'wire'),
  item('THHN-10-SOL-BK', 'SOUTHWIRE #10 THHN SOLID CU BLACK 500FT SPOOL', 'Stock', 'FT', 4000, 0.28, 'wire'),
  item('THHN-12-STR-BK', 'SOUTHWIRE #12 THHN/THWN-2 STR CU BLACK 500FT SPOOL', 'Stock', 'FT', 18000, 0.19, 'wire'),
  item('THHN-12-STR-WH', 'SOUTHWIRE #12 THHN/THWN-2 STR CU WHITE 500FT SPOOL', 'Stock', 'FT', 15500, 0.19, 'wire'),
  item('THHN-08-STR-BK', 'SOUTHWIRE #8 THHN/THWN-2 STR CU BLACK 500FT SPOOL', 'Stock', 'FT', 6200, 0.54, 'wire'),
  item('MC-1223-250', 'AFC 12/2 MC CABLE STEEL ARMOR 250FT COIL', 'Stock', 'FT', 3750, 0.88, 'wire'),
  item('XHHW-350-BK', 'SOUTHWIRE 350 MCM XHHW-2 AL BLACK CUT LENGTH', 'Direct Ship', 'FT', 0, 4.12, 'wire'),

  // ---- boxes & enclosures --------------------------------------------------
  item('BOX-4116-212-1234', 'RACO 4-11/16" SQ BOX 2-1/8" DEEP 1/2-3/4 KO WELDED', 'Stock', 'EA', 240, 4.18, 'box'),
  item('BOX-4116-212-34', 'RACO 4-11/16" SQ BOX 2-1/8" DEEP 3/4 KO WELDED', 'Stock', 'EA', 155, 4.02, 'box'),
  item('BOX-4116-212-CG', 'STEEL CITY 4-11/16" SQ BOX 2-1/8" DEEP DRAWN', 'Non-Stock', 'EA', 88, 3.79, 'box'),
  item('BOX-4116-212-EXT', 'RACO 4-11/16" SQ EXTENSION RING 2-1/8" DEEP', 'Stock', 'EA', 320, 3.44, 'box'),
  item('BOX-4116-158-1234', 'RACO 4-11/16" SQ BOX 1-1/2" DEEP 1/2-3/4 KO', 'Stock', 'EA', 610, 3.28, 'box'),
  item('BOX-4116-212-SS', 'RACO 4-11/16" SQ BOX 2-1/8" DEEP 316 STAINLESS', 'Special Order', 'EA', 0, 19.4, 'box'),
  item('BOX-4S-212-1234', 'RACO 4" SQ BOX 2-1/8" DEEP 1/2-3/4 KO WELDED', 'Stock', 'EA', 1480, 2.36, 'box'),
  item('ENC-1210-4X', 'HOFFMAN 12X10X6 TYPE 4X ENCLOSURE 304 SS', 'Direct Ship', 'EA', 4, 412.0, 'box'),

  // ---- strut & hangers -----------------------------------------------------
  item('STRUT-1625-12-SL-PG', 'UNISTRUT P1000T 1-5/8" 12GA SLOTTED STRUT PG 10FT', 'Stock', 'FT', 960, 3.86, 'strut'),
  item('STRUT-1625-12-SL-HG', 'UNISTRUT P1000T 1-5/8" 12GA SLOTTED STRUT HDG 10FT', 'Non-Stock', 'FT', 300, 5.44, 'strut'),
  item('STRUT-1625-12-SOLID', 'UNISTRUT P1000 1-5/8" 12GA SOLID STRUT PG 10FT', 'Stock', 'FT', 1200, 3.71, 'strut'),
  item('CLAMP-STRUT-150', 'UNISTRUT P1109 UNIV PIPE CLAMP 1-1/2" RIGID EG', 'Stock', 'EA', 74, 2.31, 'clamp'),
  item('CLAMP-STRUT-150-PVC', 'UNISTRUT P2024 PIPE CLAMP 1-1/2" PVC W/ 3/8 HDW', 'Stock', 'EA', 260, 2.64, 'clamp'),
  item('CLAMP-CONDUIT-150-2H', 'TWO-HOLE STRAP 1-1/2" CONDUIT ZINC PLATED STEEL', 'Stock', 'EA', 1400, 0.62, 'clamp'),
  item('CLAMP-STRUT-150-SS', 'UNISTRUT P1109 PIPE CLAMP 1-1/2" 304 STAINLESS', 'Special Order', 'EA', 40, 7.9, 'clamp'),
  item('CLAMP-BEAM-38', '3/8" BEAM CLAMP MALLEABLE IRON FOR THREADED ROD', 'Stock', 'EA', 880, 1.44, 'clamp'),
  item('ROD-38-10', '3/8"-16 THREADED ROD ELECTRO-GALV 10FT', 'Stock', 'EA', 640, 6.15, 'strut'),

  // ---- gear ----------------------------------------------------------------
  item('QO-120', 'SQUARE D QO 20A 1P PLUG-ON BREAKER 120/240V', 'Stock', 'EA', 2200, 8.94, 'breaker'),
  item('QO-230', 'SQUARE D QO 30A 2P PLUG-ON BREAKER 120/240V', 'Stock', 'EA', 640, 24.6, 'breaker'),
  item('NQ-100-20', 'SQUARE D NQ 100A 20-SPACE MLO PANELBOARD INTERIOR', 'Direct Ship', 'EA', 6, 386.0, 'breaker'),
  item('DISC-60-3R', 'SQUARE D 60A 3R NON-FUSED SAFETY SWITCH 240V', 'Non-Stock', 'EA', 22, 118.5, 'breaker'),

  // ---- temporary / unclassified -------------------------------------------
  item('*TMP-CORDSET-50', '50FT 12/3 SJTW TEMP CORD SET LIGHTED END', 'Temporary', 'EA', 36, 62.4, 'wire'),
  item('*TMP-SPIDER-4G', 'TEMP POWER SPIDER BOX 4-GANG GFCI 50A FEED', 'Temporary', 'EA', 8, 498.0, 'box'),
  item('*TMP-STRINGER-100', '100FT TEMP LIGHTING STRINGER LED 10-LAMP', 'Temporary', 'EA', 14, 184.0, 'wire'),
]

/** Column contract for the Find Item grid. `bold` columns are searchable. */
export const CATALOG_COLUMNS = [
  { key: 'itemId', label: 'Item ID', bold: true, width: 'w-[20%]', mono: true },
  { key: 'description', label: 'Item Description', bold: true, width: 'w-[33%]' },
  { key: 'productType', label: 'Product Type', width: 'w-[14%]' },
  { key: 'uom', label: 'UoM', width: 'w-[8%]', align: 'center' },
  { key: 'avail', label: 'Avail', width: 'w-[11%]', align: 'right', numeric: true },
  // Wide enough for the header plus its kebab; narrower and it elides to "Unit …".
  { key: 'unitPrice', label: 'Unit Price', width: 'w-[14%]', align: 'right', numeric: true, money: true },
]

/** The operator set the ERP's finder offers, in its order. */
export const OPERATORS = [
  { key: 'contains', label: 'Contains' },
  { key: 'notContains', label: 'Does not contain' },
  { key: 'eq', label: 'Is equal to' },
  { key: 'neq', label: 'Is not equal to' },
  { key: 'startsWith', label: 'Starts with' },
  { key: 'endsWith', label: 'Ends with' },
  { key: 'null', label: 'Is null' },
  { key: 'notNull', label: 'Is not null' },
]

/** Operators that ignore whatever is typed in the box. */
export const VALUELESS_OPERATORS = new Set(['null', 'notNull'])

/** Apply one operator to one cell. Mirrors the ERP's case-insensitive match. */
export function matches(cell, operator, term) {
  const empty = cell === null || cell === undefined || String(cell).trim() === ''
  if (operator === 'null') return empty
  if (operator === 'notNull') return !empty
  if (!term) return true

  const a = String(cell ?? '').toLowerCase()
  const b = String(term).toLowerCase()
  switch (operator) {
    case 'contains':
      return a.includes(b)
    case 'notContains':
      return !a.includes(b)
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'startsWith':
      return a.startsWith(b)
    case 'endsWith':
      return a.endsWith(b)
    default:
      return true
  }
}
