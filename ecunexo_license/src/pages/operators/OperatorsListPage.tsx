import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Ban, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react'
import { Button, OptionGroup, type PageActionItem } from 'glubox'
import { EcuPageActions } from '@/components/ui/EcuPageActions'
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { renderSidebarIcon } from '@/config/sidebarIcons'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
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
  const theme = useGluComponentTheme()
  const navigate = useNavigate()
  const canManage = useAppSelector(selectCanManageOperators)
  const managerRole = useAppSelector(selectOperatorRole)
  const [rows, setRows] = useState<OperatorListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)

  const load = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) setLoading(true)
    try {
      const data = await listOperators()
      setLoadError(null)
      setRows(data)
    } catch (err) {
      setLoadError(readApiError(err, 'No se pudo cargar operadores.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await listOperators()
        if (cancelled) return
        setLoadError(null)
        setRows(data)
      } catch (err) {
        if (cancelled) return
        setLoadError(readApiError(err, 'No se pudo cargar operadores.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const actionItems = useMemo(
    (): PageActionItem[] => [
      {
        id: 'refresh',
        label: 'Actualizar',
        icon: 'refresh-cw',
        route: null,
        disabled: loading,
      },
    ],
    [loading],
  )

  const handleCreate = useCallback(
    async (body: CreateOperatorInput) => {
      setCreateBusy(true)
      setSuccessMessage(null)
      try {
        await createOperator(body)
        setSuccessMessage(`Operador ${body.email} creado correctamente.`)
        await load({ showLoading: true })
      } catch (err: unknown) {
        setLoadError(readApiError(err, 'No se pudo crear el operador.'))
      } finally {
        setCreateBusy(false)
      }
    },
    [load],
  )

  if (!canManage) {
    return <Navigate to="/app/inicio" replace />
  }

  return (
    <div className="ecu-dashboard-layout">
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
              theme={theme}
              onClick={() => setDialogOpen(true)}
            >
              <UserPlus size={16} aria-hidden />
              Nuevo operador
            </Button>
            <EcuPageActions
              items={actionItems}
              variant="outline"
              triggerLabel="Acciones"
              renderIcon={renderSidebarIcon}
              onNavigate={(route: string) => navigate(route)}
              onActionSelect={(item) => {
                if (item.id === 'refresh') void load({ showLoading: true })
              }}
            />
          </>
        }
      />

      {successMessage ? (
        <p className="platform-shell__alert platform-shell__alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {loadError ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {loadError}
        </p>
      ) : null}

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
            theme={theme}
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
                  theme={theme}
                  onClick={() => setDialogOpen(true)}
                >
                  <UserPlus size={16} aria-hidden />
                  Nuevo operador
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  theme={theme}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todos los operadores
                </Button>
              )
            }
          />
        ) : (
          <OperatorsGrid rows={visibleRows} loading={loading} />
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

