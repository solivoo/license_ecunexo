import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DateBox, Select, TextArea, TextBox } from 'glubox'
import {
  Calendar,
  Info,
  StickyNote,
  Users,
  UsersRound,
} from 'lucide-react'
import { EcuAlertDialog, PageHeader } from '@/components/ui'
import {
  scheduleTraining,
  listLicensingCustomers,
  listLicenses,
  type LicensingCustomerListItem,
  type LicenseListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

const KIND_OPTIONS = [
  { value: 'Onboarding', label: 'Onboarding inicial' },
  { value: 'Refresher', label: 'Refresco' },
  { value: 'Advanced', label: 'Avanzada' },
  { value: 'Custom', label: 'Personalizada' },
]

const MODALITY_OPTIONS = [
  { value: 'Virtual', label: 'Virtual' },
  { value: 'OnSite', label: 'Presencial' },
]

export function ScheduleTrainingPage() {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<LicensingCustomerListItem[]>([])
  const [licenses, setLicenses] = useState<LicenseListItem[]>([])

  const [customerId, setCustomerId] = useState('')
  const [licenseGrantId, setLicenseGrantId] = useState('')
  const [topic, setTopic] = useState('')
  const [kind, setKind] = useState('Onboarding')
  const [modality, setModality] = useState('Virtual')
  const [durationHours, setDurationHours] = useState(2)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([])

  useEffect(() => {
    Promise.all([listLicensingCustomers(), listLicenses()])
      .then(([custs, lics]) => {
        setCustomers(custs)
        setLicenses(lics)
      })
      .catch((err: unknown) => { setLoadError(readApiError(err, 'No se pudo cargar clientes ni licencias.')) })
  }, [])

  const activeLicenses = licenses.filter((l) => l.status === 'Active')

  const filteredLicenses = customerId
    ? activeLicenses.filter((l) => l.customerId === customerId)
    : activeLicenses

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.legalName}${c.tradeName ? ` (${c.tradeName})` : ''}`,
      })),
    [customers]
  )

  const licenseOptions = useMemo(
    () =>
      filteredLicenses.map((l) => ({
        value: l.id,
        label: `${l.planLabel} — ${l.customerLegalName}`,
      })),
    [filteredLicenses]
  )

  const removeEmail = (email: string) => {
    setAttendeeEmails((prev) => prev.filter((e) => e !== email))
  }

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed) return
    if (!trimmed.includes('@')) return
    if (attendeeEmails.includes(trimmed)) {
      setEmailInput('')
      return
    }
    setAttendeeEmails((prev) => [...prev, trimmed])
    setEmailInput('')
  }

  const onSubmit = useCallback(async () => {
    setError(null)
    setErrorOpen(false)
    setBusy(true)

    try {
      if (!customerId) throw new Error('Selecciona un cliente.')
      if (!licenseGrantId) throw new Error('Selecciona una licencia activa.')
      if (!topic.trim()) throw new Error('El tema es obligatorio.')
      if (!scheduledDate) throw new Error('La fecha es obligatoria.')
      if (durationHours < 1 || durationHours > 40) throw new Error('Duración entre 1 y 40 horas.')

      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime || '10:00'}:00`).toISOString()

      await scheduleTraining({
        customerId,
        licenseGrantId,
        topic: topic.trim(),
        kind,
        modality,
        durationHours,
        scheduledAt,
        attendeeEmails: attendeeEmails.length > 0 ? attendeeEmails : undefined,
        notes: notes.trim() || undefined,
      })

      navigate('/app/capacitaciones')
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError(readApiError(err, 'Error al agendar capacitación.'))
      setErrorOpen(true)
    } finally {
      setBusy(false)
    }
  }, [customerId, licenseGrantId, topic, kind, modality, durationHours, scheduledDate, scheduledTime, attendeeEmails, notes, navigate])

  return (
    <>
      <div className="ecu-dashboard-layout ecu-section-page">
        <PageHeader
          title="Agendar capacitación"
          subtitle="Programa una sesión de formación para un cliente con licencia activa."
          actions={
            <Button variant="outline" onClick={() => navigate('/app/capacitaciones')}>
              ← Capacitaciones
            </Button>
          }
        />

      {loadError ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <form
        ref={formRef}
        className="ecu-sf-form-skin"
        onSubmit={(e) => { e.preventDefault(); void onSubmit() }}
        noValidate
      >
        <div className="issue-license-panel">
          {/* Cliente y licencia */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <Users size={18} strokeWidth={1.75} aria-hidden />
              Cliente y licencia
            </h3>
            <div className="issue-license-form-grid">
              <Select
                id="train-customer"
                label="Cliente"
                labelPosition="outlined"
                variant="outline"
                options={customerOptions}
                value={customerId}
                onChange={(value: string) => {
                  setCustomerId(value)
                  setLicenseGrantId('')
                }}
                placeholder="Seleccionar cliente…"
                fullWidth
                size="md"
                
              />
              <Select
                id="train-license"
                label="Licencia activa"
                labelPosition="outlined"
                variant="outline"
                options={licenseOptions}
                value={licenseGrantId}
                onChange={setLicenseGrantId}
                placeholder="Seleccionar licencia…"
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          {/* Detalles */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <Info size={18} strokeWidth={1.75} aria-hidden />
              Detalles de la sesión
            </h3>
            <div className="issue-license-form-grid">
              <TextBox
                id="train-topic"
                label="Tema"
                labelPosition="outlined"
                variant="outline"
                value={topic}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                placeholder="ej. Onboarding de inventario"
                required
                fullWidth
                size="md"
                
              />
              <Select
                id="train-kind"
                label="Tipo"
                labelPosition="outlined"
                variant="outline"
                options={KIND_OPTIONS}
                value={kind}
                onChange={setKind}
                fullWidth
                size="md"
                
              />
              <Select
                id="train-modality"
                label="Modalidad"
                labelPosition="outlined"
                variant="outline"
                options={MODALITY_OPTIONS}
                value={modality}
                onChange={setModality}
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          {/* Agenda */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <Calendar size={18} strokeWidth={1.75} aria-hidden />
              Agenda
            </h3>
            <div className="issue-license-form-grid">
              <DateBox
                id="train-date"
                label="Fecha"
                labelPosition="outlined"
                variant="outline"
                value={scheduledDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledDate(e.target.value)}
                required
                fullWidth
                size="md"
                
              />
              <TextBox
                id="train-time"
                label="Hora"
                labelPosition="outlined"
                variant="outline"
                type="time"
                value={scheduledTime}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledTime(e.target.value)}
                fullWidth
                size="md"
                
              />
              <TextBox
                id="train-duration"
                label="Duración (horas)"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={1}
                max={40}
                value={String(durationHours)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDurationHours(Number(e.target.value))}
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          {/* Notas */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <StickyNote size={18} strokeWidth={1.75} aria-hidden />
              Notas internas
            </h3>
            <TextArea
              label="Notas internas"
              labelPosition="outlined"
              variant="outline"
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Requisitos, observaciones…"
              rows={3}
              resize="vertical"
              fullWidth
              size="md"
              
            />
          </section>

          {/* Asistentes */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <UsersRound size={18} strokeWidth={1.75} aria-hidden />
              Asistentes
            </h3>
            <div className="issue-license-form-grid">
              <TextBox
                label="Correo del asistente"
                labelPosition="outlined"
                variant="outline"
                type="email"
                value={emailInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmailInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEmail()
                  }
                }}
                placeholder="correo@ejemplo.com"
                fullWidth
                size="md"
                
              />
              <div className="issue-license-attendee-add">
                <Button
                  variant="outline"
                  
                  type="button"
                  onClick={addEmail}
                  disabled={!emailInput.trim() || !emailInput.includes('@')}
                >
                  Agregar
                </Button>
              </div>
              {attendeeEmails.length > 0 ? (
                <div className="issue-license-attendee-chips">
                  {attendeeEmails.map((email) => (
                    <span key={email} className="issue-license-attendee-chip">
                      {email}
                      <button
                        type="button"
                        className="issue-license-attendee-chip__remove"
                        onClick={() => removeEmail(email)}
                        aria-label={`Quitar ${email}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <footer className="issue-license-form-footer">
            <Button
              className="ecu-btn issue-license-submit"
              variant="primary" 
              size="lg"
              disabled={busy}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {busy ? 'Agendando…' : 'Agendar capacitación'}
            </Button>
          </footer>
        </div>
      </form>
      </div>

      <EcuAlertDialog
        open={errorOpen}
        title="Error"
        message={error ?? 'Error inesperado.'}
        onClose={() => { setErrorOpen(false); setError(null) }}
      />
    </>
  )
}
