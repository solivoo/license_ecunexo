import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Ban, CheckCircle2, KeyRound, Plus } from 'lucide-react'
import { Button, OptionGroup, useToast } from 'glubox'
import {
  EmptyState,
  GridToolbarRefresh,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '@/components/ui'
import {
  listLicenses,
  type LicenseListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { LicensesGrid } from './LicensesGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'Active', label: 'Activas' },
  { value: 'Revoked', label: 'Revocadas' },
  { value: 'Exhausted', label: 'Agotadas' },
] as const

export function LicensesListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [rows, setRows] = useState<LicenseListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLicenses()
      setRows(data)
    } catch (err) {
      toast.show({
        title: 'Error de carga',
        message: readApiError(err, 'No se pudo cargar licencias emitidas.'),
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let cancelled = false
    listLicenses()
      .then((data) => {
        if (cancelled) return
        setRows(data)
      })
      .catch((err) => {
        if (cancelled) return
        toast.show({
          title: 'Error de carga',
          message: readApiError(err, 'No se pudo cargar licencias emitidas.'),
          variant: 'error',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => r.status === 'Active').length
    const revoked = rows.filter((r) => r.status === 'Revoked').length
    const exhausted = rows.filter((r) => r.status === 'Exhausted').length
    return { total, active, revoked, exhausted }
  }, [rows])

  const handleExpand = useCallback(
    (row: LicenseListItem) => {
      navigate(`/app/licencias/${row.id}/reemitir`)
    },
    [navigate],
  )

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Historial de Licencias"
        subtitle="Control de licencias emitidas por cliente. Permite modificar cupos o módulos a medida, renovar vigencias y administrar los accesos de cada empresa."
        badge={
          <StatusBadge tone="primary" withDot>
            Licencias
          </StatusBadge>
        }
      />

      <div className="ecu-stat-grid">
        <StatCard
          label="Total licencias"
          value={loading ? '—' : metrics.total}
          icon={<KeyRound size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Emisiones registradas"
        />
        <StatCard
          label="Licencias activas"
          value={loading ? '—' : metrics.active}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Operativas
            </StatusBadge>
          }
        />
        <StatCard
          label="Revocadas"
          value={loading ? '—' : metrics.revoked}
          icon={<Ban size={22} strokeWidth={1.75} />}
          toneColor="#ef4444"
          badge={
            metrics.revoked > 0 ? (
              <StatusBadge tone="danger">Revocadas</StatusBadge>
            ) : undefined
          }
        />
        <StatCard
          label="Agotadas"
          value={loading ? '—' : metrics.exhausted}
          icon={<AlertTriangle size={22} strokeWidth={1.75} />}
          toneColor="#f59e0b"
          badge={
            metrics.exhausted > 0 ? (
              <StatusBadge tone="warning">Sin cupos</StatusBadge>
            ) : undefined
          }
        />
      </div>

      <SectionCard
        title="Licencias Emitidas"
        subtitle="Cada licencia es independiente por cliente; al modificar cupos, módulos o renovar vigencia se emite un nuevo certificado firmado y se revoca el anterior."
        action={
          <OptionGroup
            id="licenses-status-filter"
            name="licensesStatus"
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
            icon={<KeyRound size={32} strokeWidth={1.75} />}
            title="No se encontraron licencias"
            description={
              statusFilter !== 'all'
                ? 'No existen licencias emitidas con el estado seleccionado.'
                : 'Genera la primera licencia comercial para activar un entorno de cliente.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void navigate('/app/licencias/nueva')}
                >
                  <Plus size={16} aria-hidden />
                  Emitir primera licencia
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todas las licencias
                </Button>
              )
            }
          />
        ) : (
          <LicensesGrid
            rows={visibleRows}
            loading={loading}
            onExpand={handleExpand}
            onManageModules={(row) => navigate(`/app/licencias/${row.id}/modulos`)}
            onManageTenants={(row) => navigate(`/app/licencias/${row.id}/empresas`)}
            toolbarRight={
              <div className="ecu-grid-toolbar-actions">
                <GridToolbarRefresh loading={loading} onRefresh={() => void load()} />
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading}
                  onClick={() => void navigate('/app/licencias/nueva')}
                >
                  <Plus size={16} aria-hidden />
                  Emitir licencia
                </Button>
              </div>
            }
          />
        )}
      </SectionCard>
    </div>
  )
}
