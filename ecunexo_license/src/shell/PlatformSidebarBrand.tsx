import type { SidebarBrandProps } from 'glubox'
import logoDark from '@assets/solo_logo_ecunexo_dark.svg'
import logoLight from '@assets/solo_logo_ecunexo_light.svg'
import { APP_VERSION_INFO } from '@/config/appVersion'
import { useTheme } from '@/theme/ThemeProvider'

export function PlatformSidebarBrand({ collapsed }: SidebarBrandProps) {
  const { mode } = useTheme()
  const logo = mode === 'dark' ? logoDark : logoLight

  if (collapsed) {
    return (
      <div
        className="platform-sidebar-brand platform-sidebar-brand--collapsed"
        title={`EcuNexo v${APP_VERSION_INFO.version}`}
      >
        <img
          src={logo}
          alt="EcuNexo"
          className="platform-sidebar-brand__logo platform-sidebar-brand__logo--collapsed"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div
      className="platform-sidebar-brand"
      title={`EcuNexo Licencias v${APP_VERSION_INFO.version} (${APP_VERSION_INFO.gitCommit})`}
    >
      <img
        src={logo}
        alt="EcuNexo"
        className="platform-sidebar-brand__logo"
        decoding="async"
      />
      <span className="platform-sidebar-brand__version">v{APP_VERSION_INFO.version}</span>
    </div>
  )
}

