import { Popup } from 'glubox'
import { formatDateTime } from '@/lib/formatDate'
import type { LicenseListItem } from '@/lib/platformLicensingApi'

export type ExistingLicenseDialogProps = {
  readonly open: boolean
  readonly customerLabel: string
  readonly license: LicenseListItem | null
  readonly busy?: boolean
  readonly onClose: () => void
  readonly onRenew: () => void
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
  onRenew,
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
          id: 'renew',
          label: busy ? 'Renovando…' : 'Renovar',
          variant: 'primary' as const,
          onClick: onRenew,
          disabled: busy,
        },
      ]}
    >
      <p className="issue-license-error-popup">
        «{customerLabel}» ya tiene una licencia {status} del plan <strong>{plan}</strong> (titular{' '}
        {owner}, vence {expires}).
      </p>
      <p className="issue-license-error-popup">
        <strong>Renovar</strong> revoca esa licencia, mantiene el mismo titular y genera código y
        archivo nuevos con el plan actual. Para cambiar de plan, usa el icono Ampliar en Historial
        de licencias.
      </p>
    </Popup>
  )
}
