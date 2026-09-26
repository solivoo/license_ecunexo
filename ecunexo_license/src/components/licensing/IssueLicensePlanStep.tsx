import type { ChangeEvent } from 'react'
import { FileText } from 'lucide-react'
import { NumberBox, Select } from 'glubox'
import type { useIssueLicenseForm } from '@/hooks/useIssueLicenseForm'

export type IssueLicensePlanStepProps = {
  readonly form: ReturnType<typeof useIssueLicenseForm>
  readonly planOptions: { value: string; label: string }[]
}

function parsePositiveInt(raw: string, fallback: number, max?: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  const truncated = Math.trunc(n)
  if (truncated < 1) return fallback
  if (max != null && truncated > max) return max
  return truncated
}

export function IssueLicensePlanStep({ form, planOptions }: IssueLicensePlanStepProps) {
  const plan = form.selectedPlan

  return (
    <section className="issue-license-subpanel">
      <h3 className="issue-license-subpanel__title">
        <FileText size={18} strokeWidth={1.75} aria-hidden />
        Plan y vigencia
      </h3>
      <p className="issue-license-subpanel__hint">
        El plan define módulos y cupos. La vigencia y la validación en línea son de esta emisión.
      </p>
      <div className="issue-license-field-grid issue-license-field-grid--2">
        <div className="issue-license-field-grid__full">
          <Select
            label="Plan comercial"
            labelPosition="outlined"
            variant="outline"
            options={planOptions}
            value={form.planCode}
            onChange={form.onPlanChange}
            placeholder="Seleccionar plan…"
            helperText={plan ? `Código: ${plan.code}` : undefined}
            fullWidth
            size="md"
            
          />
        </div>
        <NumberBox
          id="issue-license-validity"
          label="Vigencia (días)"
          labelPosition="outlined"
          variant="outline"
          min={1}
          step={1}
          showSpinButtons
          value={form.validityDays}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            form.setValidityDays(parsePositiveInt(e.target.value, 365))
          }
          helperText="Duración del contrato. 365 = un año."
          fullWidth
          size="md"
          
        />
        <NumberBox
          id="issue-license-online-validation"
          label="Validar en línea cada (días)"
          labelPosition="outlined"
          variant="outline"
          min={1}
          max={90}
          step={1}
          showSpinButtons
          value={form.onlineValidationIntervalDays}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            form.setOnlineValidationIntervalDays(parsePositiveInt(e.target.value, 30, 90))
          }
          helperText="El tenant consulta el estado en línea. Entre 1 y 90."
          fullWidth
          size="md"
          
        />
      </div>
    </section>
  )
}
