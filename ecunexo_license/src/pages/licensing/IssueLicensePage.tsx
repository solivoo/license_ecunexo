import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from 'glubox'
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
  const navigate = useNavigate()
  const toast = useToast()
  const form = useIssueLicenseForm()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [customerError, setCustomerError] = useState<string | undefined>()
  const [issued, setIssued] = useState<IssueLicenseResult | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [issuedModules, setIssuedModules] = useState<string[]>([])
  const [supersedesGrantId, setSupersedesGrantId] = useState<string | null>(null)
  const preset = (location.state as IssueLicenseLocationState | null)?.customer
  const appliedPreset = useRef(false)

  useEffect(() => {
    if (form.loadError) {
      toast.show({
        title: 'Error de carga',
        message: form.loadError,
        variant: 'error',
      })
    }
  }, [form.loadError, toast])

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

  const showError = useCallback(
    (msg: string) => {
      toast.show({
        title: 'Error',
        message: msg,
        variant: 'error',
      })
    },
    [toast],
  )

  const choice = useExistingLicenseChoice(onAdvanceToPlan, onSelectCustomer, showError)

  useEffect(() => {
    if (appliedPreset.current || !preset) return
    appliedPreset.current = true
    void choice.onCustomerIssue(preset)
  }, [choice.onCustomerIssue, preset])

  const handleSubmit = async () => {
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
      toast.show({
        title: 'No se pudo emitir la licencia',
        message,
        variant: 'error',
      })
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
        onModifyAndRenew={() => {
          if (!choice.currentLicense) return
          choice.closeChoice()
          navigate(`/app/licencias/${choice.currentLicense.id}/reemitir`)
        }}
        onCreate={() => {
          const owner = choice.currentLicense?.ownerEmail
          if (owner && form.ownerEmail.trim().toLowerCase() === owner.toLowerCase()) {
            form.setOwnerEmail('')
          }
          choice.onCreateAdditional()
        }}
      />

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
