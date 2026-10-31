import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Ban, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react'
import { Button, OptionGroup, useToast } from 'glubox'
import { EmptyState, GridToolbarRefresh, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import {
  createOperator,
  listOperators,
  type CreateOperatorInput,
  type OperatorListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { useAppSelector } from '@/store/hooks'
import { selectCanManageOperators, selectOperatorRole } from '@/store/platformAuthSlice'
import { CreateOperatorDialog } from './CreateOperatorDialog'
import { OperatorsGrid } from './OperatorsGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
] as const

export function OperatorsListPage() {
  const toast = useToast()
  const canManage = useAppSelector(selectCanManageOperators)
  const managerRole = useAppSelector(selectOperatorRole)
  const [rows, setRows] = useState<OperatorListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)

  const load = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) setLoading(true)
    try {
      const data = await listOperators()
      setRows(data)
    } catch (err) {
      const msg = readApiError(err, 'No se pudo cargar operadores.')
      toast.show({ title: 'Error de carga', message: msg, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await listOperators()
        if (cancelled) return
        setRows(data)
      } catch (err) {
        if (cancelled) return
        const msg = readApiError(err, 'No se pudo cargar operadores.')
        toast.show({ title: 'Error de carga', message: msg, variant: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'active') return rows.filter((row) => row.isActive)
    if (statusFilter === 'inactive') return rows.filter((row) => !row.isActive)
    return rows
  }, [rows, statusFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const active = rows.filter((row) => row.isActive).length
    const inactive = rows.filter((row) => !row.isActive).length
    return { total, active, inactive }
  }, [rows])

  const handleCreate = useCallback(
    async (body: CreateOperatorInput) => {
      setCreateBusy(true)
      try {
        await createOperator(body)
        toast.show({
          title: 'Operador creado',
          message: `Operador ${body.email} creado correctamente.`,
          variant: 'success',
        })
        await load({ showLoading: true })
      } catch (err: unknown) {
        const msg = readApiError(err, 'No se pudo crear el operador.')
        toast.show({ title: 'No se pudo crear', message: msg, variant: 'error' })
      } finally {
        setCreateBusy(false)
      }
    },
    [load, toast],
  )

  if (!canManage) {
    return <Navigate to="/app/inicio" replace />
  }

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Operadores del Sistema"
        subtitle="Usuarios autorizados para emitir licencias y administrar la plataforma corporativa EcuNexo."
        badge={
          <StatusBadge tone="info" withDot>
            Seguridad
          </StatusBadge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              
              onClick={() => setDialogOpen(true)}
            >
              <UserPlus size={16} aria-hidden />
              Nuevo operador
            </Button>
          </>
        }
      />

      <div className="ecu-stat-grid">
        <StatCard
          label="Total operadores"
          value={loading ? '—' : metrics.total}
          icon={<ShieldCheck size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Acceso al panel"
        />
        <StatCard
          label="Operadores activos"
          value={loading ? '—' : metrics.active}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Habilitados
            </StatusBadge>
          }
        />
        <StatCard
          label="Inactivos / Bloqueados"
          value={loading ? '—' : metrics.inactive}
          icon={<Ban size={22} strokeWidth={1.75} />}
          toneColor="#f59e0b"
          badge={
            metrics.inactive > 0 ? (
              <StatusBadge tone="warning">Sin acceso</StatusBadge>
            ) : undefined
          }
        />
      </div>

      <SectionCard
        title="Operadores Registrados"
        subtitle="Cuentas de acceso administrativo, roles asignados y actividad reciente"
        action={
          <OptionGroup
            id="operators-status-filter"
            name="operatorsStatus"
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
            icon={<ShieldCheck size={32} strokeWidth={1.75} />}
            title="No se encontraron operadores"
            description={
              statusFilter !== 'all'
                ? 'No existen cuentas registradas con el estado seleccionado.'
                : 'Crea una cuenta de operador para delegar la gestión del licenciamiento.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  
                  onClick={() => setDialogOpen(true)}
                >
                  <UserPlus size={16} aria-hidden />
                  Nuevo operador
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todos los operadores
                </Button>
              )
            }
          />
        ) : (
          <OperatorsGrid
            rows={visibleRows}
            loading={loading}
            toolbarRight={
              <div className="ecu-grid-toolbar-actions">
                <GridToolbarRefresh
                  loading={loading}
                  onRefresh={() => void load({ showLoading: true })}
                />
              </div>
            }
          />
        )}
      </SectionCard>

      <CreateOperatorDialog
        open={dialogOpen}
        busy={createBusy}
        managerRole={managerRole}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}

