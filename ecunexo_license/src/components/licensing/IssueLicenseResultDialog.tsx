import { useEffect, useState } from 'react'
import { Button, Popup } from 'glubox'
import { Check, CheckCircle2, Copy, Mail, Send } from 'lucide-react'
import {
  buildLicenseFileContent,
  createLicenseFileDownload,
  suggestLicenseFileName,
} from '@/lib/licenseFile'
import type { IssueLicenseResult } from '@/lib/platformLicensingApi'
import { sendLicenseDeliveryEmail } from '@/lib/platformEmailApi'
import { readApiError } from '@/lib/readApiError'
import { TENANT_MODULE_OPTIONS } from '@/constants/tenantModules'

export type IssueLicenseResultDialogProps = {
  readonly issued: IssueLicenseResult
  readonly enabledModules: string[]
  readonly modulesLabel?: string
  readonly supersedesGrantId?: string | null
  readonly generation?: number
  readonly reissueKind?: string | null
  readonly previousPlanLabel?: string | null
  readonly open: boolean
  readonly onClose: () => void
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function IssueLicenseResultDialog({
  issued,
  enabledModules,
  supersedesGrantId,
  generation,
  reissueKind,
  previousPlanLabel,
  open,
  onClose,
}: IssueLicenseResultDialogProps) {
  const [download, setDownload] = useState<{ url: string; fileName: string } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [customEmail, setCustomEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)

  const handleSendEmail = async () => {
    setEmailSending(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      const artifactStr =
        typeof issued.licenseArtifact === 'string'
          ? issued.licenseArtifact
          : JSON.stringify(issued.licenseArtifact)
      const res = await sendLicenseDeliveryEmail({
        grantId: issued.licenseId,
        recipientEmail: customEmail.trim() || undefined,
        activationCodePlaintext: issued.activationCodePlaintext,
        licenseArtifact: artifactStr,
      })
      setEmailSuccess(res.message)
    } catch (err) {
      setEmailError(readApiError(err, 'No se pudo enviar la licencia por correo.'))
    } finally {
      setEmailSending(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setDownload(null)
      setDownloadError(null)
      setCodeCopied(false)
      setEmailSending(false)
      setEmailSuccess(null)
      setEmailError(null)
      setCustomEmail('')
      setShowEmailInput(false)
      return
    }

    let objectUrl: string | null = null

    try {
      const content = buildLicenseFileContent(issued, enabledModules)
      const fileName = suggestLicenseFileName(issued.planLabel)
      const nextDownload = createLicenseFileDownload(content, fileName)
      objectUrl = nextDownload.url
      setDownload(nextDownload)
      setDownloadError(null)
    } catch (err: unknown) {
      setDownload(null)
      setDownloadError(
        err instanceof Error ? err.message : 'No se pudo preparar el archivo de licencia.'
      )
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [open, issued, enabledModules])

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={
        reissueKind === 'Expand'
          ? 'Licencia ampliada'
          : reissueKind === 'Renew'
            ? 'Licencia renovada'
            : supersedesGrantId
              ? 'Licencia reemitida'
              : 'Licencia emitida'
      }
      width="min(94vw, 52rem)"
      
      actions={[{ id: 'close', label: 'Cerrar', variant: 'primary', onClick: onClose }]}
    >
      <div className="issue-license-result">
        <dl className="issue-license-review issue-license-review--4 issue-license-result__meta">
          {supersedesGrantId ? (
            <div className="issue-license-review__span-full">
              <dt>Reemplaza licencia</dt>
              <dd>{supersedesGrantId}</dd>
            </div>
          ) : null}
          {generation && generation > 1 ? (
            <div>
              <dt>Generación</dt>
              <dd>
                n.º {generation}
                {reissueKind === 'Expand'
                  ? previousPlanLabel
                    ? ` · desde ${previousPlanLabel}`
                    : ' · ampliada'
                  : reissueKind === 'Renew'
                    ? ' · renovada'
                    : ''}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Plan</dt>
            <dd>{issued.planLabel}</dd>
          </div>
          <div>
            <dt>Expira</dt>
            <dd>{new Date(issued.expiresAtUtc).toLocaleString()}</dd>
          </div>
          <div className="issue-license-review__span-full">
            <dt>Módulos ({enabledModules.length})</dt>
            <dd className="issue-license-modules-chips">
              {enabledModules.map((code) => {
                const opt = TENANT_MODULE_OPTIONS.find((m) => m.code === code)
                return (
                  <span key={code} className="issue-license-module-chip">
                    {opt?.label ?? code}
                  </span>
                )
              })}
            </dd>
          </div>
        </dl>

        <div className="issue-license-result__block">
          <span className="issue-license-result__label" id="issue-license-code-label">
            Código (una sola vez)
          </span>
          <div className="issue-license-result__code-field">
            <pre
              className="issue-license-result__code"
              id="issue-license-activation-code"
              aria-labelledby="issue-license-code-label"
            >
              {issued.activationCodePlaintext}
            </pre>
            <button
              type="button"
              className="issue-license-result__copy-icon"
              onClick={() => {
                void copyText(issued.activationCodePlaintext).then(() => {
                  setCodeCopied(true)
                  window.setTimeout(() => setCodeCopied(false), 2000)
                })
              }}
              aria-label={codeCopied ? 'Código copiado' : 'Copiar código'}
              title={codeCopied ? 'Copiado' : 'Copiar código'}
            >
              {codeCopied ? (
                <Check size={18} strokeWidth={1.75} aria-hidden />
              ) : (
                <Copy size={18} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>
        </div>

        <div className="issue-license-result__block">
          <span className="issue-license-result__label">Archivo de licencia</span>
          <p className="issue-license-result__hint">
            Entrega al cliente el código y el archivo <code>.ecunexo-license</code> por canales separados.
          </p>
          {downloadError ? (
            <p className="issue-license-result__download-error" role="alert">
              {downloadError}
            </p>
          ) : null}
          <div className="issue-license-result__actions">
            {download ? (
              <a
                className="issue-license-result__download-link"
                href={download.url}
                download={download.fileName}
              >
                Descargar .ecunexo-license
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              
              onClick={() =>
                void copyText(
                  typeof issued.licenseArtifact === 'string'
                    ? issued.licenseArtifact
                    : JSON.stringify(issued.licenseArtifact)
                )
              }
            >
              Copiar artefacto (JSON)
            </Button>
          </div>
        </div>

        <div className="issue-license-result__block" style={{ marginTop: 16 }}>
          <span className="issue-license-result__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={16} />
            Entrega al Correo del Cliente
          </span>
          <p className="issue-license-result__hint">
            Envía directamente la suscripción, código de activación e instructivo con el archivo adjunto <code>.ecunexo-license</code> al correo del cliente.
          </p>
          {emailSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', background: '#dcfce7', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 8 }}>
              <CheckCircle2 size={16} />
              <span>{emailSuccess}</span>
            </div>
          )}
          {emailError && (
            <p className="issue-license-result__download-error" role="alert" style={{ marginBottom: 8 }}>
              {emailError}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {showEmailInput ? (
              <input
                type="email"
                placeholder="correo-alternativo@cliente.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  minWidth: 240,
                }}
              />
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="sm"
              
              onClick={handleSendEmail}
              disabled={emailSending}
            >
              <Send size={14} className={`mr-1.5 ${emailSending ? 'animate-pulse' : ''}`} />
              {emailSending ? 'Enviando correo...' : 'Enviar por Correo al Cliente'}
            </Button>
            {!showEmailInput ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                
                onClick={() => setShowEmailInput(true)}
              >
                Otro destinatario
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Popup>
  )
}
