import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import { formatDateTime } from '@/lib/formatDate'
import { StatusBadge } from '@/components/ui'
import type { GrantTenantItem } from '@/lib/platformLicensingApi'
import './licensesGrid.css'

export type GrantTenantGridRow = GrantTenantItem & Record<string, unknown>

export type GrantTenantsGridProps = {
  readonly rows: GrantTenantItem[]
  readonly loading?: boolean
  readonly selectedTenantId?: string | null
  readonly onSelect?: (row: GrantTenantItem) => void
  readonly toolbarRight?: ReactNode
}

const gridMessages = createSpanishDataGridMessages('empresa', 'empresas', {
  emptyMessage: 'No hay empresas reportadas.',
})

function TenantStatusCell(props: GrantTenantGridRow) {
  return props.hasOverride ? (
    <StatusBadge tone="primary" withDot>
      Personalizado
    </StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Heredado</StatusBadge>
  )
}

export function GrantTenantsGrid({
  rows,
  loading = false,
  selectedTenantId,
  onSelect,
  toolbarRight,
}: GrantTenantsGridProps) {
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging()

  const columns = useMemo((): ColumnDef<GrantTenantGridRow>[] => {
    return [
      {
        key: 'name',
        header: 'Empresa',
        width: 260,
        sortable: true,
      },
      {
        key: 'hasOverride',
        header: 'Estado',
        width: 150,
        align: 'center',
        sortable: true,
        renderCell: (_value: unknown, row: GrantTenantGridRow) => (
          <TenantStatusCell {...row} />
        ),
      },
      {
        key: 'overrideVersion',
        header: 'Versión',
        width: 100,
        align: 'center',
        sortable: true,
        renderCell: (_value: unknown, row: GrantTenantGridRow) =>
          row.hasOverride ? `v${row.overrideVersion}` : '—',
      },
      {
        key: 'reportedAtUtc',
        header: 'Reportada',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: GrantTenantGridRow) => formatDateTime(row.reportedAtUtc),
      },
      {
        key: 'overrideUpdatedAtUtc',
        header: 'Override',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: GrantTenantGridRow) =>
          formatDateTime(row.overrideUpdatedAtUtc),
      },
    ]
  }, [])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as GrantTenantGridRow[],
    [rows],
  )

  return (
    <DataGrid
      className="ecu-companies-grid"
      dataSource={dataSource}
      keyExpr="tenantId"
      columns={columns}
      selectionMode="single"
      selectedRowIds={selectedTenantId ? [selectedTenantId] : []}
      onRowSelect={(row: GrantTenantGridRow) => onSelect?.(row)}
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
