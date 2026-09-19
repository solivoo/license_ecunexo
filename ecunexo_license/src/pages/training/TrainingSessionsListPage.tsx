import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CheckCircle2, Plus, X } from 'lucide-react'
import { Button, OptionGroup, Toast, type PageActionItem } from 'glubox'
import { EcuPageActions } from '@/components/ui/EcuPageActions'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { GridDateRangeBox } from '@/components/ui/GridDateRangeBox'
import { renderSidebarIcon } from '@/config/sidebarIcons'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import { DEFAULT_GRID_LOOKBACK, rangeFromLookback, toIsoDate } from '@/lib/gridLookback'
import {
  cancelTraining,
  completeTraining,
  getTrainingCalendarInvite,
  listTrainingSessions,
  type TrainingSessionItem,
} from '@/lib/platformLicensingApi'
import { sendTrainingInviteEmail } from '@/lib/platformEmailApi'
import { readApiError } from '@/lib/readApiError'
import { TrainingSessionsGrid } from './TrainingSessionsGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'Scheduled', label: 'Agendadas' },
  { value: 'Completed', label: 'Completadas' },
  { value: 'Cancelled', label: 'Canceladas' },
] as const

function sessionDate(iso: string): string {
  return toIsoDate(new Date(iso))
}

export function TrainingSessionsListPage() {
  const theme = useGluComponentTheme()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<TrainingSessionItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [range, setRange] = useState(() => rangeFromLookback(DEFAULT_GRID_LOOKBACK))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSendInvite = async (id: string) => {
    try {
      const res = await sendTrainingInviteEmail({ sessionId: id })
      setSuccessMsg(res.message)
    } catch (err: unknown) {
      setError(readApiError(err, 'Error al enviar invitación por correo.'))
      setErrorOpen(true)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTrainingSessions()
      setSessions(data)
      setError(null)
    } catch (err: unknown) {
      setError(readApiError(err, 'No se pudieron cargar las capacitaciones.'))
      setErrorOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listTrainingSessions()
      .then((data) => {
        if (cancelled) return
        setSessions(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(readApiError(err, 'No se pudieron cargar las capacitaciones.'))
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
    return sessions.filter((session) => {
      if (statusFilter !== 'all' && session.status !== statusFilter) return false
      const day = sessionDate(session.scheduledAt)
      return day >= range.from && day <= range.to
    })
  }, [range.from, range.to, sessions, statusFilter])

  const metrics = useMemo(() => {
    const total = sessions.length
    const scheduled = sessions.filter((s) => s.status === 'Scheduled').length
    const completed = sessions.filter((s) => s.status === 'Completed').length
    const cancelled = sessions.filter((s) => s.status === 'Cancelled').length
    return { total, scheduled, completed, cancelled }
  }, [sessions])

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

  const handleComplete = async (id: string) => {
    try {
      await completeTraining(id)
      await load()
    } catch (err: unknown) {
      setError(readApiError(err, 'Error al completar.'))
      setErrorOpen(true)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelTraining(id)
      await load()
    } catch (err: unknown) {
      setError(readApiError(err, 'Error al cancelar.'))
      setErrorOpen(true)
    }
  }

  const handleDownloadCalendar = async (id: string) => {
    try {
      const invite = await getTrainingCalendarInvite(id)
      const blob = new Blob([invite.icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = invite.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(readApiError(err, 'Error al generar invitación.'))
      setErrorOpen(true)
    }
  }

  return (
    <div className="ecu-dashboard-layout">
      <PageHeader
        title="Capacitaciones"
        subtitle="Gestión de sesiones de inducción, soporte y capacitación para clientes EcuNexo."
        badge={
          <StatusBadge tone="primary" withDot>
            Capacitación
          </StatusBadge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              theme={theme}
              onClick={() => navigate('/app/capacitaciones/nueva')}
            >
              <Plus size={16} aria-hidden />
              Agendar sesión
            </Button>
            <EcuPageActions
              items={actionItems}
              variant="outline"
              triggerLabel="Acciones"
              renderIcon={renderSidebarIcon}
              onNavigate={(route: string) => navigate(route)}
              onActionSelect={(item) => {
                if (item.id === 'refresh') void load()
              }}
            />
          </>
        }
      />

      <div className="ecu-stat-grid">
        <StatCard
          label="Total sesiones"
          value={loading ? '—' : metrics.total}
          icon={<Calendar size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Historial acumulado"
        />
        <StatCard
          label="Agendadas"
          value={loading ? '—' : metrics.scheduled}
          icon={<Calendar size={22} strokeWidth={1.75} />}
          toneColor="#0284c7"
          badge={
            <StatusBadge tone="info" withDot>
              Pendientes
            </StatusBadge>
          }
        />
        <StatCard
          label="Completadas"
          value={loading ? '—' : metrics.completed}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Realizadas
            </StatusBadge>
          }
        />
        <StatCard
          label="Canceladas"
          value={loading ? '—' : metrics.cancelled}
          icon={<X size={22} strokeWidth={1.75} />}
          toneColor="#ef4444"
          badge={
            metrics.cancelled > 0 ? (
              <StatusBadge tone="danger">Anuladas</StatusBadge>
            ) : undefined
          }
        />
      </div>

      <SectionCard
        title="Sesiones Registradas"
        subtitle="Cronograma y modalidad de capacitaciones programadas"
        action={
          <OptionGroup
            id="training-status-filter"
            name="trainingStatus"
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
            icon={<Calendar size={32} strokeWidth={1.75} />}
            title="No se encontraron sesiones"
            description={
              statusFilter !== 'all'
                ? 'No existen capacitaciones en el rango de fechas para el estado seleccionado.'
                : 'Agenda una nueva sesión de capacitación para comenzar.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  theme={theme}
                  onClick={() => navigate('/app/capacitaciones/nueva')}
                >
                  <Plus size={16} aria-hidden />
                  Agendar sesión
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  theme={theme}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todas las sesiones
                </Button>
              )
            }
          />
        ) : (
          <TrainingSessionsGrid
            rows={visibleRows}
            loading={loading}
            onComplete={(id) => void handleComplete(id)}
            onCancel={(id) => void handleCancel(id)}
            onDownloadCalendar={(id) => void handleDownloadCalendar(id)}
            onSendInvite={(id) => void handleSendInvite(id)}
            toolbarRight={
              <div className="ecu-grid-date-range">
                <GridDateRangeBox
                  from={range.from}
                  to={range.to}
                  disabled={loading}
                  onChange={setRange}
                />
              </div>
            }
          />
        )}
      </SectionCard>

      <EcuAlertDialog
        open={errorOpen}
        title="Error"
        message={error ?? 'Error inesperado.'}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
      />

      {successMsg && (
        <Toast
          title={successMsg}
          variant="success"
          onClose={() => setSuccessMsg(null)}
        />
      )}
    </div>
  )
}

