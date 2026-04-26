/**
 * Bucket classification + package auto-computation for Auto-Ship.
 *
 * Buckets:
 *   No-BYB:    1-prod, 2-prod, 3-prod, 4-prod, 5-prod, 6-prod, 7+prod
 *   BYB Quart: BYB_4, BYB_6, BYB_8, BYB_12   (SKU pattern: BYB_<n>)
 *   BYB Half:  BYB2, BYB4, BYB6              (SKU pattern: BYB<n>, no underscore)
 *   Manual:    mixto (BYB + suelto, o múltiples BYB), revisar (no clasificable)
 *
 * Per-jar weight (lb): Quart=2, Half Gallon=4, Gallon=8.
 */

export type BucketKey =
  | '1-prod' | '2-prod' | '3-prod' | '4-prod' | '5-prod' | '6-prod' | '7+prod'
  | 'BYB_4' | 'BYB_6' | 'BYB_8' | 'BYB_12'
  | 'BYB2' | 'BYB4' | 'BYB6'
  | 'mixto' | 'revisar'

export interface BucketOrderItem {
  name?: string
  sku?: string
  quantity?: number
  variant_title?: string
}

export interface BucketOrder {
  items?: BucketOrderItem[]
}

export interface PackageDims {
  weight: number
  length: number
  width: number
  height: number
}

const WEIGHT = { quart: 2, halfGallon: 4, gallon: 8 } as const

type BybInfo =
  | { isByb: false }
  | { isByb: true; size: number; jar: 'quart' | 'halfGallon' }

export function detectBYB(sku?: string): BybInfo {
  if (!sku) return { isByb: false }
  const s = sku.trim()
  // Quart: BYB_4, BYB_6, BYB_8, BYB_12
  const m1 = s.match(/^BYB_(\d+)$/i)
  if (m1) return { isByb: true, size: parseInt(m1[1], 10), jar: 'quart' }
  // Half Gallon: BYB2, BYB4, BYB6 (no underscore)
  const m2 = s.match(/^BYB(\d+)$/i)
  if (m2) return { isByb: true, size: parseInt(m2[1], 10), jar: 'halfGallon' }
  return { isByb: false }
}

export type JarSize = 'quart' | 'halfGallon' | 'gallon' | 'unknown'

export function detectJarSize(item: BucketOrderItem): JarSize {
  const text = `${item.variant_title || ''} ${item.name || ''}`.toLowerCase()
  if (/half[-\s]?gallon|1\/2[-\s]?gallon|half[-\s]?gal\b/.test(text)) return 'halfGallon'
  if (/\bgallon\b/.test(text)) return 'gallon'
  if (/\bquart\b/.test(text)) return 'quart'
  return 'unknown'
}

export function classifyOrder(order: BucketOrder): BucketKey {
  const items = order.items || []
  if (items.length === 0) return 'revisar'

  const bybs = items
    .map(it => ({ item: it, byb: detectBYB(it.sku) }))
    .filter(x => x.byb.isByb) as Array<{ item: BucketOrderItem; byb: Extract<BybInfo, { isByb: true }> }>

  // BYB orders
  if (bybs.length > 0) {
    // Mixed: BYB + non-BYB items, or multiple BYBs in same order
    if (bybs.length !== items.length) return 'mixto'
    if (bybs.length > 1) return 'mixto'

    const { size, jar } = bybs[0].byb
    if (jar === 'quart' && [4, 6, 8, 12].includes(size)) return `BYB_${size}` as BucketKey
    if (jar === 'halfGallon' && [2, 4, 6].includes(size)) return `BYB${size}` as BucketKey
    return 'revisar'
  }

  // No-BYB: classify by line item count
  const n = items.length
  if (n === 1) return '1-prod'
  if (n === 2) return '2-prod'
  if (n === 3) return '3-prod'
  if (n === 4) return '4-prod'
  if (n === 5) return '5-prod'
  if (n === 6) return '6-prod'
  return '7+prod'
}

// Fixed box per BYB SKU (validated with user)
const BYB_BOX: Record<string, { length: number; width: number; height: number }> = {
  BYB_4:  { length: 8,  width: 8,  height: 8  },
  BYB_6:  { length: 9,  width: 9,  height: 9  },
  BYB_8:  { length: 9,  width: 9,  height: 9  },
  BYB_12: { length: 10, width: 10, height: 10 },
  BYB2:   { length: 9,  width: 9,  height: 9  },
  BYB4:   { length: 10, width: 10, height: 10 },
  BYB6:   { length: 10, width: 10, height: 10 },
}

/**
 * Smart box rule for non-BYB orders:
 *   - Any Gallon       → 10x10x10
 *   - Any Half Gallon  → 9x9x9 (or 10x10x10 if peso > 16)
 *   - Solo Quart:
 *       ≤ 2 lb  → 7x7x7
 *       3–8 lb  → 8x8x8
 *       9–16 lb → 9x9x9
 *       > 16 lb → 10x10x10
 */
export function computePackage(order: BucketOrder): PackageDims {
  const bucket = classifyOrder(order)
  const items = order.items || []

  // BYB: peso = jars × per-jar; caja = tabla fija
  if (bucket in BYB_BOX) {
    const isQuart = bucket.startsWith('BYB_')
    const size = parseInt(bucket.replace(isQuart ? 'BYB_' : 'BYB', ''), 10)
    const perJar = isQuart ? WEIGHT.quart : WEIGHT.halfGallon
    return { weight: size * perJar, ...BYB_BOX[bucket] }
  }

  // Non-BYB: sumar peso por items
  let weight = 0
  let hasGallon = false
  let hasHalfGallon = false
  for (const it of items) {
    const qty = Math.max(1, it.quantity || 1)
    const jar = detectJarSize(it)
    if (jar === 'gallon') { weight += qty * WEIGHT.gallon; hasGallon = true }
    else if (jar === 'halfGallon') { weight += qty * WEIGHT.halfGallon; hasHalfGallon = true }
    else { weight += qty * WEIGHT.quart } // unknown → asume Quart (más común)
  }
  weight = Math.max(1, weight)

  let box: { length: number; width: number; height: number }
  if (hasGallon) box = { length: 10, width: 10, height: 10 }
  else if (hasHalfGallon) box = weight > 16 ? { length: 10, width: 10, height: 10 } : { length: 9, width: 9, height: 9 }
  else if (weight <= 2) box = { length: 7, width: 7, height: 7 }
  else if (weight <= 8) box = { length: 8, width: 8, height: 8 }
  else if (weight <= 16) box = { length: 9, width: 9, height: 9 }
  else box = { length: 10, width: 10, height: 10 }

  return { weight, ...box }
}

export interface BucketInfo {
  label: string
  short: string
  group: 'no-byb' | 'byb-quart' | 'byb-half' | 'manual'
  autoShip: boolean
  // Tailwind class fragments
  chip: string
  chipActive: string
}

export const BUCKETS: Record<BucketKey, BucketInfo> = {
  '1-prod': { label: '1 producto',   short: '1-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '2-prod': { label: '2 productos',  short: '2-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '3-prod': { label: '3 productos',  short: '3-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '4-prod': { label: '4 productos',  short: '4-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '5-prod': { label: '5 productos',  short: '5-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '6-prod': { label: '6 productos',  short: '6-prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  '7+prod': { label: '7+ productos', short: '7+prod', group: 'no-byb', autoShip: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    chipActive: 'bg-blue-600 text-white border-blue-600' },
  'BYB_4':  { label: 'BYB_4 Quart',  short: 'BYB_4',  group: 'byb-quart', autoShip: true,
    chip: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    chipActive: 'bg-purple-600 text-white border-purple-600' },
  'BYB_6':  { label: 'BYB_6 Quart',  short: 'BYB_6',  group: 'byb-quart', autoShip: true,
    chip: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    chipActive: 'bg-purple-600 text-white border-purple-600' },
  'BYB_8':  { label: 'BYB_8 Quart',  short: 'BYB_8',  group: 'byb-quart', autoShip: true,
    chip: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    chipActive: 'bg-purple-600 text-white border-purple-600' },
  'BYB_12': { label: 'BYB_12 Quart', short: 'BYB_12', group: 'byb-quart', autoShip: true,
    chip: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    chipActive: 'bg-purple-600 text-white border-purple-600' },
  'BYB2':   { label: 'BYB2 Half Gal',short: 'BYB2',   group: 'byb-half',  autoShip: true,
    chip: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    chipActive: 'bg-pink-600 text-white border-pink-600' },
  'BYB4':   { label: 'BYB4 Half Gal',short: 'BYB4',   group: 'byb-half',  autoShip: true,
    chip: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    chipActive: 'bg-pink-600 text-white border-pink-600' },
  'BYB6':   { label: 'BYB6 Half Gal',short: 'BYB6',   group: 'byb-half',  autoShip: true,
    chip: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    chipActive: 'bg-pink-600 text-white border-pink-600' },
  'mixto':  { label: 'Mixto',        short: 'Mixto',  group: 'manual', autoShip: false,
    chip: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    chipActive: 'bg-amber-600 text-white border-amber-600' },
  'revisar':{ label: 'Revisar',      short: 'Revisar',group: 'manual', autoShip: false,
    chip: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    chipActive: 'bg-gray-600 text-white border-gray-600' },
}

export const BUCKET_ORDER: BucketKey[] = [
  '1-prod', '2-prod', '3-prod', '4-prod', '5-prod', '6-prod', '7+prod',
  'BYB_4', 'BYB_6', 'BYB_8', 'BYB_12',
  'BYB2', 'BYB4', 'BYB6',
  'mixto', 'revisar',
]

export function applyAutoPackage<T extends BucketOrder & { package?: PackageDims }>(order: T): T {
  return { ...order, package: computePackage(order) }
}
