import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, TextArea, TextBox } from 'glubox'
import {
  AlertTriangle,
  DollarSign,
  Info,
  LayoutGrid,
} from 'lucide-react'
import { EcuAlertDialog, PageHeader, StatusBadge } from '@/components/ui'
import { PlanModuleConfigurator } from '@/components/licensing/PlanModuleConfigurator'
import {
  MODULES_WITH_LIMITS,
  getModuleDefaultLimits,
  ensureIdentityModule,
  validateModuleDependencies,
} from '@/constants/tenantModules'
import {
  getPlanDetail,
  updatePlan,
  deactivatePlan,
  type PlanDetail,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function limitsFromEntitlements(
  entitlements: { moduleCode: string; limits?: Record<string, number> }[] | null | undefined
): Record<string, Record<string, string>> {
  const tl: Record<string, Record<string, string>> = {}
  if (!entitlements) return tl
  for (const e of entitlements) {
    const defaults = getModuleDefaultLimits(e.moduleCode) ?? {}
    tl[e.moduleCode] = Object.fromEntries(
      Object.entries(e.limits ?? defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
    )
  }
  return tl
}

export function PlanDetailPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editMaxTenants, setEditMaxTenants] = useState(1)
  const [editMaxUsers, setEditMaxUsers] = useState(5)
  const [editMaxWarehouses, setEditMaxWarehouses] = useState(1)
  const [editModules, setEditModules] = useState<string[]>(['identity'])
  const [editPrice, setEditPrice] = useState('')
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editLimits, setEditLimits] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    if (!code) return
    setLoading(true)
    getPlanDetail(code)
      .then((p) => {
        setPlan(p)
        setEditDisplayName(p.displayName)
        setEditDescription(p.description ?? '')
        setEditMaxTenants(p.maxTenantsDefault)
        setEditMaxUsers(p.maxUsersDefault)
        setEditMaxWarehouses(p.maxWarehousesDefault)
        setEditModules(ensureIdentityModule(p.enabledModuleCodesDefault))
        setEditPrice(p.suggestedPriceUsdMonthly != null ? String(p.suggestedPriceUsdMonthly) : '')
        setEditSortOrder(p.sortOrder)
        setEditLimits(limitsFromEntitlements(p.moduleEntitlementsDefault))
      })
      .catch((err: unknown) => {
        setError(readApiError(err, 'Plan no encontrado.'))
        setErrorOpen(true)
      })
      .finally(() => setLoading(false))
  }, [code])

  const setLimit = useCallback((mod: string, key: string, value: string) => {
    setEditLimits((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [key]: value },
    }))
    if (mod === 'identity' && key === 'max_users') {
      const parsed = Number(value)
      if (parsed > 0) setEditMaxUsers(parsed)
    }
    if (mod === 'warehousing' && key === 'max_warehouses') {
      const parsed = Number(value)
      if (parsed > 0) setEditMaxWarehouses(parsed)
    }
    setDirty(true)
  }, [])

  const handleCancel = useCallback(() => {
    if (!plan) return
    setEditDisplayName(plan.displayName)
    setEditDescription(plan.description ?? '')
    setEditMaxTenants(plan.maxTenantsDefault)
    setEditMaxUsers(plan.maxUsersDefault)
    setEditMaxWarehouses(plan.maxWarehousesDefault)
    setEditModules(ensureIdentityModule(plan.enabledModuleCodesDefault))
    setEditPrice(plan.suggestedPriceUsdMonthly != null ? String(plan.suggestedPriceUsdMonthly) : '')
    setEditSortOrder(plan.sortOrder)
    setEditLimits(limitsFromEntitlements(plan.moduleEntitlementsDefault))
    setDirty(false)
    setSuccess(null)
  }, [plan])

  const updateModules = useCallback((codes: string[]) => {
    setEditModules(codes)
    setEditLimits((prev) => {
      const next = { ...prev }
      for (const code of codes) {
        if (!next[code]) {
          const defaults = getModuleDefaultLimits(code)
          if (defaults) {
            next[code] = Object.fromEntries(
              Object.entries(defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
            )
          }
        }
      }
      for (const key of Object.keys(next)) {
        if (!codes.includes(key)) delete next[key]
      }
      return next
    })
    setDirty(true)
  }, [])

  const depWarnings = useMemo(() => validateModuleDependencies(editModules), [editModules])

  const onSubmit = async () => {
    if (!code) return
    setError(null)
    setErrorOpen(false)
    setSuccess(null)
    setBusy(true)

    try {
      const depErrors = validateModuleDependencies(editModules)
      if (depErrors.length > 0) throw new Error(depErrors.join(' '))

      const price = editPrice.trim() ? parseFloat(editPrice.trim()) : null

      const limitsModules = MODULES_WITH_LIMITS.filter((m) => editModules.includes(m.code))
      const entitlements = limitsModules.map((m) => {
        const rawLimits = editLimits[m.code]
        const limits: Record<string, number> | undefined =
          rawLimits
            ? Object.fromEntries(
                Object.entries(rawLimits)
                  .filter(([, v]) => v.trim() !== '')
                  .map(([k, v]) => {
                    const num = Number(v)
                    return [k, isNaN(num) ? -1 : num]
                  })
              )
            : undefined
        return { moduleCode: m.code, tier: 0, limits: limits && Object.keys(limits).length > 0 ? limits : undefined }
      })

      const userLimit = editLimits['identity']?.max_users
      const whLimit = editLimits['warehousing']?.max_warehouses
      const resolvedMaxUsers = userLimit && Number(userLimit) > 0 ? Number(userLimit) : editMaxUsers
      const resolvedMaxWarehouses = whLimit && Number(whLimit) > 0 ? Number(whLimit) : editMaxWarehouses

      const updated = await updatePlan(code, {
        displayName: editDisplayName.trim(),
        description: editDescription.trim() || null,
        maxTenantsDefault: editMaxTenants,
        maxUsersDefault: resolvedMaxUsers,
        maxWarehousesDefault: resolvedMaxWarehouses,
        enabledModuleCodesDefault: editModules.length > 0 ? editModules : undefined,
        moduleEntitlementsDefault: entitlements.length > 0 ? entitlements : null,
        suggestedPriceUsdMonthly: price,
        sortOrder: editSortOrder,
      })

      setPlan((prev) =>
        prev
          ? {
              ...prev,
              displayName: updated.displayName,
              updatedAt: new Date().toISOString(),
            }
          : prev
      )
      setDirty(false)
      setSuccess('Plan actualizado correctamente.')
    } catch (err: unknown) {
      setError(readApiError(err, 'Error al actualizar plan.'))
      setErrorOpen(true)
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivate = async () => {
    if (!code) return
    setBusy(true)
    try {
      await deactivatePlan(code)
      setPlan((prev) => (prev ? { ...prev, isActive: false } : prev))
      setSuccess('Plan desactivado.')
    } catch (err: unknown) {
      setError(readApiError(err, 'No se pudo desactivar.'))
      setErrorOpen(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="login-page__muted">Cargando plan…</p>
  if (!plan) return <p className="welcome-onboarding__error">Plan no encontrado.</p>

  return (
    <>
      <div className="ecu-dashboard-layout ecu-section-page">
        <PageHeader
          title={`${plan.displayName}${dirty ? ' *' : ''}`}
          subtitle={
            <>
              <code>{plan.code}</code> · Creado {formatDate(plan.createdAt)}
              {plan.updatedAt && !dirty ? ` · Actualizado ${formatDate(plan.updatedAt)}` : null}
            </>
          }
          badge={
            <StatusBadge tone={plan.isActive ? 'success' : 'neutral'} withDot>
              {plan.isActive ? 'Activo' : 'Inactivo'}
            </StatusBadge>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => navigate('/app/planes')}>
                ← Catálogo
              </Button>
              {plan.isActive ? (
                <Button variant="secondary" disabled={busy} onClick={() => setConfirmDeactivate(true)}>
                  Desactivar
                </Button>
              ) : null}
            </>
          }
        />

      {success ? (
        <p className="ecu-success-message" role="status">{success}</p>
      ) : null}

      {depWarnings.length > 0 ? (
        <div className="ecu-validation-warnings" role="alert">
          <AlertTriangle className="ecu-validation-warnings__icon" size={18} strokeWidth={1.75} aria-hidden />
          <ul className="ecu-validation-warnings__list">
            {depWarnings.map((w, i) => (<li key={i}>{w}</li>))}
          </ul>
        </div>
      ) : null}

      <form
        ref={formRef}
        className="ecu-sf-form-skin"
        onSubmit={(e) => { e.preventDefault(); void onSubmit() }}
        noValidate
      >
        <div className="issue-license-panel">
          {/* Identidad */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <Info size={18} strokeWidth={1.75} aria-hidden />
              Identidad del plan
            </h3>
            <div className="issue-license-form-grid">
              <TextBox
                id="plan-name"
                label="Nombre visible"
                labelPosition="outlined"
                variant="outline"
                value={editDisplayName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEditDisplayName(e.target.value)
                  setDirty(true)
                }}
                required
                fullWidth
                size="md"
              />
              <TextBox
                id="plan-tenants"
                label="Empresas permitidas"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={String(editMaxTenants)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEditMaxTenants(Number(e.target.value))
                  setDirty(true)
                }}
                helperText="Tenants máximos por licencia"
                fullWidth
                size="md"
              />
              <TextArea
                id="plan-desc"
                className="issue-license-form-grid__span-full"
                label="Descripción"
                labelPosition="outlined"
                variant="outline"
                size="md"
                value={editDescription}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setEditDescription(e.target.value)
                  setDirty(true)
                }}
                rows={2}
                resize="vertical"
                fullWidth
              />
            </div>
          </section>

          {/* Módulos y límites contextuales */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
              Módulos y límites del plan
            </h3>
            <p className="issue-license-subpanel__desc">
              Gestiona los módulos activos en el plan y ajusta sus límites de cuota directamente en cada tarjeta.
            </p>
            <PlanModuleConfigurator
              selectedModules={editModules}
              onChangeModules={updateModules}
              limits={editLimits}
              onChangeLimit={setLimit}
              disabled={busy}
            />
          </section>

          {/* Comercial */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <DollarSign size={18} strokeWidth={1.75} aria-hidden />
              Información comercial
            </h3>
            <div className="issue-license-form-grid">
              <TextBox
                id="plan-price"
                label="Precio USD/mes"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={editPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEditPrice(e.target.value)
                  setDirty(true)
                }}
                placeholder="0.00"
                fullWidth
                size="md"
                
              />
              <TextBox
                id="plan-sort"
                label="Orden"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                value={String(editSortOrder)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEditSortOrder(Number(e.target.value))
                  setDirty(true)
                }}
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          <footer className="issue-license-form-footer issue-license-form-footer--plan">
            <div>
              {dirty ? (
                <span className="ecu-dirty-hint">Tienes cambios sin guardar</span>
              ) : null}
            </div>
            <div className="ecu-form-footer-actions">
              {dirty ? (
                <Button variant="outline" size="md" disabled={busy} onClick={handleCancel}>
                  Cancelar
                </Button>
              ) : null}
              <Button
                variant="primary" 
                size="md"
                disabled={busy || !dirty}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {busy ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </footer>
        </div>
      </form>
      </div>

      <EcuAlertDialog
        open={errorOpen}
        title="Error"
        message={error ?? 'Error inesperado.'}
        onClose={() => { setErrorOpen(false); setError(null) }}
      />

      <EcuAlertDialog
        open={confirmDeactivate}
        title="Desactivar plan"
        message={`¿Desactivar «${plan.displayName}»? Las licencias ya emitidas con este plan seguirán funcionando.`}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={handleDeactivate}
        confirmLabel="Desactivar"
      />
    </>
  )
}
