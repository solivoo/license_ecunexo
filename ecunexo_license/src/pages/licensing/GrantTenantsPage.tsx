import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, TextBox, useToast } from 'glubox'
import { ArrowLeft, Building2, LayoutGrid, TriangleAlert } from 'lucide-react'
import { GrantEntitlementsForm } from '@/components/licensing/GrantEntitlementsForm'
import { createGrantEntitlementsDraft, toModuleEntitlements } from '@/lib/grantEntitlements'
import {
  EcuAlertDialog,
  EmptyState,
  GridToolbarRefresh,
  PageHeader,
  SectionCard,
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
import { GrantTenantsGrid } from './GrantTenantsGrid'

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

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Empresas y accesos"
        subtitle="Personaliza módulos, tier y límites por empresa. Sin override, la empresa hereda los accesos de la licencia."
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

      <SectionCard
        title="Empresas reportadas"
        subtitle="Aparecen cuando el cliente inicia sesión con su licencia y el tenant reporta sus datos."
      >
        {!listLoading && !listError && !hasTenants ? (
          <EmptyState
            icon={<Building2 size={32} strokeWidth={1.75} />}
            title="Aún no hay empresas reportadas"
            description="Cuando el cliente active la licencia e inicie sesión, sus empresas se reportarán automáticamente y podrás personalizar sus accesos aquí."
            action={
              <div className="ecu-grid-toolbar-actions">
                <Button type="button" variant="primary" onClick={() => void loadTenants()}>
                  Actualizar
                </Button>
                <Button type="button" variant="outline" disabled={!grantId} onClick={goToModules}>
                  Ver módulos
                </Button>
              </div>
            }
          />
        ) : (
          <GrantTenantsGrid
            rows={tenants}
            loading={listLoading}
            selectedTenantId={selectedTenantId}
            onSelect={handleSelectTenant}
            toolbarRight={
              <GridToolbarRefresh loading={listLoading} onRefresh={() => void loadTenants()} />
            }
          />
        )}
      </SectionCard>

      {selectedTenantId ? (
        detailLoading ? (
          <p className="login-page__muted">Cargando accesos…</p>
        ) : detail ? (
          <>
            {detailError ? (
              <div className="ecu-form-error-banner" role="alert">
                <TriangleAlert size={16} aria-hidden />
                <span>{detailError}</span>
              </div>
            ) : null}

            <SectionCard
              title={`Accesos de ${detail.tenantName}`}
              subtitle={`Base de la licencia: ${detail.baseEnabledModuleCodes.length} módulos · v${detail.baseEntitlementsVersion}`}
              action={
                detail.hasOverride ? (
                  <StatusBadge tone="primary" withDot>
                    Personalizado{overrideVersion != null ? ` · v${overrideVersion}` : ''}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Heredado de la licencia</StatusBadge>
                )
              }
            >
              <p className="issue-license-subpanel__hint">
                {detail.hasOverride
                  ? 'Esta empresa tiene un override activo. Los cambios se auditan y se aplican en la próxima validación.'
                  : 'Esta empresa hereda los módulos, tier y límites de la licencia. Guarda un override para personalizarla.'}
              </p>
            </SectionCard>

            <GrantEntitlementsForm
              selectedModules={selectedModules}
              tiers={tiers}
              limits={limits}
              disabled={busy}
              idPrefix={`tenant-${selectedTenantId}`}
              onSelectedModulesChange={setSelectedModules}
              onTierChange={setTier}
              onLimitChange={setLimit}
            />

            <SectionCard title="Motivo y guardado">
              <TextBox
                id="grant-tenant-reason"
                label="Motivo (auditoría)"
                labelPosition="outlined"
                variant="outline"
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                placeholder="Ej. Condiciones comerciales de la empresa"
                disabled={busy}
                fullWidth
                size={size}
              />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
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
            </SectionCard>
          </>
        ) : detailError ? (
          <div className="ecu-form-error-banner" role="alert">
            <TriangleAlert size={16} aria-hidden />
            <span>{detailError}</span>
          </div>
        ) : null
      ) : !listLoading && hasTenants ? (
        <SectionCard title="Selecciona una empresa" subtitle="Elige una empresa de la lista para editar sus accesos.">
          <EmptyState
            icon={<Building2 size={32} strokeWidth={1.75} />}
            title="Sin empresa seleccionada"
            description="Selecciona una empresa para ver y personalizar sus módulos, tier y límites."
          />
        </SectionCard>
      ) : null}

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
