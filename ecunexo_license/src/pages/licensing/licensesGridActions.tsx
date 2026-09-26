import { ArrowUpCircle, LayoutGrid } from 'lucide-react'
import { GridIconButton } from '@/components/ui/GridIconButton'
import type { LicenseListItem } from '@/lib/platformLicensingApi'

export function LicenseActionsCell(
  props: LicenseListItem & {
    onExpand?: (row: LicenseListItem) => void
    onManageModules?: (row: LicenseListItem) => void
  },
) {
  const canExpand = props.status === 'Active' || props.status === 'Exhausted'
  const canManageModules = props.status === 'Active'

  if (!canExpand && !canManageModules) {
    return null
  }

  return (
    <div className="ecu-licenses-grid__actions">
      {canManageModules && props.onManageModules ? (
        <GridIconButton
          label="Módulos de la licencia"
          icon={LayoutGrid}
          onClick={() => props.onManageModules?.(props)}
        />
      ) : null}
      {canExpand && props.onExpand ? (
        <GridIconButton
          label="Ampliar licencia"
          icon={ArrowUpCircle}
          onClick={() => props.onExpand?.(props)}
        />
      ) : null}
    </div>
  )
}
