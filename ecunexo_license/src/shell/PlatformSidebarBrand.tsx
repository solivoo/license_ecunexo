import type { SidebarBrandProps } from 'glubox'
import logoDark from '@assets/solo_logo_ecunexo_dark.svg'
import logoLight from '@assets/solo_logo_ecunexo_light.svg'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'

export function PlatformSidebarBrand({ collapsed }: SidebarBrandProps) {
  const theme = useGluComponentTheme()
  const logo = theme === 'dark' ? logoDark : logoLight

  if (collapsed) {
    return (
      <img
        src={logo}
        alt="EcuNexo"
        className="sidebar-brand__logo sidebar-brand__logo--collapsed"
        decoding="async"
      />
    )
  }

  return (
    <div className="sidebar-brand" title="EcuNexo Licencias">
      <img src={logo} alt="EcuNexo" className="sidebar-brand__logo" decoding="async" />
    </div>
  )
}
