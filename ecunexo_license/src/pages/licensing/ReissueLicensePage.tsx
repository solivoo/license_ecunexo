import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, NumberBox, Select, useToast } from 'glubox'
import { ArrowLeft, KeyRound, LayoutGrid, ShieldCheck } from 'lucide-react'
import { IssueLicenseResultDialog } from '@/components/licensing/IssueLicenseResultDialog'
import { PlanModuleConfigurator } from '@/components/licensing/PlanModuleConfigurator'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui'
import {
  ensureIdentityModule,
  getModuleDefaultLimits,
  moduleLabels,
  validateModuleDependencies,
} from '@/constants/tenantModules'
import { formatDateTime } from '@/lib/formatDate'
import { createGrantEntitlementsDraft, toModuleEntitlements } from '@/lib/grantEntitlements'
import {
  getGrantEntitlements,
  listLicenses,
  listPlans,
  reissueLicense,
  type LicenseListItem,
  type PlanListItem,
  type ReissueLicenseResult,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

export function ReissueLicensePage() {
  const { grantId } = useParams<{ grantId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [license, setLicense] = useState<LicenseListItem | null>(null)
  const [plans, setPlans] = useState<PlanListItem[]>([])

  const [planCode, setPlanCode] = useState('')
  const [maxUsers, setMaxUsers] = useState(5)
  const [maxWarehouses, setMaxWarehouses] = useState(1)
  const [maxTenants, setMaxTenants] = useState(1)
  const [validityDays, setValidityDays] = useState(365)
  const [onlineValidationIntervalDays, setOnlineValidationIntervalDays] = useState(30)
  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])
  const [limits, setLimits] = useState<Record<string, Record<string, string>>>({})

  const [reissued, setReissued] = useState<ReissueLicenseResult | null>(null)
  const [resultOpen, setResultOpen] = useState(false)

  // Carga inicial de datos
  useEffect(() => {
    if (!grantId) return
    let active = true

    Promise.all([listLicenses(), listPlans(), getGrantEntitlements(grantId).catch(() => null)])
      .then(([allLicenses, allPlans, entitlementsSnapshot]) => {
        if (!active) return

        const found = allLicenses.find((l) => l.id.toLowerCase() === grantId.toLowerCase())
        if (!found) {
          setLoading(false)
          return
        }

        setLicense(found)
        setPlans(allPlans)
        setPlanCode(found.planCode)
        setMaxUsers((found.maxUsers ?? 0) > 0 ? found.maxUsers! : 5)
        setMaxWarehouses((found.maxWarehouses ?? 0) > 0 ? found.maxWarehouses! : 1)
        setMaxTenants(found.maxTenants > 0 ? found.maxTenants : 1)
        setOnlineValidationIntervalDays(found.onlineValidationIntervalDays || 30)

        if (entitlementsSnapshot) {
          const draft = createGrantEntitlementsDraft(
            entitlementsSnapshot.enabledModuleCodes,
            entitlementsSnapshot.moduleEntitlements
          )
          if ((found.maxUsers ?? 0) > 0 && draft.limits['identity']) {
            draft.limits['identity'].max_users = String(found.maxUsers)
          }
          if ((found.maxWarehouses ?? 0) > 0 && draft.limits['warehousing']) {
            draft.limits['warehousing'].max_warehouses = String(found.maxWarehouses)
          }
          setSelectedModules(draft.selectedModules)
          setLimits(draft.limits)
        } else {
          const currentPlan = allPlans.find((p) => p.code === found.planCode)
          const baseModules =
            found.enabledModuleCodes && found.enabledModuleCodes.length > 0
              ? found.enabledModuleCodes
              : currentPlan?.enabledModuleCodesDefault ?? ['identity']
          const baseEntitlements =
            found.moduleEntitlements && found.moduleEntitlements.length > 0
              ? found.moduleEntitlements
              : currentPlan?.moduleEntitlementsDefault ?? null
          const draft = createGrantEntitlementsDraft(baseModules, baseEntitlements)
          if ((found.maxUsers ?? 0) > 0 && draft.limits['identity']) {
            draft.limits['identity'].max_users = String(found.maxUsers)
          }
          if ((found.maxWarehouses ?? 0) > 0 && draft.limits['warehousing']) {
            draft.limits['warehousing'].max_warehouses = String(found.maxWarehouses)
          }
          setSelectedModules(draft.selectedModules)
          setLimits(draft.limits)
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        toast.show({
          title: 'Error de carga',
          message: readApiError(err, 'No se pudo cargar la información de la licencia.'),
          variant: 'error',
        })
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [grantId, toast])

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        value: p.code,
        label: `${p.displayName} (${p.code})`,
      })),
    [plans]
  )

  const handlePlanChange = useCallback(
    (newCode: string) => {
      setPlanCode(newCode)
      const selected = plans.find((p) => p.code === newCode)
      if (selected) {
        setMaxUsers(selected.maxUsersDefault)
        setMaxWarehouses(selected.maxWarehousesDefault)
        setMaxTenants(selected.maxTenantsDefault)
        const newMods = ensureIdentityModule(selected.enabledModuleCodesDefault)
        setSelectedModules(newMods)
        setLimits((prev) => {
          const next = { ...prev }
          for (const m of newMods) {
            if (!next[m]) {
              const def = getModuleDefaultLimits(m)
              if (def) {
                next[m] = Object.fromEntries(
                  Object.entries(def).map(([k, v]) => [k, String(v === -1 ? '' : v)])
                )
              }
            }
          }
          return next
        })
      }
    },
    [plans]
  )

  const updateSelectedModules = useCallback((codes: string[]) => {
    const normalized = ensureIdentityModule(codes)
    setSelectedModules(normalized)
    setLimits((prev) => {
      const next = { ...prev }
      for (const code of normalized) {
        if (!next[code]) {
          const defaults = getModuleDefaultLimits(code)
          if (defaults) {
            next[code] = Object.fromEntries(
              Object.entries(defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
            )
          }
        }
      }
      return next
    })
  }, [])

  const handleLimitChange = useCallback((moduleCode: string, limitKey: string, value: string) => {
    setLimits((prev) => ({
      ...prev,
      [moduleCode]: {
        ...(prev[moduleCode] ?? {}),
        [limitKey]: value,
      },
    }))
    if (moduleCode === 'identity' && limitKey === 'max_users') {
      const n = Number(value)
      if (n > 0) setMaxUsers(n)
    }
    if (moduleCode === 'warehousing' && limitKey === 'max_warehouses') {
      const n = Number(value)
      if (n > 0) setMaxWarehouses(n)
    }
  }, [])

  const handleSubmit = async () => {
    if (!license) return

    const depErrors = validateModuleDependencies(selectedModules)
    if (depErrors.length > 0) {
      toast.show({
        title: 'Dependencias de módulos no resueltas',
        message: depErrors[0],
        variant: 'warning',
      })
      return
    }

    setBusy(true)
    try {
      const moduleEntitlementsOverride = toModuleEntitlements(selectedModules, {}, limits)
      const resolvedMaxUsers = Number(limits['identity']?.max_users) || maxUsers
      const resolvedMaxWarehouses = selectedModules.includes('warehousing')
        ? Number(limits['warehousing']?.max_warehouses) || maxWarehouses
        : 1

      const result = await reissueLicense(license.id, {
        planCode,
        validityDays,
        onlineValidationIntervalDays,
        maxUsersOverride: Math.max(1, resolvedMaxUsers),
        maxWarehousesOverride: Math.max(1, resolvedMaxWarehouses),
        maxTenantsOverride: Math.max(1, maxTenants),
        enabledModuleCodesOverride: selectedModules,
        moduleEntitlementsOverride,
      })

      setReissued(result)
      setResultOpen(true)
      toast.show({
        title: 'Licencia reemitida exitosamente',
        message: 'Se generó un nuevo artefacto firmado y código de activación.',
        variant: 'success',
      })
    } catch (err: unknown) {
      toast.show({
        title: 'No se pudo reemitir la licencia',
        message: readApiError(err, 'Error al guardar los cambios de la licencia.'),
        variant: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="ecu-dashboard-layout ecu-section-page">
        <p className="login-page__muted">Cargando detalles de la licencia…</p>
      </div>
    )
  }

  if (!license) {
    return (
      <div className="ecu-dashboard-layout ecu-section-page">
        <EmptyState
          title="Licencia no encontrada"
          description={`No existe ninguna licencia con el identificador ${grantId}.`}
          action={
            <Button variant="outline" onClick={() => navigate('/app/licencias/historial')}>
              Volver al historial
            </Button>
          }
        />
      </div>
    )
  }

  const customerName = license.customerTradeName
    ? `${license.customerLegalName} (${license.customerTradeName})`
    : license.customerLegalName

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Modificar o Renovar Licencia"
        subtitle={
          <>
            Cliente: <strong>{customerName}</strong> · Licencia actual: <code>{license.id}</code>
          </>
        }
        badge={
          <StatusBadge tone={license.status === 'Active' ? 'success' : 'neutral'} withDot>
            {license.status === 'Active' ? 'Vigente' : license.status}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/app/licencias/historial')}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden />
            Historial de licencias
          </Button>
        }
      />

      <form
        className="ecu-sf-form-skin"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        noValidate
      >
        <div className="issue-license-panel">
          {/* Resumen de la licencia actual */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden />
              Información de la licencia actual
            </h3>
            <p className="issue-license-subpanel__desc">
              Esta operación reemite la licencia para <strong>{customerName}</strong> sin alterar los planes base de otros clientes. La licencia anterior será revocada automáticamente y sustituida por la nueva.
            </p>
            <div className="issue-license-form-grid issue-license-form-grid--3">
              <div>
                <span className="expand-license-dialog__meta-label">Titular de contacto</span>
                <p className="expand-license-dialog__meta-value">{license.ownerEmail || 'Sin titular registrado'}</p>
              </div>
              <div>
                <span className="expand-license-dialog__meta-label">Plan actual</span>
                <p className="expand-license-dialog__meta-value">{license.planLabel}</p>
              </div>
              <div>
                <span className="expand-license-dialog__meta-label">Fecha de expiración actual</span>
                <p className="expand-license-dialog__meta-value">{formatDateTime(license.expiresAtUtc)}</p>
              </div>
            </div>
          </section>

          {/* Cupos y Vigencia */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <KeyRound size={18} strokeWidth={1.75} aria-hidden />
              Plan base, empresas y vigencia
            </h3>
            <p className="issue-license-subpanel__desc">
              Ajusta el plan base, la vigencia y las empresas permitidas. Las cuotas de usuarios, bodegas, SKUs o comprobantes se configuran en la tarjeta de cada módulo abajo.
            </p>
            <div className="issue-license-form-grid">
              <Select
                label="Plan base"
                labelPosition="outlined"
                variant="outline"
                options={planOptions}
                value={planCode}
                onChange={handlePlanChange}
                placeholder="Seleccionar plan base…"
                disabled={busy || plans.length === 0}
                fullWidth
                size="md"
              />

              <NumberBox
                id="reissue-max-tenants"
                label="Empresas permitidas"
                labelPosition="outlined"
                variant="outline"
                min={1}
                step={1}
                showSpinButtons
                value={maxTenants}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMaxTenants(Math.max(1, Number(e.target.value) || 1))
                }
                helperText="Empresas (tenants) asociadas al contrato."
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
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setValidityDays(Math.max(1, Number(e.target.value) || 365))
                }
                helperText="Vigencia desde hoy. 365 = 1 año."
                fullWidth
                size="md"
              />

              <NumberBox
                id="reissue-online-validation"
                label="Validar en línea cada (días)"
                labelPosition="outlined"
                variant="outline"
                min={1}
                max={90}
                step={1}
                showSpinButtons
                value={onlineValidationIntervalDays}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setOnlineValidationIntervalDays(Math.min(90, Math.max(1, Number(e.target.value) || 30)))
                }
                helperText="Intervalo de verificación en línea."
                fullWidth
                size="md"
              />
            </div>
          </section>

          {/* Módulos y límites específicos de cada módulo */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
              Módulos y límites configurables de la licencia
            </h3>
            <p className="issue-license-subpanel__desc">
              Habilita módulos específicos para este cliente y configura los límites de cuota (por ejemplo en <strong>Inventario</strong> el límite de SKUs/artículos, comprobantes en Facturación SRI, etc.) en cada tarjeta expandible.
            </p>
            <PlanModuleConfigurator
              selectedModules={selectedModules}
              onChangeModules={updateSelectedModules}
              limits={limits}
              onChangeLimit={handleLimitChange}
              disabled={busy}
            />
          </section>

          {/* Barra de acciones */}
          <div className="issue-license-wizard__nav">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => navigate('/app/licencias/historial')}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={busy}
            >
              {busy ? 'Reemitiendo licencia…' : 'Guardar y reemitir licencia'}
            </Button>
          </div>
        </div>
      </form>

      {reissued ? (
        <IssueLicenseResultDialog
          issued={{
            licenseId: reissued.licenseId,
            activationCodePlaintext: reissued.activationCodePlaintext,
            licenseArtifact: reissued.licenseArtifact,
            expiresAtUtc: reissued.expiresAtUtc,
            provisioningSlotsRemaining: reissued.provisioningSlotsRemaining,
            planLabel: reissued.planLabel,
          }}
          enabledModules={selectedModules}
          modulesLabel={moduleLabels(selectedModules) || 'Ver módulos emitidos'}
          supersedesGrantId={reissued.supersedesGrantId}
          generation={reissued.generation}
          reissueKind={reissued.reissueKind}
          previousPlanLabel={reissued.previousPlanLabel}
          open={resultOpen}
          onClose={() => {
            setResultOpen(false)
            navigate('/app/licencias/historial')
          }}
        />
      ) : null}
    </div>
  )
}
