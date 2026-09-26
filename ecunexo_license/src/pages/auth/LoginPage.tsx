import { Branding } from './components/Branding'
import { CardLogin } from './components/CardLogin'
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton'

export function LoginPage() {
  return (
    <div className="login-page__wrapper">
      <ThemeToggleButton variant="icon" className="login-page__theme-btn-round" />
      <Branding />
      <div className="login-page__card">
        <CardLogin />
      </div>
      <footer className="login-page__footer login-page__footer--brand">
        <div className="login-page__footer-links">
          <a href="#privacidad">Política de Privacidad</a>
          <a href="#terminos">Términos del Servicio</a>
        </div>
        <span>© {new Date().getFullYear()} EcuNexo — SaaS Multi-Tenant Platform</span>
      </footer>
    </div>
  )
}
