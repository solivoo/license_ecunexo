import { RangeDateBox, type DateRange } from 'glubox'
import { useGluComponentSize } from '@/hooks/useGluComponentSize'
import {
  DEFAULT_GRID_LOOKBACK,
  rangeFromLookback,
  toIsoDate,
  type IsoDateRange,
} from '@/lib/gridLookback'

type GridDateRangeBoxProps = {
  readonly from: string
  readonly to: string
  readonly disabled?: boolean
  readonly onChange: (range: IsoDateRange) => void
}

export function GridDateRangeBox({
  from,
  to,
  disabled = false,
  onChange,
}: GridDateRangeBoxProps) {
  const size = useGluComponentSize()
  const today = toIsoDate(new Date())

  return (
    <div className="ecu-grid-date-range" role="group" aria-label="Rango de fechas">
      <RangeDateBox
        variant="outline"
        size={size}
        startValue={from}
        endValue={to}
        max={today}
        width="18rem"
        separator="–"
        disabled={disabled}
        onChange={(next: DateRange) => {
          if (!next.start || !next.end) {
            onChange(rangeFromLookback(DEFAULT_GRID_LOOKBACK))
            return
          }
          onChange({ from: next.start, to: next.end })
        }}
      />
    </div>
  )
}
