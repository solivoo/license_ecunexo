import { Key, Pencil, Trash2 } from 'lucide-react'
import { GridIconButton } from '@/components/ui/GridIconButton'
import type { LicensingCustomerListItem } from '@/lib/platformLicensingApi'

export type CustomerActionsCellProps = {
  readonly row: LicensingCustomerListItem
  readonly busy?: boolean
  readonly onEdit: (customerId: string) => void
  readonly onDelete: (customer: LicensingCustomerListItem) => void
  readonly onIssueLicense: (customer: LicensingCustomerListItem) => void
}

export function CustomerActionsCell({
  row,
  busy = false,
  onEdit,
  onDelete,
  onIssueLicense,
}: CustomerActionsCellProps) {
  const canIssue = row.status === 'Active'
  const canDelete = row.status !== 'Suspended'

  return (
    <div className="ecu-licenses-grid__actions">
      <GridIconButton
        label="Generar licencia"
        icon={Key}
        disabled={busy || !canIssue}
        onClick={() => onIssueLicense(row)}
      />
      <GridIconButton
        label="Editar cliente"
        icon={Pencil}
        disabled={busy}
        onClick={() => onEdit(row.id)}
      />
      <GridIconButton
        label="Eliminar cliente"
        icon={Trash2}
        danger
        loading={busy}
        disabled={busy || !canDelete}
        onClick={() => onDelete(row)}
      />
    </div>
  )
}
