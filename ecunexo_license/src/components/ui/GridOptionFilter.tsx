import { OptionGroup } from 'glubox'
import { useGluComponentSize } from '@/hooks/useGluComponentSize'

export type GridFilterOption = {
  readonly value: string
  readonly label: string
}

type GridOptionFilterProps = {
  readonly id: string
  readonly ariaLabel: string
  readonly value: string
  readonly options: readonly GridFilterOption[]
  readonly onChange: (value: string) => void
  readonly disabled?: boolean
}

export function GridOptionFilter({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
}: GridOptionFilterProps) {
  const size = useGluComponentSize()

  return (
    <div className="ecu-grid-filters" role="group" aria-label={ariaLabel}>
      <OptionGroup
        id={id}
        name={id}
        options={[...options]}
        value={value}
        onChange={onChange}
        layout="segmented"
        variant="outline"
        disabled={disabled}
        size={size}
      />
    </div>
  )
}
