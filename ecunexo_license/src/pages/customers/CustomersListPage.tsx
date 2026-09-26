import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, KeyRound, Plus, Users } from 'lucide-react'
import { Button, OptionGroup } from 'glubox'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import { EmptyState, GridToolbarRefresh, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import {
  deactivateLicensingCustomer,
  listLicensingCustomers,
  type LicensingCustomerListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { customerDeletePrompt } from './customerDeleteMessage'
import { CustomersGrid } from './CustomersGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'Active', label: 'Activos' },
  { value: 'Suspended', label: 'Suspendidos' },
] as const

export function CustomersListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LicensingCustomerListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LicensingCustomerListItem | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLicensingCustomers()
      setLoadError(null)
      setRows(data)
    } catch (err) {
      setLoadError(readApiError(err, 'No se pudo cargar clientes.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listLicensingCustomers()
      .then((data) => {
        if (cancelled) return
        setLoadError(null)
        setRows(data)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(readApiError(err, 'No se pudo cargar clientes.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => r.status === 'Active').length
    const suspended = rows.filter((r) => r.status === 'Suspended').length
    const totalLicenses = rows.reduce((acc, r) => acc + (r.licensesIssued || 0), 0)
    return { total, active, suspended, totalLicenses }
  }, [rows])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    setActionBusyId(confirmDelete.id)
    setConfirmDelete(null)
    try {
      await deactivateLicensingCustomer(confirmDelete.id)
      await load()
    } catch (err: unknown) {
      setError(readApiError(err, 'No se pudo eliminar el cliente.'))
      setErrorOpen(true)
    } finally {
      setActionBusyId(null)
    }
  }, [confirmDelete, load])

  const deletePrompt = confirmDelete ? customerDeletePrompt(confirmDelete) : null

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Directorio de Clientes"
        subtitle="Administración de empresas titulares y cuentas de licenciamiento"
        badge={
          <StatusBadge tone="primary" withDot>
            Directorio
          </StatusBadge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              
              onClick={() => navigate('/app/clientes/nuevo')}
            >
              <Plus size={16} aria-hidden />
              Nuevo cliente
            </Button>
          </>
        }
      />

      {loadError ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="ecu-stat-grid">
        <StatCard
          label="Total clientes"
          value={loading ? '—' : metrics.total}
          icon={<Users size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Directorio corporativo"
        />
        <StatCard
          label="Clientes activos"
          value={loading ? '—' : metrics.active}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Operativos
            </StatusBadge>
          }
        />
        <StatCard
          label="Suspendidos"
          value={loading ? '—' : metrics.suspended}
          icon={<AlertTriangle size={22} strokeWidth={1.75} />}
          toneColor="#f59e0b"
          badge={
            metrics.suspended > 0 ? (
              <StatusBadge tone="warning">Revisión</StatusBadge>
            ) : undefined
          }
        />
        <StatCard
          label="Licencias asignadas"
          value={loading ? '—' : metrics.totalLicenses}
          icon={<KeyRound size={22} strokeWidth={1.75} />}
          toneColor="#8b5cf6"
          footerText="Total en clientes"
        />
      </div>

      <SectionCard
        title="Clientes Registrados"
        subtitle="Directorio comercial y estado de licencias asociadas"
        action={
          <OptionGroup
            id="customers-status-filter"
            name="customersStatus"
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
            icon={<Users size={32} strokeWidth={1.75} />}
            title="No se encontraron clientes"
            description={
              statusFilter !== 'all'
                ? 'No existen registros que coincidan con el filtro de estado seleccionado.'
                : 'Crea el primer cliente comercial para comenzar a emitir licencias.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  
                  onClick={() => navigate('/app/clientes/nuevo')}
                >
                  <Plus size={16} aria-hidden />
                  Nuevo cliente
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todos los clientes
                </Button>
              )
            }
          />
        ) : (
          <CustomersGrid
            rows={visibleRows}
            loading={loading}
            actionBusyId={actionBusyId}
            onEdit={(id) => navigate(`/app/clientes/${id}/editar`)}
            onDelete={setConfirmDelete}
            onIssueLicense={(row) =>
              navigate('/app/licencias/nueva', { state: { customer: row } })
            }
            toolbarRight={
              <div className="ecu-grid-toolbar-actions">
                <GridToolbarRefresh loading={loading} onRefresh={() => void load()} />
              </div>
            }
          />
        )}
      </SectionCard>

      <EcuAlertDialog
        open={deletePrompt !== null}
        title={deletePrompt?.title ?? 'Eliminar cliente'}
        message={deletePrompt?.message ?? ''}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        confirmLabel={deletePrompt?.confirmLabel ?? 'Sí, eliminar'}
      />
      <EcuAlertDialog
        open={errorOpen}
        title="No se pudo eliminar"
        message={error ?? 'Error inesperado.'}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
      />
    </div>
  )
}

