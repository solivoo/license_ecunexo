import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, type PageActionItem } from 'glubox'
import { EcuPageActions } from '@/components/ui/EcuPageActions'
import { PageHeader, StatusBadge } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { IssueLicenseCustomerStep } from '@/components/licensing/IssueLicenseCustomerStep'
import { IssueLicensePlanStep } from '@/components/licensing/IssueLicensePlanStep'
import { IssueLicenseReviewStep } from '@/components/licensing/IssueLicenseReviewStep'
import { renderSidebarIcon } from '@/config/sidebarIcons'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import type { useIssueLicenseForm } from '@/hooks/useIssueLicenseForm'
import type { LicensingCustomerListItem } from '@/lib/platformLicensingApi'

export type IssueLicenseWizardProps = {
  readonly form: ReturnType<typeof useIssueLicenseForm>
  readonly planOptions: { value: string; label: string }[]
  readonly customerError?: string
  readonly busy: boolean
  readonly step: number
  readonly onStepChange: (step: number) => void
  readonly onCustomerIssue: (customer: LicensingCustomerListItem) => void
  readonly onIssue?: () => void
}

const STEPS = [
  { id: 'cliente', label: 'Cliente' },
  { id: 'plan', label: 'Plan' },
  { id: 'emitir', label: 'Emitir' },
] as const

const STEP_LEADS = [
  'Elige un cliente del directorio. Generar licencia avanza al plan; editar abre el formulario.',
  'Selecciona el plan y la vigencia de la licencia.',
  'Completa titular y notas, y emite.',
] as const

export function IssueLicenseWizard({
  form,
  planOptions,
  customerError,
  busy,
  step,
  onStepChange,
  onCustomerIssue,
  onIssue,
}: IssueLicenseWizardProps) {
  const theme = useGluComponentTheme()
  const navigate = useNavigate()
  const [reloadToken, setReloadToken] = useState(0)

  const actionItems: PageActionItem[] = [
    {
      id: 'refresh',
      label: 'Actualizar',
      icon: 'refresh-cw',
      route: null,
    },
  ]

  const canNext = step === 1 && form.planCode.length > 0

  return (
    <div className="issue-license-wizard">
      <PageHeader
        title="Emitir licencia"
        subtitle={STEP_LEADS[step]}
        badge={
          <StatusBadge tone="primary" withDot>
            Paso {step + 1} de {STEPS.length}
          </StatusBadge>
        }
        actions={
          step === 0 ? (
            <>
              <Button
                type="button"
                variant="primary"
                theme={theme}
                onClick={() => navigate('/app/clientes/nuevo')}
              >
                <Plus size={16} aria-hidden />
                Nuevo cliente
              </Button>
              <EcuPageActions
                items={actionItems}
                variant="outline"
                triggerLabel="Acciones"
                renderIcon={renderSidebarIcon}
                onNavigate={(route: string) => navigate(route)}
                onActionSelect={(item) => {
                  if (item.id === 'refresh') setReloadToken((token) => token + 1)
                }}
              />
            </>
          ) : undefined
        }
      />

      <ol className="issue-license-steps" aria-label="Pasos para emitir">
        {STEPS.map((item, index) => {
          const state = index === step ? 'active' : index < step ? 'done' : 'todo'
          return (
            <li key={item.id} className={`issue-license-steps__item issue-license-steps__item--${state}`}>
              <button
                type="button"
                className="issue-license-steps__btn"
                disabled={index > step}
                onClick={() => onStepChange(index)}
              >
                <span className="issue-license-steps__num">{index + 1}</span>
                {item.label}
              </button>
            </li>
          )
        })}
      </ol>

      {step === 0 ? (
        <IssueLicenseCustomerStep
          reloadToken={reloadToken}
          error={customerError}
          onIssueLicense={onCustomerIssue}
        />
      ) : null}
      {step === 1 ? <IssueLicensePlanStep form={form} planOptions={planOptions} /> : null}
      {step === 2 ? <IssueLicenseReviewStep form={form} /> : null}

      {step > 0 ? (
        <footer className="issue-license-form-footer issue-license-form-footer--end">
          <Button type="button" variant="outline" theme={theme} onClick={() => onStepChange(step - 1)}>
            Atrás
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              variant="primary"
              theme={theme}
              disabled={!canNext}
              onClick={() => onStepChange(step + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={busy}
              theme={theme}
              onClick={() => onIssue?.()}
            >
              {busy ? 'Emitiendo…' : 'Emitir licencia'}
            </Button>
          )}
        </footer>
      ) : null}
    </div>
  )
}
