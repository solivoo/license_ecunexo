import { useCallback, useState } from 'react'
import { Popup, useToast } from 'glubox'
import { Check, Clock, Copy, ExternalLink, GitBranch, GitCommit } from 'lucide-react'
import { APP_VERSION_INFO, formatBuildDate } from '@/config/appVersion'
import { useAppSelector } from '@/store/hooks'
import { selectOperatorEmail, selectOperatorRole } from '@/store/platformAuthSlice'

export interface AboutPlatformModalProps {
  readonly open: boolean
  readonly onClose: () => void
}

export function AboutPlatformModal({ open, onClose }: AboutPlatformModalProps) {
  const toast = useToast()
  const email = useAppSelector(selectOperatorEmail)
  const role = useAppSelector(selectOperatorRole)
  const [copied, setCopied] = useState(false)

  const handleCopyDiagnostics = useCallback(async () => {
    const text = [
      `EcuNexo Licencias v${APP_VERSION_INFO.version}`,
      `Commit: ${APP_VERSION_INFO.gitCommit} (${APP_VERSION_INFO.gitBranch})`,
      `Build: ${APP_VERSION_INFO.buildTime}`,
      `Operador: ${email ?? '—'} (${role ?? '—'})`,
      `Entorno: ${APP_VERSION_INFO.isProduction ? 'producción' : 'desarrollo'}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.show({
        title: 'Copiado al portapapeles',
        message: 'Información técnica copiada para soporte.',
        variant: 'success',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.show({
        title: 'Error',
        message: 'No se pudo copiar al portapapeles.',
        variant: 'error',
      })
    }
  }, [email, role, toast])

  return (
    <Popup
      open={open}
      title="Acerca de EcuNexo"
      onClose={onClose}
      width="min(92vw, 30rem)"
      actions={[
        {
          id: 'close',
          label: 'Entendido',
          variant: 'primary',
          onClick: onClose,
        },
      ]}
    >
      <div className="ecu-about-modal">
        <div className="ecu-about-modal__hero">
          <img
            src="/favicon.svg"
            alt="EcuNexo"
            className="ecu-about-modal__logo"
            width={48}
            height={48}
          />
          <div className="ecu-about-modal__titles">
            <h3 className="ecu-about-modal__title">EcuNexo Licencias</h3>
            <p className="ecu-about-modal__subtitle">Plataforma Empresarial & Emisión de Licencias</p>
          </div>
        </div>

        <div className="ecu-about-modal__grid">
          <div className="ecu-about-modal__item">
            <span className="ecu-about-modal__label">Versión</span>
            <span className="ecu-about-modal__value ecu-about-modal__badge">
              v{APP_VERSION_INFO.version}
            </span>
          </div>

          <div className="ecu-about-modal__item">
            <span className="ecu-about-modal__label">Commit</span>
            <a
              href={APP_VERSION_INFO.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ecu-about-modal__link"
              title="Ver commit en GitHub"
            >
              <GitCommit size={14} aria-hidden />
              <span>{APP_VERSION_INFO.gitCommit}</span>
              <ExternalLink size={12} aria-hidden />
            </a>
          </div>

          <div className="ecu-about-modal__item">
            <span className="ecu-about-modal__label">Rama</span>
            <span className="ecu-about-modal__value">
              <GitBranch size={14} aria-hidden />
              <span>{APP_VERSION_INFO.gitBranch}</span>
            </span>
          </div>

          <div className="ecu-about-modal__item">
            <span className="ecu-about-modal__label">Compilación</span>
            <span className="ecu-about-modal__value" title={APP_VERSION_INFO.buildTime}>
              <Clock size={14} aria-hidden />
              <span>{formatBuildDate(APP_VERSION_INFO.buildTime)}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ecu-about-modal__copy-btn"
          onClick={() => {
            void handleCopyDiagnostics()
          }}
        >
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico para soporte'}
        </button>
      </div>
    </Popup>
  )
}
