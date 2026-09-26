import { type ChangeEvent } from 'react'
import { TextArea, TextBox } from 'glubox'
import { TENANT_MODULE_OPTIONS } from '@/constants/tenantModules'
import type { useIssueLicenseForm } from '@/hooks/useIssueLicenseForm'

export type IssueLicenseReviewStepProps = {
  readonly form: ReturnType<typeof useIssueLicenseForm>
}

function moduleLabel(code: string): string {
  return TENANT_MODULE_OPTIONS.find((m) => m.code === code)?.label ?? code
}

export function IssueLicenseReviewStep({ form }: IssueLicenseReviewStepProps) {
  const plan = form.selectedPlan
  const modules = plan?.enabledModuleCodesDefault ?? form.selectedModules

  return (
    <div className="issue-license-panel">
      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">Resumen para emitir</h3>
        <dl className="issue-license-review issue-license-review--4">
          <div>
            <dt>Cliente</dt>
            <dd>{form.customerLabel || '—'}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>{plan?.displayName ?? '—'}</dd>
          </div>
          <div>
            <dt>Vigencia</dt>
            <dd>{form.validityDays} días</dd>
          </div>
          <div>
            <dt>Validación en línea</dt>
            <dd>Cada {form.onlineValidationIntervalDays} días</dd>
          </div>
        </dl>
        <div className="ecu-plan-summary-grid ecu-plan-summary-grid--4">
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Empresas</span>
            <span className="ecu-plan-summary-item__value">{form.maxTenants}</span>
          </div>
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Usuarios</span>
            <span className="ecu-plan-summary-item__value">{form.maxUsers}</span>
          </div>
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Bodegas</span>
            <span className="ecu-plan-summary-item__value">{form.maxWarehouses}</span>
          </div>
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Módulos</span>
            <span className="ecu-plan-summary-item__value">{modules.length}</span>
          </div>
        </div>
        <h4 className="ecu-plan-summary-subtitle">Módulos</h4>
        <ul className="ecu-plan-summary-modules ecu-plan-summary-modules--4">
          {modules.map((code) => (
            <li key={code} className="ecu-plan-summary-module">
              <span className="ecu-plan-summary-module__name">{moduleLabel(code)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">Titular que activará en Admin</h3>
        <p className="issue-license-subpanel__hint">
          Correo, nombre y contraseña inicial (con confirmación). Las empresas se crean después.
        </p>
        <div className="issue-license-field-grid issue-license-field-grid--4">
          <TextBox
            id="issue-license-owner-email"
            label="Correo del titular"
            labelPosition="outlined"
            variant="outline"
            type="email"
            value={form.ownerEmail}
            onChange={(e: ChangeEvent<HTMLInputElement>) => form.setOwnerEmail(e.target.value)}
            placeholder="titular@empresa.com"
            autoComplete="email"
            required
            fullWidth
            size="md"
            
          />
          <TextBox
            id="issue-license-owner-name"
            label="Nombre del titular"
            labelPosition="outlined"
            variant="outline"
            value={form.ownerName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => form.setOwnerName(e.target.value)}
            placeholder="Ej. María Pérez"
            required
            fullWidth
            size="md"
            
          />
          <TextBox
            id="issue-license-owner-password"
            label="Contraseña inicial"
            labelPosition="outlined"
            variant="outline"
            type="password"
            value={form.ownerPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) => form.setOwnerPassword(e.target.value)}
            placeholder="Mín. 8 caracteres"
            autoComplete="new-password"
            required
            fullWidth
            
          />
          <TextBox
            id="issue-license-owner-password-confirm"
            label="Confirmar contraseña"
            labelPosition="outlined"
            variant="outline"
            type="password"
            value={form.ownerPasswordConfirm}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              form.setOwnerPasswordConfirm(e.target.value)
            }
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            required
            fullWidth
            
          />
        </div>
      </section>

      <section className="issue-license-subpanel">
        <TextArea
          id="issue-license-notes"
          label="Notas internas (opcional)"
          labelPosition="outlined"
          variant="outline"
          value={form.notes}
          rows={3}
          resize="vertical"
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => form.setNotes(e.target.value)}
          placeholder="No se incluyen en el paquete al cliente"
          fullWidth
          size="md"
          
        />
      </section>
    </div>
  )
}
