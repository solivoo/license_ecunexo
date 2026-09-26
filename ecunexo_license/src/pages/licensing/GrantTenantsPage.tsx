import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, CheckButton, Select, TextBox, useToast } from 'glubox'
import { ArrowLeft, Building2, LayoutGrid, TriangleAlert } from 'lucide-react'
import { ModulePickerGrid } from '@/components/licensing/ModulePickerGrid'
import { createGrantEntitlementsDraft, toModuleEntitlements } from '@/lib/grantEntitlements'
import {
  MODULES_WITH_LIMITS,
  getModuleDefaultLimits,
  getModuleFlags,
  limitKeyLabel,
  moduleShortLabel,
} from '@/constants/tenantModules'
import {
  EcuAlertDialog,
  EmptyState,
  GridToolbarRefresh,
  PageHeader,
  StatusBadge,
} from '@/components/ui'
import { useGluComponentSize } from '@/hooks/useGluComponentSize'
import { readApiError } from '@/lib/readApiError'
import {
  clearGrantTenantOverride,
  getGrantTenantEntitlements,
  listGrantTenants,
  updateGrantTenantEntitlements,
  type GrantTenantEntitlementsView,
  type GrantTenantItem,
} from '@/lib/platformLicensingApi'
import './grantTenants.css'

const TIER_OPTIONS = [
  { label: 'Small', value: '0' },
  { label: 'Medium', value: '1' },
  { label: 'Big', value: '2' },
  { label: 'Enterprise', value: '3' },
]

export function GrantTenantsPage() {
  const { grantId } = useParams<{ grantId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const size = useGluComponentSize()

  const [tenants, setTenants] = useState<GrantTenantItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GrantTenantEntitlementsView | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])
  const [tiers, setTiers] = useState<Record<string, string>>({})
  const [limits, setLimits] = useState<Record<string, Record<string, string>>>({})
  const [reason, setReason] = useState('')

  const loadTenants = useCallback(async () => {
    if (!grantId) return
    setListLoading(true)
    try {
      const data = await listGrantTenants(grantId)
      setListError(null)
      setTenants(data)
    } catch (err: unknown) {
      setListError(readApiError(err, 'No se pudieron cargar las empresas de la licencia.'))
    } finally {
      setListLoading(false)
    }
  }, [grantId])

  useEffect(() => {
    if (!grantId) return
    let cancelled = false
    listGrantTenants(grantId)
      .then((data) => {
        if (cancelled) return
        setListError(null)
        setTenants(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setListError(readApiError(err, 'No se pudieron cargar las empresas de la licencia.'))
      })
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [grantId])

  const applyView = useCallback((view: GrantTenantEntitlementsView) => {
    setDetail(view)
    const draft = createGrantEntitlementsDraft(
      view.effectiveEnabledModuleCodes,
      view.effectiveModuleEntitlements
    )
    setSelectedModules(draft.selectedModules)
    setTiers(draft.tiers)
    setLimits(draft.limits)
  }, [])

  const loadTenantEntitlements = useCallback(
    async (tenantId: string) => {
      if (!grantId) return
      setDetailLoading(true)
      setDetailError(null)
      try {
        const view = await getGrantTenantEntitlements(grantId, tenantId)
        applyView(view)
        setReason('')
      } catch (err: unknown) {
        setDetail(null)
        setDetailError(readApiError(err, 'No se pudieron cargar los accesos de la empresa.'))
      } finally {
        setDetailLoading(false)
      }
    },
    [applyView, grantId]
  )

  const handleSelectTenant = useCallback(
    (tenant: GrantTenantItem) => {
      setSelectedTenantId(tenant.tenantId)
      setDetail(null)
      void loadTenantEntitlements(tenant.tenantId)
    },
    [loadTenantEntitlements]
  )

  const setTier = useCallback((moduleCode: string, tier: string) => {
    setTiers((prev) => ({ ...prev, [moduleCode]: tier }))
  }, [])

  const setLimit = useCallback((moduleCode: string, key: string, value: string) => {
    setLimits((prev) => ({
      ...prev,
      [moduleCode]: { ...(prev[moduleCode] ?? {}), [key]: value },
    }))
  }, [])

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  )

  const saveOverride = useCallback(async () => {
    if (!grantId || !selectedTenantId || !detail || busy) return
    setBusy(true)
    try {
      const updated = await updateGrantTenantEntitlements(grantId, selectedTenantId, {
        enabledModuleCodes: selectedModules,
        moduleEntitlements: toModuleEntitlements(selectedModules, tiers, limits),
        reason: reason.trim() || null,
      })
      applyView(updated)
      setReason('')
      toast.show({
        title: 'Override guardado',
        message: `«${updated.tenantName}» aplicará los accesos personalizados en su próxima validación.`,
        variant: 'success',
      })
      await loadTenants()
    } catch (err: unknown) {
      const message = readApiError(err, 'No se pudieron guardar los accesos de la empresa.')
      setDetailError(message)
      toast.show({ title: 'No se pudo guardar', message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }, [
    applyView,
    busy,
    detail,
    grantId,
    limits,
    loadTenants,
    reason,
    selectedModules,
    selectedTenantId,
    tiers,
    toast,
  ])

  const resetOverride = useCallback(async () => {
    if (!grantId || !selectedTenantId || busy) return
    setBusy(true)
    try {
      const updated = await clearGrantTenantOverride(
        grantId,
        selectedTenantId,
        reason.trim() || null
      )
      applyView(updated)
      setReason('')
      toast.show({
        title: 'Acceso restablecido',
        message: `«${updated.tenantName}» vuelve a heredar los módulos de la licencia.`,
        variant: 'success',
      })
      await loadTenants()
    } catch (err: unknown) {
      const message = readApiError(err, 'No se pudo restablecer el acceso de la empresa.')
      setDetailError(message)
      toast.show({ title: 'No se pudo restablecer', message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }, [applyView, busy, grantId, loadTenants, reason, selectedTenantId, toast])

  const goToModules = useCallback(() => {
    if (!grantId) return
    void navigate(`/app/licencias/${grantId}/modulos`)
  }, [grantId, navigate])

  const hasTenants = tenants.length > 0
  const overrideVersion = detail?.hasOverride ? selectedTenant?.overrideVersion : undefined

  const editableModules = useMemo(
    () => MODULES_WITH_LIMITS.filter((module) => selectedModules.includes(module.code)),
    [selectedModules]
  )

  return (
    <div className="ecu-dashboard-layout ecu-section-page grant-tenants">
      <PageHeader
        title="Empresas y accesos"
        subtitle="Módulos, tier y límites por empresa."
        badge={
          <StatusBadge tone="primary" withDot>
            {listLoading ? 'Cargando' : `${tenants.length} empresa${tenants.length === 1 ? '' : 's'}`}
          </StatusBadge>
        }
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void navigate('/app/licencias/historial')}>
              <ArrowLeft size={16} aria-hidden /> Historial
            </Button>
            <Button type="button" variant="outline" disabled={!grantId} onClick={goToModules}>
              <LayoutGrid size={16} aria-hidden /> Módulos
            </Button>
          </>
        }
      />

      {listError ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="grant-tenants__split">
        <aside className="grant-tenants__sidebar" aria-label="Empresas de la licencia">
          <div className="grant-tenants__sidebar-head">
            <h2 className="grant-tenants__sidebar-title">Empresas</h2>
            <div className="grant-tenants__sidebar-actions">
              {hasTenants ? (
                <span className="grant-tenants__sidebar-count">{tenants.length}</span>
              ) : null}
              <GridToolbarRefresh loading={listLoading} onRefresh={() => void loadTenants()} />
            </div>
          </div>

          {listLoading ? (
            <p className="grant-tenants__muted">Cargando…</p>
          ) : hasTenants ? (
            <div className="grant-tenants__list" role="listbox" aria-label="Empresas">
              {tenants.map((tenant) => {
                const active = tenant.tenantId === selectedTenantId
                return (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`grant-tenants__tenant${
                      active ? ' grant-tenants__tenant--active' : ''
                    }`}
                    onClick={() => handleSelectTenant(tenant)}
                  >
                    <span className="grant-tenants__tenant-name" title={tenant.name}>
                      {tenant.name}
                    </span>
                    <span className="grant-tenants__tenant-meta">
                      {tenant.hasOverride ? (
                        <StatusBadge tone="primary" withDot>
                          Personalizado
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Heredado</StatusBadge>
                      )}
                      {tenant.hasOverride ? (
                        <span className="grant-tenants__tenant-version">
                          v{tenant.overrideVersion}
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <EmptyState
              className="ecu-empty-state--compact"
              icon={<Building2 size={26} strokeWidth={1.75} aria-hidden />}
              title="Sin empresas reportadas"
            />
          )}
        </aside>

        <section className="grant-tenants__editor" aria-label="Editor de accesos">
          {!selectedTenantId ? (
            <div className="grant-tenants__editor-card grant-tenants__placeholder">
              <EmptyState
                className="ecu-empty-state--compact"
                title="Selecciona una empresa"
                description="Elige una empresa de la lista."
              />
            </div>
          ) : detailLoading ? (
            <div className="grant-tenants__editor-card">
              <p className="grant-tenants__muted">Cargando accesos…</p>
            </div>
          ) : detail ? (
            <div className="grant-tenants__editor-card">
              <header className="grant-tenants__head">
                <h2 className="grant-tenants__head-title" title={detail.tenantName}>
                  {detail.tenantName}
                </h2>
                {detail.hasOverride ? (
                  <StatusBadge tone="primary" withDot>
                    Personalizado{overrideVersion != null ? ` · v${overrideVersion}` : ''}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Heredado</StatusBadge>
                )}
                <span className="grant-tenants__head-meta">
                  {`Base: ${detail.baseEnabledModuleCodes.length} módulos · v${detail.baseEntitlementsVersion}`}
                </span>
              </header>

              {detailError ? (
                <div className="grant-tenants__section">
                  <div className="ecu-form-error-banner" role="alert">
                    <TriangleAlert size={16} aria-hidden />
                    <span>{detailError}</span>
                  </div>
                </div>
              ) : null}

              <div className="grant-tenants__section">
                <h3 className="grant-tenants__section-title">Módulos</h3>
                <ModulePickerGrid
                  selected={selectedModules}
                  onChange={setSelectedModules}
                  disabled={busy}
                  idPrefix={`tenant-${selectedTenantId}`}
                />
              </div>

              <div className="grant-tenants__section">
                <h3 className="grant-tenants__section-title">Tier y límites</h3>
                {editableModules.length > 0 ? (
                  <div className="grant-tenants__limits-scroll">
                    <table className="grant-tenants__limits-table">
                      <thead>
                        <tr>
                          <th scope="col">Módulo</th>
                          <th scope="col">Tier</th>
                          <th scope="col">Límites</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableModules.map((module) => {
                          const flags = getModuleFlags(module.code)
                          const flagKeys = new Set(flags.map((flag) => flag.key))
                          const limitKeys = Object.keys(
                            getModuleDefaultLimits(module.code) ?? {}
                          ).filter((key) => !flagKeys.has(key))
                          const tierId = `tenant-${selectedTenantId}-tier-${module.code}`
                          return (
                            <tr key={module.code}>
                              <td className="grant-tenants__limits-module">
                                <span title={module.label}>{moduleShortLabel(module.code)}</span>
                              </td>
                              <td className="grant-tenants__limits-tier">
                                <label className="grant-tenants__sr-only" htmlFor={tierId}>
                                  Tier de {module.label}
                                </label>
                                <div className="grant-tenants__tier-field">
                                  <Select
                                    id={tierId}
                                    options={TIER_OPTIONS}
                                    value={tiers[module.code] ?? '0'}
                                    onChange={(value) => setTier(module.code, value)}
                                    disabled={busy}
                                    size="sm"
                                    variant="outline"
                                  />
                                </div>
                              </td>
                              <td>
                                <div className="grant-tenants__limits-fields">
                                  {limitKeys.map((key) => {
                                    const label = limitKeyLabel(key)
                                    return (
                                      <div key={key} className="grant-tenants__limit-field">
                                        <TextBox
                                          id={`tenant-${selectedTenantId}-limit-${module.code}-${key}`}
                                          type="number"
                                          inputMode="numeric"
                                          min={0}
                                          size="sm"
                                          variant="outline"
                                          value={limits[module.code]?.[key] ?? ''}
                                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            setLimit(module.code, key, e.target.value)
                                          }
                                          placeholder="—"
                                          aria-label={`${module.label}: ${label}`}
                                          title={`${label} (vacío = ilimitado)`}
                                          disabled={busy}
                                          fullWidth
                                        />
                                      </div>
                                    )
                                  })}
                                  {flags.map((flag) => (
                                    <div key={flag.key} className="grant-tenants__limit-field">
                                      <CheckButton
                                        checked={
                                          (limits[module.code]?.[flag.key] ?? '1') !== '0'
                                        }
                                        onChange={(checked: boolean) =>
                                          setLimit(module.code, flag.key, checked ? '1' : '0')
                                        }
                                        disabled={busy}
                                        size="sm"
                                        title={`${module.label}: ${flag.label}`}
                                      >
                                        {flag.label}
                                      </CheckButton>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="grant-tenants__muted">Sin módulos con límites.</p>
                )}
              </div>

              <footer className="grant-tenants__footer">
                <TextBox
                  id="grant-tenant-reason"
                  className="grant-tenants__footer-reason"
                  variant="outline"
                  value={reason}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                  placeholder="Motivo..."
                  aria-label="Motivo (auditoría)"
                  disabled={busy}
                  fullWidth
                  size={size}
                />
                <div className="grant-tenants__footer-actions">
                  <Button
                    type="button"
                    variant="primary"
                    loading={busy}
                    disabled={busy}
                    onClick={() => void saveOverride()}
                  >
                    Guardar override
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !detail.hasOverride}
                    onClick={() => setConfirmResetOpen(true)}
                  >
                    Restablecer a la licencia
                  </Button>
                </div>
              </footer>
            </div>
          ) : detailError ? (
            <div className="grant-tenants__editor-card">
              <div className="grant-tenants__section">
                <div className="ecu-form-error-banner" role="alert">
                  <TriangleAlert size={16} aria-hidden />
                  <span>{detailError}</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <EcuAlertDialog
        open={confirmResetOpen}
        title="Restablecer a la licencia"
        message={
          detail
            ? `Se eliminará el override de «${detail.tenantName}» y volverá a heredar los módulos, tier y límites de la licencia.` +
              (reason.trim() ? ` Motivo: ${reason.trim()}.` : '')
            : ''
        }
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false)
          void resetOverride()
        }}
        confirmLabel="Sí, restablecer"
      />
    </div>
  )
}
