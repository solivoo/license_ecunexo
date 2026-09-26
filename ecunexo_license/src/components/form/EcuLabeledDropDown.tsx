import { Select } from 'glubox'

export type EcuDropDownOption = {
  readonly text: string
  readonly value: string
}

export type EcuLabeledDropDownProps = {
  readonly id: string
  readonly label: string
  readonly dataSource: EcuDropDownOption[]
  readonly value: string
  readonly onChange: (value: string) => void
  readonly disabled?: boolean
  readonly hint?: string
}

export function EcuLabeledDropDown({
  id,
  label,
  dataSource,
  value,
  onChange,
  disabled,
  hint,
}: EcuLabeledDropDownProps) {
  const options = dataSource.map((item) => ({ label: item.text, value: item.value }))

  return (
    <div className="ecu-glu-select-field">
      <Select
        id={id}
        label={label}
        labelPosition="outlined"
        variant="outline"
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        helperText={hint}
        fullWidth
        size="md"
        
      />
    </div>
  )
}
