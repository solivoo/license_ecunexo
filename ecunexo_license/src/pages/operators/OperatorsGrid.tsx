import { useMemo, type ReactNode } from 'react'
import { DataGrid, type ColumnDef } from 'glubox'
import { useGluDataGridPaging } from '@/hooks/useGluDataGridPaging'
import { createSpanishDataGridMessages } from '@/lib/gluDataGridMessages'
import type { OperatorListItem } from '@/lib/platformLicensingApi'
import {
  OperatorCreatedCell,
  OperatorLastLoginCell,
  OperatorPersonCell,
  OperatorRoleCell,
  OperatorStatusCell,
} from './operatorsGridTemplates'
import '../licensing/licensesGrid.css'
import './operatorsGrid.css'

export type OperatorGridRow = OperatorListItem & Record<string, unknown>

export type OperatorsGridProps = {
  readonly rows: OperatorListItem[]
  readonly loading?: boolean
  readonly toolbarRight?: ReactNode
}

const gridMessages = createSpanishDataGridMessages('operador', 'operadores')

export function OperatorsGrid({ rows, loading = false, toolbarRight }: OperatorsGridProps) {
  const { paging, pageSizeOptions, onPageChange, onPageSizeChange } = useGluDataGridPaging(10)

  const columns = useMemo((): ColumnDef<OperatorGridRow>[] => {
    return [
      {
        key: 'name',
        header: 'Operador',
        width: 280,
        sortable: true,
        renderCell: (_value: unknown, row: OperatorGridRow) => (
          <OperatorPersonCell {...row} />
        ),
      },
      {
        key: 'role',
        header: 'Rol',
        width: 190,
        sortable: true,
        renderCell: (_value: unknown, row: OperatorGridRow) => (
          <OperatorRoleCell {...row} />
        ),
      },
      {
        key: 'isActive',
        header: 'Estado',
        width: 120,
        align: 'center',
        sortable: true,
        renderCell: (_value: unknown, row: OperatorGridRow) => (
          <OperatorStatusCell {...row} />
        ),
      },
      {
        key: 'lastLoginAt',
        header: 'Último acceso',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: OperatorGridRow) => (
          <OperatorLastLoginCell {...row} />
        ),
      },
      {
        key: 'createdAt',
        header: 'Alta',
        width: 170,
        sortable: true,
        renderCell: (_value: unknown, row: OperatorGridRow) => (
          <OperatorCreatedCell {...row} />
        ),
      },
    ]
  }, [])

  const dataSource = useMemo(
    () => (Array.isArray(rows) ? rows : []) as OperatorGridRow[],
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
