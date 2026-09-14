import type { ChangeEvent } from 'react'
import { Select, TextArea, TextBox } from 'glubox'
import { Building2, MapPin, StickyNote, UserRound } from 'lucide-react'

export const CUSTOMER_DEPLOYMENT_OPTIONS = [
  { value: '0', label: 'Cloud compartido' },
  { value: '1', label: 'Hospedado por el cliente' },
  { value: '2', label: 'Híbrido / edge' },
] as const

export type CustomerEditorFieldsProps = {
  readonly theme: 'light' | 'dark'
  readonly busy: boolean
  readonly legalName: string
  readonly tradeName: string
  readonly countryCode: string
  readonly deploymentMode: string
  readonly contactName: string
  readonly contactEmail: string
  readonly contactPhone: string
  readonly notes: string
  readonly onLegalName: (value: string) => void
  readonly onTradeName: (value: string) => void
  readonly onCountryCode: (value: string) => void
  readonly onDeploymentMode: (value: string) => void
  readonly onContactName: (value: string) => void
  readonly onContactEmail: (value: string) => void
  readonly onContactPhone: (value: string) => void
  readonly onNotes: (value: string) => void
}

export function CustomerEditorFields({
  theme,
  busy,
  legalName,
  tradeName,
  countryCode,
  deploymentMode,
  contactName,
  contactEmail,
  contactPhone,
  notes,
  onLegalName,
  onTradeName,
  onCountryCode,
  onDeploymentMode,
  onContactName,
  onContactEmail,
  onContactPhone,
  onNotes,
}: CustomerEditorFieldsProps) {
  return (
    <>
      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <Building2 size={18} strokeWidth={1.75} aria-hidden />
          Datos comerciales y facturación
        </h3>
        <p className="issue-license-subpanel__hint">
          Razón social o persona a quien se facturará. Las empresas con su respectivo RUC se crean posteriormente dentro del sistema.
        </p>
        <div className="issue-license-field-grid issue-license-field-grid--2">
          <TextBox
            id="customer-legal-name"
            label="Razón social o Persona a facturar"
            labelPosition="outlined"
            variant="outline"
            value={legalName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onLegalName(e.target.value)}
            placeholder="Persona o Razón social"
            required
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
          <TextBox
            id="customer-trade-name"
            label="Nombre comercial / Alias"
            labelPosition="outlined"
            variant="outline"
            value={tradeName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onTradeName(e.target.value)}
            placeholder="Opcional"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
        </div>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <MapPin size={18} strokeWidth={1.75} aria-hidden />
          País y despliegue
        </h3>
        <div className="issue-license-field-grid issue-license-field-grid--2">
          <TextBox
            id="customer-country"
            label="País"
            labelPosition="outlined"
            variant="outline"
            value={countryCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onCountryCode(e.target.value)}
            placeholder="EC"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
          <Select
            id="customer-deployment"
            label="Modo de despliegue"
            labelPosition="outlined"
            variant="outline"
            options={[...CUSTOMER_DEPLOYMENT_OPTIONS]}
            value={deploymentMode}
            onChange={onDeploymentMode}
            placeholder="Seleccionar modo…"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
        </div>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <UserRound size={18} strokeWidth={1.75} aria-hidden />
          Contacto a quien facturar
        </h3>
        <div className="issue-license-field-grid issue-license-field-grid--3">
          <TextBox
            id="customer-contact-name"
            label="Nombre del contacto"
            labelPosition="outlined"
            variant="outline"
            value={contactName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onContactName(e.target.value)}
            placeholder="Nombre y apellidos"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
          <TextBox
            id="customer-contact-email"
            label="Correo de contacto / facturación"
            labelPosition="outlined"
            variant="outline"
            type="email"
            value={contactEmail}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onContactEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
          <TextBox
            id="customer-contact-phone"
            label="Teléfono"
            labelPosition="outlined"
            variant="outline"
            value={contactPhone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onContactPhone(e.target.value)}
            placeholder="+593…"
            disabled={busy}
            fullWidth
            size="md"
            theme={theme}
          />
        </div>
      </section>

      <section className="issue-license-subpanel">
        <h3 className="issue-license-subpanel__title">
          <StickyNote size={18} strokeWidth={1.75} aria-hidden />
          Notas internas
        </h3>
        <TextArea
          id="customer-notes"
          label="Notas"
          labelPosition="outlined"
          variant="outline"
          value={notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onNotes(e.target.value)}
          placeholder="Observaciones comerciales (opcional)"
          rows={3}
          resize="vertical"
          disabled={busy}
          fullWidth
          size="md"
          theme={theme}
        />
      </section>
    </>
  )
}
