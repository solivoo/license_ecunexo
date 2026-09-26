import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION_INFO } from '@/config/appVersion'
import {
  selectCanManageOperators,
  selectOperatorEmail,
  selectOperatorRole,
} from '@/store/platformAuthSlice'
import { useAppSelector } from '@/store/hooks'

export type PlatformUserMenuProps = {
  readonly onLogout: () => void
  readonly onOpenAbout?: () => void
}

export function PlatformUserMenu({ onLogout, onOpenAbout }: PlatformUserMenuProps) {
  const navigate = useNavigate()
  const email = useAppSelector(selectOperatorEmail)
  const role = useAppSelector(selectOperatorRole)
  const canManage = useAppSelector(selectCanManageOperators)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const displayName = email?.trim() || 'Operador'
  const initial = displayName.charAt(0).toUpperCase()
  const modeLabel = role ? `Rol · ${role}` : 'Operador de plataforma'

  const close = useCallback(() => setOpen(false), [])

  const handleLogout = useCallback(() => {
    close()
    onLogout()
  }, [close, onLogout])

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        close()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <div className="app-shell__user-menu" ref={rootRef}>
      <button
        type="button"
        className="app-shell__user-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de cuenta · ${displayName}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-shell__user-avatar" aria-hidden>
          {initial}
        </span>
        <span className="material-symbols-outlined app-shell__user-menu-chevron" aria-hidden>
          expand_more
        </span>
      </button>
      {open ? (
        <div className="app-shell__user-menu-panel" role="menu">
          <div className="app-shell__user-menu-identity">
            <p className="app-shell__user-menu-name" title={displayName}>
              {displayName}
            </p>
            <p className="app-shell__user-menu-meta">{modeLabel}</p>
          </div>
          {canManage ? (
            <button
              type="button"
              className="app-shell__user-menu-item"
              role="menuitem"
              onClick={() => {
                close()
                void navigate('/app/configuracion/correo')
              }}
            >
              <span className="material-symbols-outlined" aria-hidden>
                settings
              </span>
              Configuración del sistema
            </button>
          ) : null}
          <button
            type="button"
            className="app-shell__user-menu-item"
            role="menuitem"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined" aria-hidden>
              logout
            </span>
            Cerrar sesión
          </button>
          <div className="app-shell__user-menu-divider" />
          <button
            type="button"
            className="app-shell__user-menu-item app-shell__user-menu-item--about"
            role="menuitem"
            onClick={() => {
              close()
              onOpenAbout?.()
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>
              info
            </span>
            <span className="app-shell__user-menu-label">Información</span>
            <span className="app-shell__user-menu-version-pill">v{APP_VERSION_INFO.version}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
