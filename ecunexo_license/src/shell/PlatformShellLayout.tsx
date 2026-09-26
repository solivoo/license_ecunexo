import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton'
import { APP_VERSION_INFO } from '@/config/appVersion'
import { filterNavByRole } from '@/config/platformNav'
import { platformNavToMenuConfig } from '@/features/navigation/mapPlatformNavToMenu'
import { getPageTitle } from '@/lib/getPageTitle'
import { AboutPlatformModal } from '@/shell/AboutPlatformModal'
import { AppSidebar } from '@/shell/AppSidebar'
import { PlatformUserMenu } from '@/shell/PlatformUserMenu'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCredentials, selectOperatorRole } from '@/store/platformAuthSlice'
import './platformShell.css'
import './appShell.css'

export function PlatformShellLayout() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const dispatch = useAppDispatch()
  const role = useAppSelector(selectOperatorRole)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [lastRoute, setLastRoute] = useState(`${pathname}${search}`)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  )

  // Auto-cerrar sidebar móvil/tablet al cambiar de ruta (ajuste en render, sin efecto)
  const routeKey = `${pathname}${search}`
  if (lastRoute !== routeKey) {
    setLastRoute(routeKey)
    setMobileOpen(false)
  }

  const navItems = useMemo(() => filterNavByRole(role), [role])
  const menu = useMemo(() => platformNavToMenuConfig(navItems), [navItems])
  const pageTitle = getPageTitle(pathname, menu)

  const logout = useCallback(() => {
    dispatch(clearCredentials())
    void navigate('/login', { replace: true })
  }, [dispatch, navigate])

  // Detección reactiva de tablet y móviles
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024
      setIsMobile(mobile)
      if (!mobile) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Escape cierra el drawer móvil
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className={`app-shell${collapsed ? ' app-shell--collapsed' : ''}${
        mobileOpen ? ' app-shell--mobile-open' : ''
      }`}
    >
      {/* Backdrop oscuro con blur para cerrar al tocar fuera en pantallas táctiles */}
      {mobileOpen && (
        <div
          className="app-shell__mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar navegación lateral"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setMobileOpen(false)
          }}
        />
      )}

      <aside className="app-shell__sidebar" aria-label="Navegación principal">
        <div className="app-shell__nav">
          <AppSidebar
            items={navItems}
            collapsed={isMobile ? false : collapsed}
            onCollapsedChange={(next) => {
              if (isMobile) {
                setMobileOpen(false)
              } else {
                setCollapsed(next)
              }
            }}
          />
        </div>
        <div className="app-shell__sidebar-footer">
          <button
            type="button"
            className="app-shell__version-btn"
            onClick={() => setAboutOpen(true)}
            title={`EcuNexo Licencias v${APP_VERSION_INFO.version} (${APP_VERSION_INFO.gitCommit}) · Clic para ver detalles`}
          >
            <span className="app-shell__version-tag">v{APP_VERSION_INFO.version}</span>
            {(!collapsed || isMobile) && (
              <span className="app-shell__version-commit">{APP_VERSION_INFO.gitCommit}</span>
            )}
          </button>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          <div className="app-shell__header-start">
            <button
              type="button"
              className="app-shell__hamburger-btn"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
              title={mobileOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
              aria-expanded={mobileOpen}
            >
              <span className="material-symbols-outlined">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
            <span className="app-shell__header-title">{pageTitle}</span>
          </div>
          <div className="app-shell__header-end">
            <ThemeToggleButton variant="icon" />
            <PlatformUserMenu onLogout={logout} onOpenAbout={() => setAboutOpen(true)} />
          </div>
        </header>
        <div className="app-shell__content">
          <Outlet />
        </div>
      </div>

      <AboutPlatformModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}
