import type { LicensingCustomerListItem } from '@/lib/platformLicensingApi'

export type CustomerDeletePrompt = {
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
}

function customerName(customer: LicensingCustomerListItem): string {
  return customer.tradeName
    ? `${customer.legalName} (${customer.tradeName})`
    : customer.legalName
}

export function customerDeletePrompt(customer: LicensingCustomerListItem): CustomerDeletePrompt {
  const name = customerName(customer)

  if (customer.licensesIssued > 0) {
    return {
      title: 'Eliminar licencia del cliente',
      message: `«${name}» ya tiene una licencia emitida. ¿Deseas eliminar la licencia de este cliente? Dejará de ser válida y no podrá activarse ni renovarse con ese código.`,
      confirmLabel: 'Sí, eliminar licencia',
    }
  }

  return {
    title: 'Eliminar cliente',
    message: `¿Estás seguro de eliminar a «${name}»? No podrás emitirle una licencia a este mismo cliente; tendrías que volver a registrarlo.`,
    confirmLabel: 'Sí, eliminar',
  }
}
