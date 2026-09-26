export const GRID_LOOKBACK_IDS = ['1m', '3m', '6m', '1y'] as const
export type GridLookback = (typeof GRID_LOOKBACK_IDS)[number]

export const DEFAULT_GRID_LOOKBACK: GridLookback = '1y'

export function isGridLookback(value: unknown): value is GridLookback {
  return typeof value === 'string' && (GRID_LOOKBACK_IDS as readonly string[]).includes(value)
}

const LOOKBACK_MONTHS: Record<GridLookback, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1y': 12,
}

export type IsoDateRange = {
  readonly from: string
  readonly to: string
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addCalendarMonths(date: Date, months: number): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate()
  const day = Math.min(date.getDate(), lastDay)
  return new Date(date.getFullYear(), date.getMonth() + months, day)
}

export function rangeFromLookback(
  lookback: GridLookback,
  now: Date = new Date(),
): IsoDateRange {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = addCalendarMonths(to, -LOOKBACK_MONTHS[lookback])
  return { from: toIsoDate(from), to: toIsoDate(to) }
}
