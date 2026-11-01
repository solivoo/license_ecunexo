import { ArrowUpCircle, Building2, KeyRound, LayoutGrid } from 'lucide-react'
import { GridIconButton } from '@/components/ui/GridIconButton'
import type { LicenseListItem } from '@/lib/platformLicensingApi'

export function LicenseActionsCell(
  props: LicenseListItem & {
    onExpand?: (row: LicenseListItem) => void
    onManageModules?: (row: LicenseListItem) => void
    onManageTenants?: (row: LicenseListItem) => void
    onGenerateOfflineResources?: (row: LicenseListItem) => void
  },
) {
  const canExpand = props.status === 'Active' || props.status === 'Exhausted'
  const canManageModules = props.status === 'Active'
  const canManageTenants = props.status === 'Active'
  const isOfflineCapable =
    canExpand &&
    Boolean(props.deploymentMode) &&
    props.deploymentMode !== 'CloudShared'

  if (!canExpand && !canManageModules && !canManageTenants) {
    return null
  }

  return (
    <div className="ecu-licenses-grid__actions">
      {isOfflineCapable && props.onGenerateOfflineResources ? (
        <GridIconButton
          label="Generar código de activación y archivo (.ecunexo-license)"
          icon={KeyRound}
          onClick={() => props.onGenerateOfflineResources?.(props)}
        />
      ) : null}
      {canManageModules && props.onManageModules ? (
        <GridIconButton
          label="Ajuste rápido de módulos en línea (Cloud)"
          icon={LayoutGrid}
          onClick={() => props.onManageModules?.(props)}
        />
      ) : null}
      {canManageTenants && props.onManageTenants ? (
        <GridIconButton
          label="Empresas y accesos por tenant"
          icon={Building2}
          onClick={() => props.onManageTenants?.(props)}
        />
      ) : null}
      {canExpand && props.onExpand ? (
        <GridIconButton
          label="Modificar cupos, módulos o renovar licencia"
          icon={ArrowUpCircle}
          onClick={() => props.onExpand?.(props)}
        />
      ) : null}
    </div>
  )
}
