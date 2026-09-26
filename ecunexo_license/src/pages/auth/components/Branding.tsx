import logoDark from '@assets/solo_logo_ecunexo_dark.svg'
import logoLight from '@assets/solo_logo_ecunexo_light.svg'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'

export function Branding({ subtitle }: { readonly subtitle?: string }) {
  const mode = useGluComponentTheme()
  const logo = mode === 'dark' ? logoDark : logoLight

  return (
    <div className="login-page__brand">
      <div className="login-page__logo">
        <img src={logo} alt="EcuNexo" className="login-page__logo-img" />
      </div>
      <h1 className="login-page__title login-page__title--visually-hidden">EcuNexo</h1>
      <p className="login-page__subtitle">
        {subtitle ?? 'Licencias — Acceso corporativo'}
      </p>
    </div>
  )
}
