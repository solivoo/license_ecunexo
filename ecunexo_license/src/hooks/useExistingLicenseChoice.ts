import { useCallback, useState } from 'react'
import { findCurrentCustomerLicense } from '@/lib/findCurrentCustomerLicense'
import {
  listLicenses,
  reissueLicense,
  type IssueLicenseResult,
  type LicenseListItem,
  type LicensingCustomerListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

export type ExistingLicenseChoice = {
  readonly allowAdditional: boolean
  readonly choiceOpen: boolean
  readonly choiceBusy: boolean
  readonly currentLicense: LicenseListItem | null
  readonly onCustomerIssue: (customer: LicensingCustomerListItem) => Promise<void>
  readonly onCreateAdditional: () => void
  readonly onRenew: () => Promise<IssueLicenseResult | null>
  readonly closeChoice: () => void
  readonly reset: () => void
}

export function useExistingLicenseChoice(
  onAdvanceToPlan: () => void,
  onSelectCustomer: (customer: LicensingCustomerListItem) => void,
  onError: (message: string) => void,
): ExistingLicenseChoice {
  const [allowAdditional, setAllowAdditional] = useState(false)
  const [choiceOpen, setChoiceOpen] = useState(false)
  const [choiceBusy, setChoiceBusy] = useState(false)
  const [currentLicense, setCurrentLicense] = useState<LicenseListItem | null>(null)

  const onCustomerIssue = useCallback(
    async (customer: LicensingCustomerListItem) => {
      onSelectCustomer(customer)
      setAllowAdditional(false)
      setCurrentLicense(null)
      if (customer.activeLicenses <= 0) {
        onAdvanceToPlan()
        return
      }

      setChoiceBusy(true)
      try {
        const current = findCurrentCustomerLicense(await listLicenses(), customer.id)
        if (!current) {
          onAdvanceToPlan()
          return
        }
        setCurrentLicense(current)
        setChoiceOpen(true)
      } catch (err: unknown) {
        onError(readApiError(err, 'No se pudo comprobar si el cliente ya tiene licencia.'))
      } finally {
        setChoiceBusy(false)
      }
    },
    [onAdvanceToPlan, onError, onSelectCustomer],
  )

  const onCreateAdditional = useCallback(() => {
    setAllowAdditional(true)
    setChoiceOpen(false)
    onAdvanceToPlan()
  }, [onAdvanceToPlan])

  const onRenew = useCallback(async (): Promise<IssueLicenseResult | null> => {
    if (!currentLicense) return null
    setChoiceBusy(true)
    try {
      const result = await reissueLicense(currentLicense.id, {
        onlineValidationIntervalDays: currentLicense.onlineValidationIntervalDays ?? 30,
        planCode: currentLicense.planCode,
      })
      setChoiceOpen(false)
      return result
    } catch (err: unknown) {
      onError(readApiError(err, 'No se pudo renovar la licencia.'))
      return null
    } finally {
      setChoiceBusy(false)
    }
  }, [currentLicense, onError])

  return {
    allowAdditional,
    choiceOpen,
    choiceBusy,
    currentLicense,
    onCustomerIssue,
    onCreateAdditional,
    onRenew,
    closeChoice: () => setChoiceOpen(false),
    reset: () => {
      setAllowAdditional(false)
      setChoiceOpen(false)
      setCurrentLicense(null)
    },
  }
}
