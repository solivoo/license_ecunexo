import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import { formatDateTime } from '@/lib/formatDate'
import type { LicenseListItem } from '@/lib/platformLicensingApi'
import { LicenseActionsCell } from './licensesGridActions'
import { LicenseCustomerCell, LicensePlanCell, LicenseStatusCell } from './licensesGridTemplates'
import '../operators/operatorsGrid.css'
import './licensesGrid.css'

export type LicenseGridRow = LicenseListItem & Record<string, unknown>

export type LicensesGridProps = {
  readonly rows: LicenseListItem[]
  readonly loading?: boolean
  readonly onExpand?: (row: LicenseListItem) => void
  readonly onManageModules?: (row: LicenseListItem) => void
  readonly onManageTenants?: (row: LicenseListItem) => void
  readonly toolbarRight?: ReactNode
}

const gridMessages = createSpanishDataGridMessages('licencia', 'licencias', {
  emptyMessage: 'No hay licencias emitidas.',
})

export function LicensesGrid({
  rows,
  loading = false,
  onExpand,
  onManageModules,
  onManageTenants,
  toolbarRight,
}: LicensesGridProps) {
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging()

  const columns = useMemo((): ColumnDef<LicenseGridRow>[] => {
    return [
      {
        key: 'customerLegalName',
        header: 'Cliente',
        width: 220,
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => (
          <LicenseCustomerCell {...row} />
        ),
      },
      {
        key: 'ownerEmail',
        header: 'Titular',
        width: 220,
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => row.ownerEmail ?? '—',
      },
      {
        key: 'planLabel',
        header: 'Plan',
        width: 220,
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => (
          <LicensePlanCell {...row} />
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        width: 120,
        align: 'center',
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => (
          <LicenseStatusCell status={String(row.status)} />
        ),
      },
      {
        key: 'issuedAtUtc',
        header: 'Emitida',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => formatDateTime(String(row.issuedAtUtc)),
      },
      {
        key: 'expiresAtUtc',
        header: 'Expira',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: LicenseGridRow) => formatDateTime(String(row.expiresAtUtc)),
      },
      {
        key: 'provisioningSlotsRemaining',
        header: 'Cupos',
        width: 90,
        align: 'center',
        sortable: true,
      },
      {
        key: 'issuedByOperatorName',
        header: 'Operador',
        width: 160,
        sortable: true,
      },
      {
        key: 'supersedesGrantId',
        header: 'Acciones',
        width: 120,
        align: 'center',
        sortable: false,
        sticky: 'right',
        renderCell: (_value: unknown, row: LicenseGridRow) => (
          <LicenseActionsCell
            {...row}
            onExpand={onExpand}
            onManageModules={onManageModules}
            onManageTenants={onManageTenants}
          />
        ),
      },
    ]
  }, [onExpand, onManageModules, onManageTenants])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as LicenseGridRow[],
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
      messages={gridMessages}
      stickyFirstColumn
    />
  )
}
