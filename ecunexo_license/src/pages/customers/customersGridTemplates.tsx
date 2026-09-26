export function CustomerLegalNameCell(props: {
  legalName: string
  tradeName: string | null
}) {
  return (
    <div className="ecu-op-grid__person">
      <span className="ecu-op-grid__person-text">
        <span className="ecu-op-grid__person-name">{props.legalName}</span>
        {props.tradeName ? <span className="ecu-op-grid__person-email">{props.tradeName}</span> : null}
      </span>
    </div>
  )
}

export function CustomerStatusCell(props: { status: string }) {
  const label = props.status === 'Active' ? 'Activo' : props.status === 'Suspended' ? 'Suspendido' : props.status
  const tone =
    props.status === 'Active' ? 'active' : props.status === 'Suspended' ? 'warning' : 'inactive'
  return (
    <span className={`ecu-status ecu-status--${tone}`}>
      <span className="ecu-status__dot" aria-hidden />
      {label}
    </span>
  )
}
