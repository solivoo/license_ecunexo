import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { NumberBox, Popup, Select, useToast } from 'glubox'
import { ModulePickerGrid } from '@/components/licensing/ModulePickerGrid'
import { ensureIdentityModule, moduleLabels } from '@/constants/tenantModules'
import { formatDateTime } from '@/lib/formatDate'
import {
  listPlans,
  type LicenseListItem,
  type PlanListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import '@/pages/licensing/licensesGrid.css'

export type ReissueLicensePayload = {
  planCode: string
  validityDays: number
  maxUsersOverride: number
  maxWarehousesOverride: number
  maxTenantsOverride: number
  enabledModuleCodesOverride: string[]
}

export type ExpandLicenseDialogProps = {
  readonly open: boolean
  readonly license: LicenseListItem | null
  readonly busy?: boolean
  readonly onClose: () => void
  readonly onConfirm: (payload: ReissueLicensePayload) => void
}

function statusLabel(status: string): string {
  if (status === 'Active') return 'Activa'
  if (status === 'Exhausted') return 'Cupo agotado'
  if (status === 'Revoked') return 'Revocada'
  return status
}

export function ExpandLicenseDialog({
  open,
  license,
  busy = false,
  onClose,
  onConfirm,
}: ExpandLicenseDialogProps) {
  const toast = useToast()
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [planCode, setPlanCode] = useState('')
  const [maxUsers, setMaxUsers] = useState(5)
  const [maxWarehouses, setMaxWarehouses] = useState(1)
  const [maxTenants, setMaxTenants] = useState(1)
  const [validityDays, setValidityDays] = useState(365)
  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const current = license?.planCode ?? ''
    setPlanCode(current)
    setMaxUsers(license?.maxUsers ?? 5)
    setMaxWarehouses(license?.maxWarehouses ?? 1)
    setMaxTenants(license?.maxTenants ?? 1)
    setValidityDays(365)
    if (license?.enabledModuleCodes && license.enabledModuleCodes.length > 0) {
      setSelectedModules(ensureIdentityModule(license.enabledModuleCodes))
    }

    listPlans(true)
      .then((rows) => {
        if (cancelled) return
        const hasCurrent = current.length > 0 && rows.some((p) => p.code === current)
        const nextPlans =
          hasCurrent || !license
            ? rows
            : [
                {
                  code: license.planCode,
                  displayName: license.planLabel,
                  maxTenantsDefault: license.maxTenants ?? 1,
                  maxUsersDefault: license.maxUsers ?? 5,
                  maxWarehousesDefault: license.maxWarehouses ?? 1,
                  enabledModuleCodesDefault: license.enabledModuleCodes ?? [],
                  isActive: true,
                },
                ...rows,
              ]
        setPlans(nextPlans)
        setPlanCode(current)
        const activePlan = nextPlans.find((p) => p.code === current)
        if (activePlan) {
          if (!license?.maxUsers && activePlan.maxUsersDefault) {
            setMaxUsers(activePlan.maxUsersDefault)
          }
          if (!license?.maxWarehouses && activePlan.maxWarehousesDefault) {
            setMaxWarehouses(activePlan.maxWarehousesDefault)
          }
          if (!license?.maxTenants && activePlan.maxTenantsDefault) {
            setMaxTenants(activePlan.maxTenantsDefault)
          }
          if ((!license?.enabledModuleCodes || license.enabledModuleCodes.length === 0) && activePlan.enabledModuleCodesDefault) {
            setSelectedModules(ensureIdentityModule(activePlan.enabledModuleCodesDefault))
          }
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = readApiError(err, 'No se pudieron cargar los planes.')
        toast.show({ title: 'Error de carga', message: msg, variant: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [open, license, toast])

  const planOptions = useMemo(() => {
    const currentCode = license?.planCode ?? ''
    const currentLabel = license?.planLabel ?? ''
    return plans.map((p) => ({
      label:
        p.code === currentCode
          ? `${currentLabel || p.displayName} (actual)`
          : p.displayName,
      value: p.code,
    }))
  }, [license?.planCode, license?.planLabel, plans])

  const selectedPlan = plans.find((p) => p.code === planCode) ?? null
  const modulesHint = selectedPlan
    ? moduleLabels(selectedPlan.enabledModuleCodesDefault)
    : '—'
  const catalogNameDiffers =
    license != null &&
    selectedPlan != null &&
    planCode === license.planCode &&
    selectedPlan.displayName !== license.planLabel

  const helperText = selectedPlan
    ? catalogNameDiffers
      ? `En el catálogo este código es «${selectedPlan.displayName}» (${modulesHint}).`
      : planCode === license?.planCode
        ? 'Plan actual. Puedes ajustar cupos o módulos solo para este cliente sin alterar el catálogo.'
        : `Por defecto incluye: ${modulesHint}`
    : undefined

  const handlePlanChange = useCallback((nextCode: string) => {
    setPlanCode(nextCode)
    const target = plans.find((p) => p.code === nextCode)
    if (target) {
      setMaxUsers(target.maxUsersDefault)
      setMaxWarehouses(target.maxWarehousesDefault)
      setMaxTenants(target.maxTenantsDefault)
      setSelectedModules(ensureIdentityModule(target.enabledModuleCodesDefault))
    }
  }, [plans])

  const handleClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const handleConfirm = useCallback(() => {
    if (busy || planCode.length === 0) return
    onConfirm({
      planCode,
      validityDays: Math.max(1, validityDays),
      maxUsersOverride: Math.max(1, maxUsers),
      maxWarehousesOverride: Math.max(1, maxWarehouses),
      maxTenantsOverride: Math.max(1, maxTenants),
      enabledModuleCodesOverride: ensureIdentityModule(selectedModules),
    })
  }, [busy, maxTenants, maxUsers, maxWarehouses, onConfirm, planCode, selectedModules, validityDays])

  return (
    <Popup
      open={open}
      onClose={handleClose}
      title="Renovar o Modificar licencia"
      width="min(94vw, 42rem)"
      actions={[
        {
          id: 'cancel',
          label: 'Cancelar',
          variant: 'ghost' as const,
          onClick: handleClose,
          disabled: busy,
        },
        {
          id: 'expand',
          label: busy ? 'Procesando…' : 'Reemitir licencia',
          variant: 'primary' as const,
          onClick: handleConfirm,
          disabled: busy || planCode.length === 0 || plans.length === 0 || selectedModules.length === 0,
        },
      ]}
    >
      <div className="ecu-dialog-form ecu-dialog-form--glu expand-license-dialog">
        {license ? (
          <dl className="expand-license-dialog__meta">
            <div>
              <dt>Cliente</dt>
              <dd>
                {license.customerLegalName}
                {license.customerTradeName ? ` (${license.customerTradeName})` : ''}
              </dd>
            </div>
            <div>
              <dt>Titular</dt>
              <dd>{license.ownerEmail ?? '—'}</dd>
            </div>
            <div>
              <dt>Plan actual</dt>
              <dd>
                {license.planLabel} · {statusLabel(license.status)} · vence{' '}
                {formatDateTime(license.expiresAtUtc)}
              </dd>
            </div>
          </dl>
        ) : null}

        <p className="expand-license-dialog__lead">
          Reemite la licencia con vigencia y cupos actualizados. Se conserva el titular del cliente y
          los cambios se aplican automáticamente en línea o mediante el archivo descargado.
        </p>

        <Select
          label="Plan base"
          labelPosition="outlined"
          variant="outline"
          options={planOptions}
          value={planCode}
          onChange={handlePlanChange}
          placeholder="Seleccionar plan…"
          helperText={helperText}
          disabled={busy || plans.length === 0}
          fullWidth
          size="md"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
          <NumberBox
            id="reissue-max-users"
            label="Máx. Usuarios"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={maxUsers}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxUsers(Math.max(1, Number(e.target.value) || 1))}
            helperText="Cupo para este cliente."
            fullWidth
            size="md"
          />
          <NumberBox
            id="reissue-max-warehouses"
            label="Máx. Bodegas"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={maxWarehouses}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxWarehouses(Math.max(1, Number(e.target.value) || 1))}
            helperText="Bodegas permitidas."
            fullWidth
            size="md"
          />
          <NumberBox
            id="reissue-max-tenants"
            label="Máx. Empresas"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={maxTenants}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxTenants(Math.max(1, Number(e.target.value) || 1))}
            helperText="Empresas/tenants."
            fullWidth
            size="md"
          />
          <NumberBox
            id="reissue-validity"
            label="Vigencia (días)"
            labelPosition="outlined"
            variant="outline"
            min={1}
            step={1}
            showSpinButtons
            value={validityDays}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValidityDays(Math.max(1, Number(e.target.value) || 365))}
            helperText="365 = 1 año."
            fullWidth
            size="md"
          />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Módulos habilitados ({selectedModules.length})</span>
            {selectedPlan ? (
              <button
                type="button"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary, #3b82f6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
                onClick={() => setSelectedModules(ensureIdentityModule(selectedPlan.enabledModuleCodesDefault))}
              >
                Restablecer a plan
              </button>
            ) : null}
          </div>
          <ModulePickerGrid
            selected={selectedModules}
            onChange={setSelectedModules}
            disabled={busy}
            idPrefix="reissue"
          />
        </div>
      </div>
    </Popup>
  )
}
