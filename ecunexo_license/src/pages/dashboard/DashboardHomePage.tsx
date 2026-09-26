import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Layers, ShieldCheck, Users, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'glubox'
import { EmptyState, PageHeader, QuickActionCard, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { listPlans, listLicenses, type PlanListItem } from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { useAppSelector } from '@/store/hooks'
import { selectCanManageOperators, selectOperatorRole } from '@/store/platformAuthSlice'

export function DashboardHomePage() {
  const navigate = useNavigate()
  const role = useAppSelector(selectOperatorRole)
  const canManageOperators = useAppSelector(selectCanManageOperators)

  const [metrics, setMetrics] = useState({ activePlans: 0, totalLicenses: 0, activeLicenses: 0 })
  const [recentPlans, setRecentPlans] = useState<PlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listPlans(), listLicenses()])
      .then(([plans, licenses]) => {
        if (cancelled) return
        setMetrics({
          activePlans: plans.filter((p) => p.isActive).length,
          totalLicenses: licenses.length,
          activeLicenses: licenses.filter((l) => l.status === 'Active').length,
        })
        setRecentPlans(plans.slice(0, 4))
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(readApiError(err, 'Error al cargar métricas. ¿API en 5090?'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Panel de Operaciones"
        subtitle="Centro de control de licenciamiento, planes comerciales y seguridad corporativa"
        badge={
          <StatusBadge tone="primary" withDot>
            {role ?? 'Operador'}
          </StatusBadge>
        }
        actions={
          <Button
            type="button"
            variant="primary"
            
            onClick={() => navigate('/app/licencias/nueva')}
          >
            Emitir licencia
          </Button>
        }
      />

      {loadError ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="ecu-stat-grid">
        <StatCard
          label="Planes activos"
          value={loading ? '—' : metrics.activePlans}
          icon={<Layers size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Catálogo comercial"
        />
        <StatCard
          label="Licencias emitidas"
          value={loading ? '—' : metrics.totalLicenses}
          icon={<KeyRound size={22} strokeWidth={1.75} />}
          toneColor="#8b5cf6"
          footerText="Historial acumulado"
        />
        <StatCard
          label="Licencias activas"
          value={loading ? '—' : metrics.activeLicenses}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Operativas
            </StatusBadge>
          }
        />
      </div>

      <SectionCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} strokeWidth={2} aria-hidden />
            Accesos rápidos
          </span>
        }
        subtitle="Acciones y flujos frecuentes de la plataforma"
      >
        <div className="ecu-action-grid">
          <QuickActionCard
            to="/app/licencias/nueva"
            icon={<KeyRound size={22} strokeWidth={1.75} />}
            title="Emitir nueva licencia"
            description="Genera código de activación y archivo .lic criptográfico firmado"
            badge={<StatusBadge tone="primary">Emisión</StatusBadge>}
          />
          <QuickActionCard
            to="/app/licencias/historial"
            icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
            title="Historial de licencias"
            description="Supervisa, reemite o amplía licencias activas y revocadas"
          />
          <QuickActionCard
            to="/app/planes"
            icon={<Layers size={22} strokeWidth={1.75} />}
            title="Catálogo de planes"
            description="Configura cupos, tiers y módulos contratables en Ecuador"
          />
          <QuickActionCard
            to="/app/clientes"
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Directorio de clientes"
            description="Administra titulares de suscripción y razones sociales"
          />
          {canManageOperators ? (
            <QuickActionCard
              to="/app/operadores"
              icon={<ShieldCheck size={22} strokeWidth={1.75} />}
              title="Operadores del sistema"
              description="Gestiona usuarios y credenciales con acceso al panel"
              badge={<StatusBadge tone="info">Seguridad</StatusBadge>}
            />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} strokeWidth={2} aria-hidden />
            Planes comerciales
          </span>
        }
        subtitle="Esquemas de licenciamiento configurados en la plataforma"
        action={
          <Button
            type="button"
            variant="outline"
            
            size="sm"
            onClick={() => navigate('/app/planes/nuevo')}
          >
            Nuevo plan
          </Button>
        }
      >
        {recentPlans.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} strokeWidth={1.75} />}
            title="No hay planes registrados"
            description="Crea el primer plan comercial para habilitar la emisión de licencias."
            action={
              <Button
                type="button"
                variant="primary"
                
                onClick={() => navigate('/app/planes/nuevo')}
              >
                Crear primer plan
              </Button>
            }
          />
        ) : (
          <div className="ecu-dashboard-plan-list">
            {recentPlans.map((plan) => (
              <div
                key={plan.code}
                className="ecu-dashboard-plan-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/app/planes/${encodeURIComponent(plan.code)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/app/planes/${encodeURIComponent(plan.code)}`)
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span className="ecu-dashboard-plan-item__name">{plan.displayName}</span>
                  <span className="ecu-dashboard-plan-item__code">{plan.code}</span>
                </div>
                {plan.suggestedPriceUsdMonthly != null ? (
                  <span className="ecu-dashboard-plan-item__price">
                    ${plan.suggestedPriceUsdMonthly.toFixed(2)} / mes
                  </span>
                ) : (
                  <StatusBadge tone="neutral">A cotizar</StatusBadge>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
