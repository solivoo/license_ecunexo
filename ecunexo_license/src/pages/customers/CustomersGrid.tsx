import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import { formatDateTime } from '@/lib/formatDate'
import type { LicensingCustomerListItem } from '@/lib/platformLicensingApi'
import { CustomerActionsCell } from './customersGridActions'
import { CustomerLegalNameCell, CustomerStatusCell } from './customersGridTemplates'
import '../licensing/licensesGrid.css'
import '../operators/operatorsGrid.css'

export type CustomerGridRow = LicensingCustomerListItem & Record<string, unknown>

export type CustomersGridProps = {
  readonly rows: LicensingCustomerListItem[]
  readonly loading?: boolean
  readonly actionBusyId?: string | null
  readonly toolbarRight?: ReactNode
  readonly onEdit: (customerId: string) => void
  readonly onDelete: (customer: LicensingCustomerListItem) => void
  readonly onIssueLicense: (customer: LicensingCustomerListItem) => void
  readonly searchPlaceholder?: string
  readonly initialPageSize?: number
  readonly maxHeight?: string | number
}

const gridMessages = createSpanishDataGridMessages('cliente', 'clientes')

export function CustomersGrid({
  rows,
  loading = false,
  actionBusyId = null,
  toolbarRight,
  onEdit,
  onDelete,
  onIssueLicense,
  searchPlaceholder = 'Buscar cliente…',
  initialPageSize = 10,
  maxHeight,
}: CustomersGridProps) {
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging(
    initialPageSize,
  )

  const columns = useMemo((): ColumnDef<CustomerGridRow>[] => {
    return [
      {
        key: 'legalName',
        header: 'Cliente',
        width: 240,
        sortable: true,
        renderCell: (_value: unknown, row: CustomerGridRow) => (
          <CustomerLegalNameCell legalName={row.legalName} tradeName={row.tradeName} />
        ),
      },
      {
        key: 'taxId',
        header: 'RUC',
        width: 130,
        sortable: true,
        renderCell: (value: unknown) => (value ? String(value) : '—'),
      },
      { key: 'contactEmail', header: 'Contacto', width: 220, sortable: true },
      {
        key: 'status',
        header: 'Estado',
        width: 120,
        align: 'center',
        sortable: true,
        renderCell: (_value: unknown, row: CustomerGridRow) => (
          <CustomerStatusCell status={String(row.status)} />
        ),
      },
      {
        key: 'licensesIssued',
        header: 'Licencias',
        width: 110,
        align: 'center',
        sortable: true,
      },
      {
        key: 'activeLicenses',
        header: 'Activas',
        width: 100,
        align: 'center',
        sortable: true,
      },
      {
        key: 'lastLicenseIssuedAtUtc',
        header: 'Última emisión',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: CustomerGridRow) =>
          row.lastLicenseIssuedAtUtc ? formatDateTime(String(row.lastLicenseIssuedAtUtc)) : '—',
      },
      {
        key: 'id',
        header: 'Acciones',
        width: 148,
        align: 'center',
        sortable: false,
        sticky: 'right',
        renderCell: (_value: unknown, row: CustomerGridRow) => (
          <CustomerActionsCell
            row={row}
            busy={actionBusyId === row.id}
            onEdit={onEdit}
            onDelete={onDelete}
            onIssueLicense={onIssueLicense}
          />
        ),
      },
    ]
  }, [actionBusyId, onDelete, onEdit, onIssueLicense])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as CustomerGridRow[],
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
      searchPlaceholder={searchPlaceholder}
      searchKeys={['legalName', 'tradeName', 'taxId', 'contactEmail']}
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
      maxHeight={maxHeight}
      showRowCount
      fullWidth
      loading={loading}
      
      messages={gridMessages}
      stickyFirstColumn
    />
  )
}
