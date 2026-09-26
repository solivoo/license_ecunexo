import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, TextBox, useToast } from 'glubox'
import { ArrowLeft, LayoutGrid, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { EcuLabeledDropDown } from '@/components/form/EcuLabeledDropDown'
import { ModuleChipList } from '@/components/licensing/ModuleChipList'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui'
import {
  MODULES_WITH_LIMITS,
  ensureIdentityModule,
  getModuleDefaultLimits,
  limitKeyLabel,
  validateModuleDependencies,
} from '@/constants/tenantModules'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import { readApiError } from '@/lib/readApiError'
import {
  getGrantEntitlements,
  updateGrantEntitlements,
  type GrantEntitlements,
  type ModuleEntitlement,
} from '@/lib/platformLicensingApi'

const TIER_OPTIONS = [
  { text: 'Small', value: '0' },
  { text: 'Medium', value: '1' },
  { text: 'Big', value: '2' },
  { text: 'Enterprise', value: '3' },
]

export function GrantModulesPage() {
  const { grantId } = useParams<{ grantId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const theme = useGluComponentTheme()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<GrantEntitlements | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])
  const [tiers, setTiers] = useState<Record<string, string>>({})
  const [limits, setLimits] = useState<Record<string, Record<string, string>>>({})
  const [reason, setReason] = useState('')

  const applySnapshot = useCallback((snapshot: GrantEntitlements) => {
    setCurrent(snapshot)
    setSelectedModules(ensureIdentityModule(snapshot.enabledModuleCodes))
    const nextTiers: Record<string, string> = {}
    const nextLimits: Record<string, Record<string, string>> = {}
    for (const entitlement of snapshot.moduleEntitlements ?? []) {
      nextTiers[entitlement.moduleCode] = String(entitlement.tier)
      nextLimits[entitlement.moduleCode] = Object.fromEntries(
        Object.entries(entitlement.limits ?? {}).map(([key, value]) => [key, String(value)])
      )
    }
    for (const module of snapshot.enabledModuleCodes) {
      if (nextLimits[module]) continue
      nextLimits[module] = Object.fromEntries(
        Object.entries(getModuleDefaultLimits(module) ?? {}).map(([key, value]) => [key, String(value)])
      )
    }
    setTiers(nextTiers)
    setLimits(nextLimits)
  }, [])

  useEffect(() => {
    if (!grantId) return
    let cancelled = false
    setLoading(true)
    void getGrantEntitlements(grantId)
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(readApiError(err, 'No se pudieron cargar los módulos de la licencia.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applySnapshot, grantId])

  const isCloud = current?.deploymentMode === 'CloudShared'
  const isActive = current?.status === 'Active'
  const canEdit = isCloud && isActive
  const editableModules = useMemo(
    () => MODULES_WITH_LIMITS.filter((module) => selectedModules.includes(module.code)),
    [selectedModules]
  )

  const updateModules = useCallback(
    (codes: string[]) => {
      const normalized = ensureIdentityModule(codes)
      const dependencyErrors = validateModuleDependencies(normalized)
      if (dependencyErrors.length > 0) {
        toast.show({
          title: 'Dependencias de módulos',
          message: dependencyErrors[0],
          variant: 'warning',
        })
        return
      }
      setSelectedModules(normalized)
    },
    [toast]
  )

  const setLimit = useCallback((moduleCode: string, key: string, value: string) => {
    setLimits((prev) => ({
      ...prev,
      [moduleCode]: { ...(prev[moduleCode] ?? {}), [key]: value },
    }))
  }, [])

  const onSubmit = useCallback(async () => {
    if (!grantId || !canEdit) return
    setError(null)
    setBusy(true)
    try {
      const moduleEntitlements: ModuleEntitlement[] = selectedModules.map((code) => {
        const moduleLimits: Record<string, number> = {}
        for (const [key, raw] of Object.entries(limits[code] ?? {})) {
          if (raw.trim() === '') continue
          const parsed = Number(raw)
          if (!Number.isFinite(parsed) || parsed < 0) continue
          moduleLimits[key] = parsed
        }
        return {
          moduleCode: code,
          tier: Number(tiers[code] ?? '0'),
          limits: Object.keys(moduleLimits).length > 0 ? moduleLimits : undefined,
        }
      })

      const updated = await updateGrantEntitlements(grantId, {
        enabledModuleCodes: selectedModules,
        moduleEntitlements,
        reason: reason.trim() || null,
      })
      applySnapshot(updated)
      setReason('')
      toast.show({
        title: 'Módulos actualizados',
        message: `Versión ${updated.entitlementsVersion}. El tenant los aplicará en su próxima validación.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const message = readApiError(err, 'No se pudieron guardar los módulos.')
      setError(message)
      toast.show({ title: 'No se pudo guardar', message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }, [applySnapshot, canEdit, grantId, limits, reason, selectedModules, tiers, toast])

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Módulos de la licencia"
        subtitle="Habilita o deshabilita módulos del cliente cloud. El tenant los sincroniza en su próxima validación online."
        badge={
          <StatusBadge tone={canEdit ? 'primary' : 'warning'}>
            {current ? `${current.deploymentMode} · v${current.entitlementsVersion}` : 'Cargando'}
          </StatusBadge>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate('/app/licencias/historial')}
          >
            <ArrowLeft size={16} aria-hidden /> Volver
          </Button>
        }
      />

      {!loading && !isCloud ? (
        <div className="ecu-form-error-banner" role="alert">
          <TriangleAlert size={16} aria-hidden />
          <span>
            Esta licencia es {current?.deploymentMode}. En on-premise los módulos se aplican
            reemitiendo la licencia.
          </span>
        </div>
      ) : null}

      {!loading && isCloud && !isActive ? (
        <div className="ecu-form-error-banner" role="alert">
          <TriangleAlert size={16} aria-hidden />
          <span>Solo una licencia activa admite cambios de módulos.</span>
        </div>
      ) : null}

      {error ? (
        <div className="ecu-form-error-banner" role="alert">
          <TriangleAlert size={16} aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <SectionCard title="Módulos habilitados">
        <ModuleChipList selected={selectedModules} onChange={updateModules} />
      </SectionCard>

      {editableModules.length > 0 ? (
        <SectionCard title="Tier y límites por módulo">
          {editableModules.map((module) => {
            const limitKeys = Object.keys(getModuleDefaultLimits(module.code) ?? {})
            return (
              <div key={module.code} className="module-tier-row module-tier-row--stack">
                <div className="issue-license-form-grid">
                  <EcuLabeledDropDown
                    id={`grant-tier-${module.code}`}
                    label={`${module.label} · Tier`}
                    dataSource={TIER_OPTIONS}
                    value={tiers[module.code] ?? '0'}
                    onChange={(value) => setTiers((prev) => ({ ...prev, [module.code]: value }))}
                    disabled={!canEdit}
                  />
                </div>
                {limitKeys.length > 0 ? (
                  <div className="issue-license-form-grid">
                    {limitKeys.map((key) => (
                      <TextBox
                        key={key}
                        label={limitKeyLabel(key)}
                        labelPosition="outlined"
                        variant="outline"
                        size="md"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={limits[module.code]?.[key] ?? ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setLimit(module.code, key, e.target.value)
                        }
                        placeholder="ilimitado"
                        disabled={!canEdit}
                        fullWidth
                        theme={theme}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </SectionCard>
      ) : null}

      <SectionCard title="Motivo del cambio">
        <TextBox
          id="grant-entitlements-reason"
          label="Motivo (auditoría)"
          labelPosition="outlined"
          variant="outline"
          value={reason}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          placeholder="Ej. Upgrade comercial a plan Big"
          disabled={!canEdit}
          fullWidth
          theme={theme}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="primary" loading={busy} disabled={!canEdit || busy} onClick={() => void onSubmit()}>
            Guardar módulos
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void navigate('/app/licencias/historial')}
          >
            Cancelar
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Resumen" subtitle="La plataforma audita cada cambio y el tenant lo aplica al iniciar sesión.">
        <ul>
          <li><LayoutGrid size={14} aria-hidden /> Módulos: {selectedModules.length}</li>
          <li><SlidersHorizontal size={14} aria-hidden /> Versión actual: {current?.entitlementsVersion ?? '—'}</li>
        </ul>
      </SectionCard>
    </div>
  )
}
