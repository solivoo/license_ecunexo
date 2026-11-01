import type { ChangeEvent } from 'react'
import { FileText, LayoutGrid } from 'lucide-react'
import { NumberBox, Select } from 'glubox'
import { PlanModuleConfigurator } from '@/components/licensing/PlanModuleConfigurator'
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
    <div className="issue-license-panel">
      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <FileText size={18} strokeWidth={1.75} aria-hidden />
          Plan comercial, vigencia y empresas de la licencia
        </h3>
        <p className="issue-license-subpanel__hint">
          Selecciona un plan comercial como plantilla inicial. La vigencia, el número de empresas y las cuotas de cada módulo (usuarios en Identidad, bodegas en Bodegas, SKUs en Inventario, etc.) se pueden personalizar abajo sin alterar el catálogo general de planes.
        </p>
        <div className="issue-license-form-grid">
          <Select
            label="Plan comercial base"
            labelPosition="outlined"
            variant="outline"
            options={planOptions}
            value={form.planCode}
            onChange={form.onPlanChange}
            placeholder="Seleccionar plan…"
            helperText={
              plan
                ? `Plantilla seleccionada: ${plan.displayName} (${plan.code})`
                : undefined
            }
            fullWidth
            size="md"
          />
          <NumberBox
            id="issue-license-max-tenants"
            label="Empresas permitidas"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={form.maxTenants}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              form.setMaxTenants(parsePositiveInt(e.target.value, 1))
            }
            helperText="Empresas (tenants) que puede registrar con esta licencia."
            fullWidth
            size="md"
          />
          <NumberBox
            id="issue-license-validity"
            label="Vigencia del contrato (días)"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={form.validityDays}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              form.setValidityDays(parsePositiveInt(e.target.value, 365))
            }
            helperText="Duración de la licencia desde su emisión (365 = 1 año)."
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
            helperText="Frecuencia con la que el tenant verifica estado en línea (1 a 90 días)."
            fullWidth
            size="md"
          />
        </div>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
          Módulos habilitados y límites por módulo
        </h3>
        <p className="issue-license-subpanel__hint">
          Configura los módulos incluidos y sus cuotas operativas directamente en cada tarjeta (por ejemplo usuarios en Identidad, bodegas en Bodegas o SKUs en Inventario).
        </p>
        <PlanModuleConfigurator
          selectedModules={form.selectedModules}
          onChangeModules={form.setSelectedModules}
          limits={form.editLimits}
          onChangeLimit={form.setLimit}
        />
      </section>
    </div>
  )
}
