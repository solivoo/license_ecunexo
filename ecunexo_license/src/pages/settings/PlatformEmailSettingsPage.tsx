import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { Button, CheckButton, TextBox, Toast } from 'glubox'
import { PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import {
  getPlatformEmailSettings,
  testPlatformEmailSettings,
  updatePlatformEmailSettings,
  type PlatformEmailSettingsDto,
} from '@/lib/platformEmailApi'
import { readApiError } from '@/lib/readApiError'

export function PlatformEmailSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const [settings, setSettings] = useState<PlatformEmailSettingsDto>({
    host: '',
    port: 587,
    useSsl: false,
    userName: '',
    hasPassword: false,
    senderEmail: '',
    senderName: 'EcuNexo Platform',
    isConfigured: false,
    source: 'None',
  })

  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  // Diagnóstico / Test
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPlatformEmailSettings()
      setSettings(data)
      setLoadError(null)
      if (!testEmail && data.senderEmail) {
        setTestEmail(data.senderEmail)
      }
    } catch (err) {
      setLoadError(readApiError(err, 'No se pudo cargar la configuración de correo.'))
    } finally {
      setLoading(false)
    }
  }, [testEmail])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const applyZohoPreset = () => {
    setSettings((prev) => ({
      ...prev,
      host: 'smtp.zoho.com',
      port: 465,
      useSsl: true,
      senderName: prev.senderName || 'EcuNexo Platform',
    }))
    setToastMessage('Valores de Zoho Mail preconfigurados (puerto 465 SSL). Ingrese su usuario y contraseña.')
    setToastType('success')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings.host.trim()) {
      setToastMessage('El servidor SMTP (Host) es obligatorio.')
      setToastType('error')
      return
    }

    setSaving(true)
    try {
      const updated = await updatePlatformEmailSettings({
        host: settings.host.trim(),
        port: Number(settings.port) || 587,
        useSsl: settings.useSsl,
        userName: settings.userName.trim(),
        password: password.trim() ? password.trim() : undefined,
        senderEmail: settings.senderEmail.trim(),
        senderName: settings.senderName.trim() || 'EcuNexo Platform',
      })
      setSettings(updated)
      setPassword('')
      setToastMessage('Configuración de correo institucional guardada exitosamente.')
      setToastType('success')
    } catch (err) {
      setToastMessage(readApiError(err, 'Error al guardar configuración SMTP.'))
      setToastType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestResult({ success: false, message: 'Ingrese un correo electrónico válido para la prueba.' })
      return
    }

    setTesting(true)
    setTestResult(null)
    try {
      const res = await testPlatformEmailSettings({ targetEmail: testEmail.trim() })
      setTestResult({ success: true, message: res.message })
      setToastMessage(res.message)
      setToastType('success')
    } catch (err) {
      const msg = readApiError(err, 'Fallo en la prueba de conexión SMTP.')
      setTestResult({ success: false, message: msg })
      setToastMessage(msg)
      setToastType('error')
    } finally {
      setTesting(false)
    }
  }

  const providerLabel = useMemo(() => {
    if (!settings.host) return 'Sin configurar'
    if (settings.host.toLowerCase().includes('zoho')) return 'Zoho Mail'
    if (settings.host.toLowerCase().includes('google') || settings.host.toLowerCase().includes('gmail'))
      return 'Google Workspace'
    if (settings.host.toLowerCase().includes('outlook') || settings.host.toLowerCase().includes('office365'))
      return 'Microsoft 365'
    return 'SMTP Estándar'
  }, [settings.host])

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Servidor de Correo Institucional"
        badge={
          <StatusBadge tone={settings.isConfigured ? 'success' : 'warning'}>
            {settings.isConfigured ? 'SMTP Operativo' : 'Sin Configurar'}
          </StatusBadge>
        }
        subtitle="Configuración del motor de correos de la Plataforma EcuNexo para la entrega formal de licencias, activación y calendarización de capacitaciones."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="outline"
              
              onClick={fetchSettings}
              disabled={loading}
              title="Refrescar parámetros"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
          </div>
        }
      />

      {loadError && (
        <div
          style={{
            background: 'var(--glb-color-error-container, #fee2e2)',
            color: 'var(--glb-color-on-error-container, #991b1b)',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Estado del Motor"
          value={settings.isConfigured ? 'Conectado' : 'Pendiente'}
          icon={settings.isConfigured ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          footerText={
            settings.source === 'Database'
              ? 'Persistido en PostgreSQL'
              : settings.source === 'Environment'
                ? 'Variables de entorno Docker'
                : 'Sin servidor configurado'
          }
        />
        <StatCard
          label="Proveedor Activo"
          value={providerLabel}
          icon={<Server className="w-5 h-5" />}
          footerText={settings.host ? `${settings.host}:${settings.port}` : 'Ningún host asignado'}
        />
        <StatCard
          label="Remitente Saliente"
          value={settings.senderEmail || settings.userName || 'No configurado'}
          icon={<Mail className="w-5 h-5" />}
          footerText={settings.senderName || 'EcuNexo Platform'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}>
        {/* Formulario de Configuración */}
        <SectionCard
          title="Parámetros de Conexión SMTP"
          subtitle="Configure las credenciales del servidor institucional que despachará las licencias comerciales."
          action={
            <Button
              variant="outline"
              
              onClick={applyZohoPreset}
              title="Preconfigurar con valores recomendados de Zoho Mail"
            >
              <Zap className="w-4 h-4 mr-1.5 text-amber-500" />
              Preajuste Zoho Mail
            </Button>
          }
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Servidor SMTP (Host) *
                </label>
                <TextBox
                  value={settings.host}
                  placeholder="ej. smtp.zoho.com"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setSettings((prev) => ({ ...prev, host: v }))
                  }}
                  
                  fullWidth
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Puerto SMTP *
                </label>
                <TextBox
                  value={String(settings.port)}
                  placeholder="465 o 587"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setSettings((prev) => ({ ...prev, port: parseInt(v, 10) || 587 }))
                  }}
                  
                  fullWidth
                />
              </div>
            </div>

            <div style={{ padding: '8px 0' }}>
              <CheckButton
                checked={settings.useSsl}
                onChange={(checked) => setSettings((prev) => ({ ...prev, useSsl: checked }))}
                
              >
                Usar conexión SSL/TLS directa (Obligatorio para puerto 465 de Zoho Mail)
              </CheckButton>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Usuario / Correo de Autenticación
                </label>
                <TextBox
                  value={settings.userName}
                  placeholder="ej. contacto@ecunexo.com"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setSettings((prev) => ({ ...prev, userName: v }))
                  }}
                  
                  fullWidth
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Contraseña SMTP {settings.hasPassword && '(Guardada en sistema)'}
                </label>
                <TextBox
                  type="password"
                  value={password}
                  placeholder={settings.hasPassword ? '•••••••••••••••• (dejar vacío para mantener)' : 'Contraseña de aplicación o cuenta'}
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setPassword(v)
                  }}
                  
                  fullWidth
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Correo del Remitente (From)
                </label>
                <TextBox
                  value={settings.senderEmail}
                  placeholder="ej. licencias@ecunexo.com"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setSettings((prev) => ({ ...prev, senderEmail: v }))
                  }}
                  
                  fullWidth
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Nombre del Remitente
                </label>
                <TextBox
                  value={settings.senderName}
                  placeholder="ej. EcuNexo Platform"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setSettings((prev) => ({ ...prev, senderName: v }))
                  }}
                  
                  fullWidth
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="primary" type="submit" disabled={saving}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {saving ? 'Guardando...' : 'Guardar Parámetros SMTP'}
              </Button>
            </div>
          </form>
        </SectionCard>

        {/* Panel de Diagnóstico y Prueba en Vivo */}
        <SectionCard
          title="Prueba de Envío y Diagnóstico en Tiempo Real"
          subtitle="Envíe un correo de verificación para comprobar que las credenciales y el handshake SSL funcionen correctamente."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Correo de destino para la prueba
                </label>
                <TextBox
                  value={testEmail}
                  placeholder="tu-correo@empresa.com"
                  onChange={(e: any) => {
                    const v = typeof e === 'string' ? e : e?.target?.value ?? ''
                    setTestEmail(v)
                  }}
                  
                  fullWidth
                />
              </div>
              <Button
                variant="outline"
                
                onClick={handleTestEmail}
                disabled={testing || !testEmail.trim()}
              >
                <Send className={`w-4 h-4 mr-1.5 ${testing ? 'animate-pulse' : ''}`} />
                {testing ? 'Verificando con SMTP...' : 'Enviar Correo de Prueba'}
              </Button>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: testResult.success
                    ? 'var(--glb-color-success-container, #dcfce7)'
                    : 'var(--glb-color-error-container, #fee2e2)',
                  color: testResult.success
                    ? 'var(--glb-color-on-success-container, #166534)'
                    : 'var(--glb-color-on-error-container, #991b1b)',
                }}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                )}
                <div>
                  <strong>{testResult.success ? 'Conexión Exitosa' : 'Fallo en la prueba'}</strong>
                  <p style={{ margin: '4px 0 0 0' }}>{testResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {toastMessage && (
        <Toast
          title={toastMessage}
          variant={toastType as any}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  )
}
