import { Popup } from 'glubox'
import { formatDateTime } from '@/lib/formatDate'
import type { LicenseListItem } from '@/lib/platformLicensingApi'

export type ExistingLicenseDialogProps = {
  readonly open: boolean
  readonly customerLabel: string
  readonly license: LicenseListItem | null
  readonly busy?: boolean
  readonly onClose: () => void
  readonly onModifyAndRenew: () => void
  readonly onCreate: () => void
}

function statusLabel(status: string): string {
  if (status === 'Active') return 'vigente'
  if (status === 'Exhausted') return 'con cupo agotado'
  return status
}

export function ExistingLicenseDialog({
  open,
  customerLabel,
  license,
  busy = false,
  onClose,
  onModifyAndRenew,
  onCreate,
}: ExistingLicenseDialogProps) {
  const plan = license?.planLabel ?? '—'
  const owner = license?.ownerEmail ?? 'sin titular'
  const expires = license ? formatDateTime(license.expiresAtUtc) : '—'
  const status = license ? statusLabel(license.status) : 'vigente'

  return (
    <Popup
      open={open}
      onClose={onClose}
      title="Este cliente ya tiene una licencia"
      width="min(92vw, 32rem)"
      
      actions={[
        {
          id: 'cancel',
          label: 'Cancelar',
          variant: 'ghost' as const,
          onClick: onClose,
          disabled: busy,
        },
        {
          id: 'create',
          label: 'Crear nueva',
          variant: 'outline' as const,
          onClick: onCreate,
          disabled: busy,
        },
        {
          id: 'modify-renew',
          label: 'Modificar o Renovar',
          variant: 'primary' as const,
          onClick: onModifyAndRenew,
          disabled: busy,
        },
      ]}
    >
      <p className="issue-license-error-popup">
        «{customerLabel}» ya tiene una licencia {status} del plan <strong>{plan}</strong> (titular{' '}
        {owner}, vence {expires}).
      </p>
      <p className="issue-license-error-popup">
        <strong>Modificar o Renovar</strong> te permite ajustar vigencia, empresas y los módulos o límites específicos para este cliente sin alterar otros clientes. Se revocará la licencia anterior y se generará una nueva que se sincroniza en línea o por archivo.
      </p>
    </Popup>
  )
}
