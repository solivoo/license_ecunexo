import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { Ban, Pencil } from 'lucide-react'
import { GridIconButton } from '@/components/ui/GridIconButton'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { TENANT_MODULE_OPTIONS } from '@/constants/tenantModules'
import { formatDateTime } from '@/lib/formatDate'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import type { PlanListItem } from '@/lib/platformLicensingApi'
import '../operators/operatorsGrid.css'
import './licensesGrid.css'

export type PlanGridRow = PlanListItem & Record<string, unknown>

export type PlansGridProps = {
  readonly rows: PlanListItem[]
  readonly loading?: boolean
  readonly deactivatingCode?: string | null
  readonly onEdit: (code: string) => void
  readonly onDeactivate: (code: string) => void
  readonly toolbarRight?: ReactNode
}

const gridMessages = createSpanishDataGridMessages('plan', 'planes')

function moduleLabel(modules: string[]): string {
  return modules
    .map((c) => TENANT_MODULE_OPTIONS.find((m) => m.code === c)?.label ?? c)
    .join(', ')
}

export function PlansGrid({
  rows,
  loading = false,
  deactivatingCode,
  onEdit,
  onDeactivate,
  toolbarRight,
}: PlansGridProps) {
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging(10)

  const columns = useMemo((): ColumnDef<PlanGridRow>[] => {
    return [
      {
        key: 'displayName',
        header: 'Plan',
        width: 220,
        sortable: true,
        renderCell: (_value, row) => (
          <div className="ecu-op-grid__person">
            <span className="ecu-op-grid__person-text">
              <span className="ecu-op-grid__person-name">{row.displayName}</span>
              <span className="ecu-op-grid__person-email">{row.code}</span>
            </span>
          </div>
        ),
      },
      {
        key: 'enabledModuleCodesDefault',
        header: 'Módulos',
        width: 280,
        sortable: false,
        renderCell: (_value, row) => moduleLabel(row.enabledModuleCodesDefault),
      },
      {
        key: 'suggestedPriceUsdMonthly',
        header: 'Precio',
        width: 120,
        sortable: true,
        renderCell: (value) =>
          value != null ? `$${Number(value).toFixed(2)}/mes` : '—',
      },
      {
        key: 'isActive',
        header: 'Estado',
        width: 110,
        align: 'center',
        sortable: true,
        renderCell: (_value, row) => (
          <span className={`ecu-status ecu-status--${row.isActive ? 'active' : 'inactive'}`}>
            <span className="ecu-status__dot" aria-hidden />
            {row.isActive ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        key: 'updatedAt',
        header: 'Actualizado',
        width: 160,
        sortable: true,
        renderCell: (value) => (value ? formatDateTime(String(value)) : '—'),
      },
      {
        key: 'code',
        header: 'Acciones',
        width: 120,
        align: 'center',
        sortable: false,
        sticky: 'right',
        renderCell: (_value, row) => (
          <div className="ecu-licenses-grid__actions">
            <GridIconButton label="Editar plan" icon={Pencil} onClick={() => onEdit(row.code)} />
            {row.isActive ? (
              <GridIconButton
                label="Desactivar plan"
                icon={Ban}
                danger
                loading={deactivatingCode === row.code}
                disabled={deactivatingCode === row.code}
                onClick={() => onDeactivate(row.code)}
              />
            ) : null}
          </div>
        ),
      },
    ]
  }, [deactivatingCode, onDeactivate, onEdit])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as PlanGridRow[],
    [rows],
  )

  return (
    <DataGrid
      className="ecu-companies-grid"
      dataSource={dataSource}
      keyExpr="code"
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
      
      messages={gridMessages}
      stickyFirstColumn
    />
  )
}
