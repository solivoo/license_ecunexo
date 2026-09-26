import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, useToast } from 'glubox'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui'
import {
  createLicensingCustomer,
  getLicensingCustomer,
  updateLicensingCustomer,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { CustomerEditorFields } from './CustomerEditorFields'
import '../licensing/issueLicenseForm.css'

const DEPLOYMENT_BY_NAME: Record<string, string> = {
  CloudShared: '0',
  CustomerHosted: '1',
  HybridEdge: '2',
}

function toDeploymentValue(mode: string | number): string {
  if (typeof mode === 'number') return String(mode)
  return DEPLOYMENT_BY_NAME[mode] ?? '0'
}

export function CustomerEditorPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { customerId } = useParams<{ customerId: string }>()
  const isEdit = Boolean(customerId)

  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)

  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [countryCode, setCountryCode] = useState('EC')
  const [deploymentMode, setDeploymentMode] = useState('0')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!customerId) return
    let cancelled = false
    getLicensingCustomer(customerId)
      .then((data) => {
        if (cancelled) return
        setLegalName(data.legalName)
        setTradeName(data.tradeName ?? '')
        setTaxId(data.taxId ?? '')
        setCountryCode(data.countryCode)
        setDeploymentMode(toDeploymentValue(data.deploymentMode))
        setContactName(data.contactName ?? '')
        setContactEmail(data.contactEmail ?? '')
        setContactPhone(data.contactPhone ?? '')
        setNotes(data.notes ?? '')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(readApiError(err, 'No se pudo cargar el cliente.'))
        setErrorOpen(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const onSubmit = useCallback(async () => {
    setError(null)
    setErrorOpen(false)
    setBusy(true)
    try {
      const trimmedLegal = legalName.trim()
      if (!trimmedLegal) throw new Error('La razón social es obligatoria.')
      const cc = countryCode.trim().toUpperCase()
      if (cc.length !== 2) throw new Error('El código de país debe tener 2 letras (ej. EC).')

      const payload = {
        legalName: trimmedLegal,
        tradeName: tradeName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        countryCode: cc,
        deploymentMode: Number(deploymentMode),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      if (customerId) {
        await updateLicensingCustomer(customerId, payload)
        toast.show({
          title: 'Cliente actualizado',
          message: `«${payload.legalName}» quedó guardado.`,
          variant: 'success',
        })
        navigate('/app/clientes', { replace: true })
        return
      }

      const created = await createLicensingCustomer(payload)
      toast.show({
        title: 'Cliente creado',
        message: `«${created.legalName}» listo. Ya puedes emitirle una licencia.`,
        variant: 'success',
      })
      navigate('/app/clientes', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : readApiError(err, 'No se pudo guardar el cliente.'))
      setErrorOpen(true)
    } finally {
      setBusy(false)
    }
  }, [
    contactEmail,
    contactName,
    contactPhone,
    countryCode,
    customerId,
    deploymentMode,
    legalName,
    navigate,
    toast,
    notes,
    taxId,
    tradeName,
  ])

  return (
    <div className="ecu-dashboard-layout">
      <PageHeader
        title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        subtitle={
          isEdit
            ? 'Actualiza los datos del contacto o cuenta comercial a quien se factura. Los cambios no alteran licencias ya emitidas.'
            : 'Registra los datos del contacto o cuenta comercial a quien se va a facturar y asociar licencias.'
        }
        badge={
          <StatusBadge tone="primary" withDot>
            {isEdit ? 'Edición' : 'Alta comercial'}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/app/clientes')}>
            <ArrowLeft size={16} aria-hidden />
            Directorio
          </Button>
        }
      />

      {loading ? (
        <p className="login-page__muted">Cargando cliente…</p>
      ) : (
        <form
          className="issue-license-form"
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit()
          }}
          noValidate
        >
          <SectionCard
            title="Información de la Cuenta"
            subtitle="Razón social o nombre a facturar y canales de contacto comercial"
          >
            <CustomerEditorFields
              
              busy={busy}
              legalName={legalName}
              tradeName={tradeName}
              countryCode={countryCode}
              deploymentMode={deploymentMode}
              contactName={contactName}
              contactEmail={contactEmail}
              contactPhone={contactPhone}
              notes={notes}
              onLegalName={setLegalName}
              onTradeName={setTradeName}
              onCountryCode={setCountryCode}
              onDeploymentMode={setDeploymentMode}
              onContactName={setContactName}
              onContactEmail={setContactEmail}
              onContactPhone={setContactPhone}
              onNotes={setNotes}
            />
            <footer className="issue-license-form-footer issue-license-form-footer--end">
              <Button type="submit" variant="primary" disabled={busy} loading={busy}>
                {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
              </Button>
            </footer>
          </SectionCard>
        </form>
      )}

      <EcuAlertDialog
        open={errorOpen}
        title={isEdit ? 'No se pudo guardar el cliente' : 'No se pudo crear el cliente'}
        message={error ?? 'Error inesperado.'}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
      />
    </div>
  )
}

