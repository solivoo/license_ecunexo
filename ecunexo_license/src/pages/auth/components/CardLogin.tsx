import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextBox } from 'glubox'
import { KeyRound, Mail } from 'lucide-react'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import { platformLogin } from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/platformAuthSlice'

export function CardLogin() {
  const theme = useGluComponentTheme()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await platformLogin(email.trim(), password)
      dispatch(
        setCredentials({
          accessToken: result.accessToken,
          operatorId: result.operatorId,
          expiresAt: result.expiresAt,
          operatorRole: result.role,
          operatorEmail: email.trim(),
        })
      )
      void navigate('/app/inicio', { replace: true })
    } catch (err: unknown) {
      setError(readApiError(err, 'Credenciales inválidas o API no disponible (puerto 5090).'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="login-page__form login-page__form--glu"
      onSubmit={(e) => {
        e.preventDefault()
        void onSubmit()
      }}
      noValidate
    >
      {error ? (
        <p className="welcome-onboarding__error" role="alert">
          {error}
        </p>
      ) : null}

      <TextBox
        id="login-email"
        label="Correo electrónico"
        labelPosition="outlined"
        variant="outline"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        placeholder="nombre@correo.com"
        iconLeft={<Mail size={18} strokeWidth={1.75} aria-hidden />}
        fullWidth
        size="lg"
        theme={theme}
        required
      />

      <div className="login-page__aux-link-row">
        <a className="login-page__link-muted" href="#recuperar">
          ¿Olvidó su contraseña?
        </a>
      </div>

      <TextBox
        id="login-password"
        label="Contraseña"
        labelPosition="outlined"
        variant="outline"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        placeholder="••••••••"
        iconLeft={<KeyRound size={18} strokeWidth={1.75} aria-hidden />}
        fullWidth
        size="lg"
        theme={theme}
        required
      />

      <p className="login-page__muted login-page__muted--compact">
        Usa el correo y la contraseña que te proporcionó el administrador. Si aún no tienes cuenta,
        contacta al administrador de la plataforma.
      </p>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} theme={theme}>
        {busy ? 'Entrando…' : 'Iniciar sesión'}
      </Button>

      <div className="login-page__cta-block">
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          theme={theme}
          onClick={() => {
            window.location.hash = 'solicitar'
          }}
        >
          Solicitar acceso
        </Button>
      </div>
    </form>
  )
}
