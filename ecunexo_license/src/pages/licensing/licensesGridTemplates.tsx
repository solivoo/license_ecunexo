import type { LicenseListItem } from '@/lib/platformLicensingApi'

const STATUS_LABELS: Record<string, string> = {
  Active: 'Activa',
  Revoked: 'Revocada',
  Exhausted: 'Agotada',
}

export function LicenseCustomerCell(props: LicenseListItem) {
  return (
    <div className="ecu-op-grid__person">
      <span className="ecu-op-grid__person-text">
        <span className="ecu-op-grid__person-name">{props.customerLegalName}</span>
        {props.customerTradeName ? (
          <span className="ecu-op-grid__person-email">{props.customerTradeName}</span>
        ) : null}
      </span>
    </div>
  )
}

export function LicenseStatusCell(props: { status: string }) {
  const label = STATUS_LABELS[props.status] ?? props.status
  const tone =
    props.status === 'Active'
      ? 'active'
      : props.status === 'Revoked'
        ? 'danger'
        : props.status === 'Exhausted'
          ? 'warning'
          : 'inactive'
  return (
    <span className={`ecu-status ecu-status--${tone}`}>
      <span className="ecu-status__dot" aria-hidden />
      {label}
    </span>
  )
}

export function LicensePlanCell(props: LicenseListItem) {
  const generation = props.generation ?? 1
  const kind = props.reissueKind
  const fromPlan = props.previousPlanLabel
  const kindLabel =
    kind === 'Expand' ? 'Ampliada' : kind === 'Renew' ? 'Renovada' : null

  return (
    <div className="ecu-op-grid__person">
      <span className="ecu-op-grid__person-text">
        <span className="ecu-op-grid__person-name">{props.planLabel}</span>
        {kindLabel ? (
          <span className="ecu-op-grid__person-email">
            {kindLabel}
            {fromPlan ? ` desde ${fromPlan}` : ''}
            {generation > 1 ? ` · n.º ${generation}` : ''}
          </span>
        ) : generation > 1 ? (
          <span className="ecu-op-grid__person-email">n.º {generation}</span>
        ) : null}
      </span>
    </div>
  )
}

export type LicenseGridRow = LicenseListItem
