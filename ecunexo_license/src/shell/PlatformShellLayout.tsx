import { useCallback, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton'
import { filterNavByRole } from '@/config/platformNav'
import { AppSidebar } from '@/shell/AppSidebar'
import { PlatformUserMenu } from '@/shell/PlatformUserMenu'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCredentials, selectOperatorRole } from '@/store/platformAuthSlice'
import { APP_VERSION_INFO } from '@/config/appVersion'
import './platformShell.css'

export function PlatformShellLayout() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const role = useAppSelector(selectOperatorRole)
  const [collapsed, setCollapsed] = useState(false)

  const navItems = useMemo(() => filterNavByRole(role), [role])

  const logout = useCallback(() => {
    dispatch(clearCredentials())
    void navigate('/login', { replace: true })
  }, [dispatch, navigate])

  return (
    <div
      className={`platform-shell${collapsed ? ' platform-shell--collapsed' : ''}`}
    >
      <aside className="platform-shell__sidebar" aria-label="Navegación principal">
        <div className="platform-shell__nav">
          <AppSidebar
            items={navItems}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
          />
        </div>
        <div className="platform-shell__sidebar-footer">
          <div
            className="platform-shell__version-btn"
            title={`EcuNexo Licencias v${APP_VERSION_INFO.version} (${APP_VERSION_INFO.gitCommit})`}
          >
            <span className="platform-shell__version-tag">v{APP_VERSION_INFO.version}</span>
            {!collapsed && (
              <span className="platform-shell__version-commit">{APP_VERSION_INFO.gitCommit}</span>
            )}
          </div>
        </div>
      </aside>

      <div className="platform-shell__main">
        <header className="platform-shell__header">
          <span className="platform-shell__header-title">Panel de licencias</span>
          <div className="platform-shell__header-actions">
            <ThemeToggleButton />
            <PlatformUserMenu onLogout={logout} />
          </div>
        </header>
        <div className="platform-shell__content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
