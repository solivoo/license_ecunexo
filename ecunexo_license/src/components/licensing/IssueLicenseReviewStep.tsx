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
  const modules = form.selectedModules
  const hasWarehousing = modules.includes('warehousing')
  const userQuota = form.editLimits['identity']?.max_users || String(form.maxUsers)
  const warehouseQuota = form.editLimits['warehousing']?.max_warehouses || String(form.maxWarehouses)

  return (
    <div className="issue-license-panel">
      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">Resumen de la licencia a emitir</h3>
        <p className="issue-license-subpanel__hint">
          Confirma las condiciones comerciales y técnicas que quedarán firmadas criptográficamente en el artefacto de este cliente.
        </p>
        <dl className="issue-license-review issue-license-review--4">
          <div>
            <dt>Cliente comercial</dt>
            <dd>{form.customerLabel || '—'}</dd>
          </div>
          <div>
            <dt>Plan base</dt>
            <dd>{plan?.displayName ?? '—'}</dd>
          </div>
          <div>
            <dt>Vigencia contratada</dt>
            <dd>{form.validityDays} días</dd>
          </div>
          <div>
            <dt>Sincronización en línea</dt>
            <dd>Cada {form.onlineValidationIntervalDays} días</dd>
          </div>
        </dl>
        <div className="ecu-plan-summary-grid ecu-plan-summary-grid--4">
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Empresas permitidas</span>
            <span className="ecu-plan-summary-item__value">{form.maxTenants}</span>
          </div>
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Usuarios (Identidad)</span>
            <span className="ecu-plan-summary-item__value">{userQuota}</span>
          </div>
          {hasWarehousing ? (
            <div className="ecu-plan-summary-item">
              <span className="ecu-plan-summary-item__label">Bodegas habilitadas</span>
              <span className="ecu-plan-summary-item__value">{warehouseQuota}</span>
            </div>
          ) : null}
          <div className="ecu-plan-summary-item">
            <span className="ecu-plan-summary-item__label">Módulos activos</span>
            <span className="ecu-plan-summary-item__value">{modules.length}</span>
          </div>
        </div>
        <h4 className="ecu-plan-summary-subtitle">Módulos incluidos en esta licencia</h4>
        <ul className="ecu-plan-summary-modules ecu-plan-summary-modules--4">
          {modules.map((code) => (
            <li key={code} className="ecu-plan-summary-module">
              <span className="ecu-plan-summary-module__name">{moduleLabel(code)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">Cuenta del titular (administrador inicial)</h3>
        <p className="issue-license-subpanel__hint">
          Define las credenciales del propietario de la cuenta. Al emitir, obtendrás el código de activación y el archivo firmado para entregarle por correo o carga directa.
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
