import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Popup } from 'glubox'
import { ExistingLicenseDialog } from '@/components/licensing/ExistingLicenseDialog'
import { IssueLicenseResultDialog } from '@/components/licensing/IssueLicenseResultDialog'
import { IssueLicenseWizard } from '@/components/licensing/IssueLicenseWizard'
import { moduleLabels } from '@/constants/tenantModules'
import { useExistingLicenseChoice } from '@/hooks/useExistingLicenseChoice'
import { useIssueLicenseForm } from '@/hooks/useIssueLicenseForm'
import { issueLicense, type IssueLicenseResult, type LicensingCustomerListItem } from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import './issueLicenseForm.css'

type IssueLicenseLocationState = {
  customer?: LicensingCustomerListItem
}

function customerLabel(customer: LicensingCustomerListItem): string {
  return customer.tradeName ? `${customer.legalName} (${customer.tradeName})` : customer.legalName
}

export function IssueLicensePage() {
  const location = useLocation()
  const form = useIssueLicenseForm()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [customerError, setCustomerError] = useState<string | undefined>()
  const [issued, setIssued] = useState<IssueLicenseResult | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [issuedModules, setIssuedModules] = useState<string[]>([])
  const [supersedesGrantId, setSupersedesGrantId] = useState<string | null>(null)
  const preset = (location.state as IssueLicenseLocationState | null)?.customer
  const appliedPreset = useRef(false)

  const showError = useCallback((message: string) => {
    setError(message)
    setErrorOpen(true)
  }, [])

  const onAdvanceToPlan = useCallback(() => setStep(1), [])

  const onSelectCustomer = useCallback(
    (customer: LicensingCustomerListItem) => {
      form.onCustomerSelect(customer)
      if (!form.ownerEmail && customer.contactEmail) {
        form.setOwnerEmail(customer.contactEmail)
      }
    },
    [form.onCustomerSelect, form.ownerEmail, form.setOwnerEmail],
  )

  const choice = useExistingLicenseChoice(onAdvanceToPlan, onSelectCustomer, showError)

  useEffect(() => {
    if (appliedPreset.current || !preset) return
    appliedPreset.current = true
    void choice.onCustomerIssue(preset)
  }, [choice.onCustomerIssue, preset])

  const handleRenew = async () => {
    const result = await choice.onRenew()
    if (!result) return
    const currentCode = choice.currentLicense?.planCode
    const modules =
      form.plans.find((p) => p.code === currentCode)?.enabledModuleCodesDefault ?? []
    setIssuedModules(modules)
    setSupersedesGrantId(result.supersedesGrantId ?? null)
    setIssued(result)
    setResultOpen(true)
    setStep(0)
  }

  const handleSubmit = async () => {
    setError(null)
    setErrorOpen(false)
    setCustomerError(undefined)
    setIssued(null)
    setSupersedesGrantId(null)
    setBusy(true)
    try {
      const payload = {
        ...form.buildIssuePayload(),
        allowAdditionalLicense: choice.allowAdditional,
      }
      setIssuedModules(form.selectedPlan?.enabledModuleCodesDefault ?? [])
      const result = await issueLicense(payload)
      setIssued(result)
      setResultOpen(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : readApiError(err, 'Error al emitir licencia.')
      if (message.includes('cliente comercial')) {
        setCustomerError(message)
      }
      showError(message)
    } finally {
      setBusy(false)
    }
  }

  const selectedLabel = form.customerLabel || (preset ? customerLabel(preset) : 'el cliente')
  const planOptions = form.plans.map((p) => ({
    label: p.displayName,
    value: p.code,
  }))

  return (
    <>
      {form.loadError ? (
        <p className="welcome-onboarding__error" role="alert">
          {form.loadError}
        </p>
      ) : null}

      {!form.plansReady ? (
        <p className="login-page__muted">Cargando planes…</p>
      ) : (
        <form
          className="issue-license-form ecu-dashboard-layout ecu-section-page"
          onSubmit={(e) => {
            e.preventDefault()
          }}
          noValidate
        >
          <IssueLicenseWizard
            form={form}
            planOptions={planOptions}
            customerError={customerError}
            busy={busy || choice.choiceBusy}
            step={step}
            onStepChange={setStep}
            onCustomerIssue={(customer) => void choice.onCustomerIssue(customer)}
            onIssue={() => void handleSubmit()}
          />
        </form>
      )}

      <ExistingLicenseDialog
        open={choice.choiceOpen}
        customerLabel={selectedLabel}
        license={choice.currentLicense}
        busy={choice.choiceBusy}
        onClose={choice.closeChoice}
        onRenew={() => void handleRenew()}
        onCreate={() => {
          const owner = choice.currentLicense?.ownerEmail
          if (owner && form.ownerEmail.trim().toLowerCase() === owner.toLowerCase()) {
            form.setOwnerEmail('')
          }
          choice.onCreateAdditional()
        }}
      />

      <Popup
        open={errorOpen}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
        title="No se pudo emitir la licencia"
        width="min(92vw, 28rem)"
        
        actions={[
          {
            id: 'close',
            label: 'Entendido',
            variant: 'primary',
            onClick: () => {
              setErrorOpen(false)
              setError(null)
            },
          },
        ]}
      >
        <p className="issue-license-error-popup">{error ?? 'Error al emitir licencia.'}</p>
      </Popup>

      {issued ? (
        <IssueLicenseResultDialog
          issued={issued}
          enabledModules={issuedModules}
          modulesLabel={moduleLabels(issuedModules)}
          supersedesGrantId={supersedesGrantId}
          open={resultOpen}
          onClose={() => {
            setResultOpen(false)
            setIssued(null)
            setIssuedModules([])
            setSupersedesGrantId(null)
            setCustomerError(undefined)
            form.resetIssuance()
            choice.reset()
            setStep(0)
          }}
        />
      ) : null}
    </>
  )
}
