import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { Calendar, Check, Mail, X } from 'lucide-react'
import { GridIconButton } from '@/components/ui/GridIconButton'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { formatDateTime } from '@/lib/formatDate'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import type { TrainingSessionItem } from '@/lib/platformLicensingApi'
import '../operators/operatorsGrid.css'
import '../licensing/licensesGrid.css'

export type TrainingGridRow = TrainingSessionItem & Record<string, unknown>

export type TrainingSessionsGridProps = {
  readonly rows: TrainingSessionItem[]
  readonly loading?: boolean
  readonly onComplete: (id: string) => void
  readonly onCancel: (id: string) => void
  readonly onDownloadCalendar: (id: string) => void
  readonly onSendInvite?: (id: string) => void
  readonly toolbarRight?: ReactNode
}

const gridMessages = createSpanishDataGridMessages('sesión', 'sesiones', {
  emptyMessage: 'No hay capacitaciones.',
})

const KIND_LABELS: Record<string, string> = {
  Onboarding: 'Onboarding',
  Refresher: 'Refresco',
  Advanced: 'Avanzada',
  Custom: 'Personalizada',
}

const STATUS_LABELS: Record<string, string> = {
  Scheduled: 'Agendada',
  Completed: 'Completada',
  Cancelled: 'Cancelada',
}

const MODALITY_LABELS: Record<string, string> = {
  Virtual: 'Virtual',
  OnSite: 'Presencial',
}

export function TrainingSessionsGrid({
  rows,
  loading = false,
  onComplete,
  onCancel,
  onDownloadCalendar,
  onSendInvite,
  toolbarRight,
}: TrainingSessionsGridProps) {
  const theme = useGluComponentTheme()
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging(10)

  const columns = useMemo((): ColumnDef<TrainingGridRow>[] => {
    return [
      {
        key: 'topic',
        header: 'Tema',
        width: 220,
        sortable: true,
        renderCell: (_value, row) => (
          <div className="ecu-op-grid__person">
            <span className="ecu-op-grid__person-text">
              <span className="ecu-op-grid__person-name">{row.topic}</span>
              {row.notes ? <span className="ecu-op-grid__person-email">{row.notes}</span> : null}
            </span>
          </div>
        ),
      },
      {
        key: 'kind',
        header: 'Tipo',
        width: 120,
        sortable: true,
        renderCell: (value) => KIND_LABELS[String(value)] ?? String(value),
      },
      {
        key: 'modality',
        header: 'Modalidad',
        width: 120,
        sortable: true,
        renderCell: (value) => MODALITY_LABELS[String(value)] ?? String(value),
      },
      {
        key: 'durationHours',
        header: 'Duración',
        width: 90,
        align: 'center',
        sortable: true,
        renderCell: (value) => `${value}h`,
      },
      {
        key: 'scheduledAt',
        header: 'Programada',
        width: 170,
        sortable: true,
        renderCell: (value) => formatDateTime(String(value)),
      },
      {
        key: 'status',
        header: 'Estado',
        width: 120,
        align: 'center',
        sortable: true,
        renderCell: (value) => {
          const status = String(value)
          const tone =
            status === 'Completed' ? 'success' : status === 'Cancelled' ? 'muted' : 'success'
          return (
            <span className={`ecu-op-grid__badge ecu-op-grid__badge--${tone}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
          )
        },
      },
      {
        key: 'id',
        header: 'Acciones',
        width: 140,
        align: 'center',
        sortable: false,
        sticky: 'right',
        renderCell: (_value, row) =>
          row.status === 'Scheduled' ? (
            <div className="ecu-licenses-grid__actions">
              <GridIconButton
                label="Descargar invitación"
                icon={Calendar}
                onClick={() => onDownloadCalendar(row.id)}
              />
              {onSendInvite && row.attendeeEmails && row.attendeeEmails.length > 0 ? (
                <GridIconButton
                  label="Enviar invitación por correo a los asistentes"
                  icon={Mail}
                  onClick={() => onSendInvite(row.id)}
                />
              ) : null}
              <GridIconButton label="Completar" icon={Check} onClick={() => onComplete(row.id)} />
              <GridIconButton label="Cancelar" icon={X} danger onClick={() => onCancel(row.id)} />
            </div>
          ) : null,
      },
    ]
  }, [onCancel, onComplete, onDownloadCalendar, onSendInvite])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as TrainingGridRow[],
    [rows],
  )

  return (
    <DataGrid
      className="ecu-companies-grid"
      dataSource={dataSource}
      keyExpr="id"
      columns={columns}
      selectionMode="none"
      showSearch
      searchPosition="left"
      searchWidth={280}
      toolbarRight={toolbarRight}
      paging={paging}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      paginationMode="client"
      pageSizeOptions={pageSizeOptions}
      layout="auto"
      cardBreakpoint={720}
      virtualized
      virtualThreshold={40}
      showRowCount
      fullWidth
      loading={loading}
      theme={theme}
      messages={gridMessages}
      stickyFirstColumn
    />
  )
}
