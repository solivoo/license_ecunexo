import { useEffect, useState } from 'react'
import { Button, Popup } from 'glubox'
import { Check, Copy } from 'lucide-react'
import {
  buildLicenseFileContent,
  createLicenseFileDownload,
  suggestLicenseFileName,
} from '@/lib/licenseFile'
import type { IssueLicenseResult } from '@/lib/platformLicensingApi'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
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
  const theme = useGluComponentTheme()
  const [download, setDownload] = useState<{ url: string; fileName: string } | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setDownload(null)
      setDownloadError(null)
      setCodeCopied(false)
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
      theme={theme}
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
              theme={theme}
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
      </div>
    </Popup>
  )
}
