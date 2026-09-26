import { useCallback, useEffect, useMemo, useState } from 'react'
import { Popup, Select } from 'glubox'
import { moduleLabels } from '@/constants/tenantModules'
import { formatDateTime } from '@/lib/formatDate'
import {
  listPlans,
  type LicenseListItem,
  type PlanListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import '@/pages/licensing/licensesGrid.css'

export type ExpandLicenseDialogProps = {
  readonly open: boolean
  readonly license: LicenseListItem | null
  readonly busy?: boolean
  readonly onClose: () => void
  readonly onConfirm: (planCode: string, enabledModules: string[]) => void
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
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [planCode, setPlanCode] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoadError(null)
    const current = license?.planCode ?? ''
    setPlanCode(current)

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
                  maxTenantsDefault: 0,
                  maxUsersDefault: 0,
                  maxWarehousesDefault: 0,
                  enabledModuleCodesDefault: [],
                  isActive: true,
                },
                ...rows,
              ]
        setPlans(nextPlans)
        setPlanCode(current)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(readApiError(err, 'No se pudieron cargar los planes.'))
      })

    return () => {
      cancelled = true
    }
  }, [open, license])

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
      ? `En el catálogo este código es «${selectedPlan.displayName}» e incluye: ${modulesHint}. Ampliar reemite con esos módulos.`
      : planCode === license?.planCode
        ? 'Plan actual. Ampliar renueva con el catálogo vigente, o elige otro plan.'
        : `Incluye: ${modulesHint}`
    : undefined

  const handleClose = useCallback(() => {
    if (busy) return
    onClose()
  }, [busy, onClose])

  const handleConfirm = useCallback(() => {
    if (busy || planCode.length === 0) return
    onConfirm(planCode, selectedPlan?.enabledModuleCodesDefault ?? [])
  }, [busy, onConfirm, planCode, selectedPlan])

  return (
    <Popup
      open={open}
      onClose={handleClose}
      title="Ampliar licencia"
      width="min(92vw, 32rem)"
      
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
          label: busy ? 'Ampliando…' : 'Ampliar',
          variant: 'primary' as const,
          onClick: handleConfirm,
          disabled: busy || planCode.length === 0 || Boolean(loadError),
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
          Se revoca la licencia vigente, se mantiene el mismo titular y se genera un código y
          archivo nuevos con el plan elegido. Luego canjea el archivo en el admin: Organización →
          Plan.
        </p>

        {loadError ? (
          <p className="platform-shell__alert platform-shell__alert--error" role="alert">
            {loadError}
          </p>
        ) : null}

        <Select
          label="Nuevo plan"
          labelPosition="outlined"
          variant="outline"
          options={planOptions}
          value={planCode}
          onChange={setPlanCode}
          placeholder="Seleccionar plan…"
          helperText={helperText}
          disabled={busy || plans.length === 0}
          fullWidth
          size="md"
          
        />
      </div>
    </Popup>
  )
}
