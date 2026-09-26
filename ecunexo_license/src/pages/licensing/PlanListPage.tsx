import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, Layers, Plus } from 'lucide-react'
import { Button, OptionGroup } from 'glubox'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import { EmptyState, GridToolbarRefresh, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { deactivatePlan, listPlans, type PlanListItem } from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { PlansGrid } from './PlansGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
] as const

export function PlanListPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPlans(true)
      setPlans(data)
      setError(null)
    } catch (err: unknown) {
      setError(readApiError(err, 'No se pudieron cargar los planes.'))
      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listPlans(true)
      .then((data) => {
        if (cancelled) return
        setPlans(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(readApiError(err, 'No se pudieron cargar los planes.'))
        setErrorOpen(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'active') return plans.filter((p) => p.isActive)
    if (statusFilter === 'inactive') return plans.filter((p) => !p.isActive)
    return plans
  }, [plans, statusFilter])

  const metrics = useMemo(() => {
    const total = plans.length
    const active = plans.filter((p) => p.isActive).length
    const inactive = plans.filter((p) => !p.isActive).length
    return { total, active, inactive }
  }, [plans])

  const handleDeactivate = useCallback(
    async (code: string) => {
      setDeactivating(code)
      setConfirmDeactivate(null)
      try {
        await deactivatePlan(code)
        await loadPlans()
      } catch (err: unknown) {
        setError(readApiError(err, `No se pudo desactivar «${code}».`))
        setErrorOpen(true)
      } finally {
        setDeactivating(null)
      }
    },
    [loadPlans],
  )

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Planes y Módulos"
        subtitle="Catálogo de planes comerciales. Los planes activos se muestran al emitir licencias."
        badge={
          <StatusBadge tone="primary" withDot>
            Catálogo
          </StatusBadge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              
              onClick={() => navigate('/app/planes/nuevo')}
            >
              <Plus size={16} aria-hidden />
              Crear plan
            </Button>
          </>
        }
      />

      <div className="ecu-stat-grid">
        <StatCard
          label="Total planes"
          value={loading ? '—' : metrics.total}
          icon={<Layers size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Catálogo comercial"
        />
        <StatCard
          label="Planes activos"
          value={loading ? '—' : metrics.active}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Disponibles
            </StatusBadge>
          }
        />
        <StatCard
          label="Inactivos / Retirados"
          value={loading ? '—' : metrics.inactive}
          icon={<Ban size={22} strokeWidth={1.75} />}
          toneColor="#f59e0b"
          badge={
            metrics.inactive > 0 ? (
              <StatusBadge tone="neutral">Archivados</StatusBadge>
            ) : undefined
          }
        />
      </div>

      <SectionCard
        title="Planes Configurados"
        subtitle="Esquemas comerciales, módulos incluidos y tarifas sugeridas"
        action={
          <OptionGroup
            id="plans-status-filter"
            name="plansStatus"
            layout="segmented"
            variant="outline"
            size="sm"
            
            options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            disabled={loading}
          />
        }
      >
        {!loading && visibleRows.length === 0 ? (
          <EmptyState
            icon={<Layers size={32} strokeWidth={1.75} />}
            title="No se encontraron planes"
            description={
              statusFilter !== 'all'
                ? 'No existen planes registrados para el filtro de estado seleccionado.'
                : 'Crea el primer plan comercial para habilitar la emisión de licencias.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  
                  onClick={() => navigate('/app/planes/nuevo')}
                >
                  <Plus size={16} aria-hidden />
                  Crear primer plan
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todos los planes
                </Button>
              )
            }
          />
        ) : (
          <PlansGrid
            rows={visibleRows}
            loading={loading}
            deactivatingCode={deactivating}
            onEdit={(code) => navigate(`/app/planes/${encodeURIComponent(code)}`)}
            onDeactivate={setConfirmDeactivate}
            toolbarRight={
              <div className="ecu-grid-toolbar-actions">
                <GridToolbarRefresh loading={loading} onRefresh={() => void loadPlans()} />
              </div>
            }
          />
        )}
      </SectionCard>

      <EcuAlertDialog
        open={confirmDeactivate !== null}
        title="Desactivar plan"
        message={`¿Estás seguro de desactivar «${confirmDeactivate}»? Las licencias ya emitidas con este plan seguirán funcionando, pero el plan no aparecerá al crear nuevas licencias.`}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        confirmLabel="Desactivar"
      />

      <EcuAlertDialog
        open={errorOpen}
        title="Error"
        message={error ?? 'Error inesperado.'}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
      />
    </div>
  )
}

