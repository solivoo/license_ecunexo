import type { SidebarBrandProps } from 'glubox'

export function PlatformSidebarBrand({ collapsed }: SidebarBrandProps) {
  if (collapsed) {
    return (
      <span className="ecu-wordmark ecu-wordmark--collapsed" aria-label="EcuNexo" title="EcuNexo Licencias">
        <span className="ecu-wordmark__name" aria-hidden>
          <strong>
            EC<span className="ecu-wordmark__x">X</span>
          </strong>
        </span>
      </span>
    )
  }

  return (
    <div className="sidebar-brand" title="EcuNexo Licencias">
      <span className="ecu-wordmark" aria-label="EcuNexo">
        <span className="ecu-wordmark__name" aria-hidden>
          Ecu<strong>Ne<span className="ecu-wordmark__x">x</span>o</strong>
        </span>
      </span>
    </div>
  )
}
