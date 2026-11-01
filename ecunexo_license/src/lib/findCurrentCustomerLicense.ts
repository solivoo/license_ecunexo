import type { LicenseListItem } from '@/lib/platformLicensingApi'

const CURRENT_STATUSES = new Set(['Active', 'Exhausted'])

export function findCurrentCustomerLicense(
  licenses: readonly LicenseListItem[],
  customerId: string,
): LicenseListItem | null {
  const current = licenses
    .filter((row) => row.customerId === customerId && CURRENT_STATUSES.has(row.status))
    .sort((a, b) => Date.parse(b.issuedAtUtc) - Date.parse(a.issuedAtUtc))
  return current[0] ?? null
}
