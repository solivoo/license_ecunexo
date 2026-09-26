import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, TextBox, useToast } from 'glubox'
import { ArrowLeft, Building2, LayoutGrid, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { GrantEntitlementsForm } from '@/components/licensing/GrantEntitlementsForm'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui'
import { createGrantEntitlementsDraft, toModuleEntitlements } from '@/lib/grantEntitlements'
import { readApiError } from '@/lib/readApiError'
import {
  getGrantEntitlements,
  updateGrantEntitlements,
  type GrantEntitlements,
} from '@/lib/platformLicensingApi'

export function GrantModulesPage() {
  const { grantId } = useParams<{ grantId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

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
    const draft = createGrantEntitlementsDraft(
      snapshot.enabledModuleCodes,
      snapshot.moduleEntitlements
    )
    setSelectedModules(draft.selectedModules)
    setTiers(draft.tiers)
    setLimits(draft.limits)
  }, [])

  useEffect(() => {
    if (!grantId) return
    let cancelled = false
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

  const setTier = useCallback((moduleCode: string, tier: string) => {
    setTiers((prev) => ({ ...prev, [moduleCode]: tier }))
  }, [])

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
      const updated = await updateGrantEntitlements(grantId, {
        enabledModuleCodes: selectedModules,
        moduleEntitlements: toModuleEntitlements(selectedModules, tiers, limits),
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
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!grantId}
              onClick={() => void navigate(`/app/licencias/${grantId}/empresas`)}
            >
              <Building2 size={16} aria-hidden /> Empresas
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate('/app/licencias/historial')}
            >
              <ArrowLeft size={16} aria-hidden /> Volver
            </Button>
          </>
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

      <GrantEntitlementsForm
        selectedModules={selectedModules}
        tiers={tiers}
        limits={limits}
        disabled={!canEdit}
        idPrefix="grant"
        onSelectedModulesChange={setSelectedModules}
        onTierChange={setTier}
        onLimitChange={setLimit}
      />

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
