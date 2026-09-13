import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Ban, CheckCircle2, KeyRound, Plus } from 'lucide-react'
import { Button, OptionGroup, Popup, type PageActionItem } from 'glubox'
import { EcuPageActions } from '@/components/ui/EcuPageActions'
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { ExpandLicenseDialog } from '@/components/licensing/ExpandLicenseDialog'
import { IssueLicenseResultDialog } from '@/components/licensing/IssueLicenseResultDialog'
import { renderSidebarIcon } from '@/config/sidebarIcons'
import { moduleLabels } from '@/constants/tenantModules'
import { useGluComponentTheme } from '@/hooks/useGluComponentTheme'
import {
  listLicenses,
  reissueLicense,
  type LicenseListItem,
  type ReissueLicenseResult,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'
import { LicensesGrid } from './LicensesGrid'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'Active', label: 'Activas' },
  { value: 'Revoked', label: 'Revocadas' },
  { value: 'Exhausted', label: 'Agotadas' },
] as const

export function LicensesListPage() {
  const theme = useGluComponentTheme()
  const navigate = useNavigate()
  const [rows, setRows] = useState<LicenseListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [expandRow, setExpandRow] = useState<LicenseListItem | null>(null)
  const [expandOpen, setExpandOpen] = useState(false)
  const [reissueBusy, setReissueBusy] = useState(false)
  const [reissued, setReissued] = useState<ReissueLicenseResult | null>(null)
  const [reissuedModules, setReissuedModules] = useState<string[]>([])
  const [resultOpen, setResultOpen] = useState(false)

  const showError = useCallback((message: string) => {
    setLoadError(message)
    setErrorOpen(true)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listLicenses()
      setLoadError(null)
      setErrorOpen(false)
      setRows(data)
    } catch (err) {
      showError(readApiError(err, 'No se pudo cargar licencias emitidas.'))
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    let cancelled = false
    listLicenses()
      .then((data) => {
        if (cancelled) return
        setLoadError(null)
        setErrorOpen(false)
        setRows(data)
      })
      .catch((err) => {
        if (cancelled) return
        showError(readApiError(err, 'No se pudo cargar licencias emitidas.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showError])

  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  const metrics = useMemo(() => {
    const total = rows.length
    const active = rows.filter((r) => r.status === 'Active').length
    const revoked = rows.filter((r) => r.status === 'Revoked').length
    const exhausted = rows.filter((r) => r.status === 'Exhausted').length
    return { total, active, revoked, exhausted }
  }, [rows])

  const actionItems = useMemo(
    (): PageActionItem[] => [
      {
        id: 'refresh',
        label: 'Actualizar',
        icon: 'refresh-cw',
        route: null,
        disabled: loading || reissueBusy,
      },
    ],
    [loading, reissueBusy],
  )

  const handleExpand = useCallback((row: LicenseListItem) => {
    setExpandRow(row)
    setExpandOpen(true)
  }, [])

  const handleConfirmExpand = useCallback(
    async (planCode: string, enabledModules: string[]) => {
      if (!expandRow) return

      setReissueBusy(true)
      setLoadError(null)
      setErrorOpen(false)
      try {
        const result = await reissueLicense(expandRow.id, {
          onlineValidationIntervalDays: expandRow.onlineValidationIntervalDays ?? 30,
          planCode,
        })
        setExpandOpen(false)
        setExpandRow(null)
        setReissued(result)
        setReissuedModules(enabledModules)
        setResultOpen(true)
        await load()
      } catch (err) {
        showError(readApiError(err, 'No se pudo ampliar la licencia.'))
      } finally {
        setReissueBusy(false)
      }
    },
    [expandRow, load, showError],
  )

  return (
    <div className="ecu-dashboard-layout">
      <PageHeader
        title="Historial de Licencias"
        subtitle="Licencias emitidas. Ampliar revoca la anterior y genera un código y archivo con el plan elegido."
        badge={
          <StatusBadge tone="primary" withDot>
            Licencias
          </StatusBadge>
        }
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              theme={theme}
              disabled={loading || reissueBusy}
              onClick={() => void navigate('/app/licencias/nueva')}
            >
              <Plus size={16} aria-hidden />
              Emitir licencia
            </Button>
            <EcuPageActions
              items={actionItems}
              variant="outline"
              triggerLabel="Acciones"
              renderIcon={renderSidebarIcon}
              onNavigate={(route: string) => navigate(route)}
              onActionSelect={(item) => {
                if (item.id === 'refresh') void load()
              }}
            />
          </>
        }
      />

      {loadError && !errorOpen ? (
        <p className="platform-shell__alert platform-shell__alert--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="ecu-stat-grid">
        <StatCard
          label="Total licencias"
          value={loading ? '—' : metrics.total}
          icon={<KeyRound size={22} strokeWidth={1.75} />}
          toneColor="var(--shell-primary)"
          footerText="Emisiones registradas"
        />
        <StatCard
          label="Licencias activas"
          value={loading ? '—' : metrics.active}
          icon={<CheckCircle2 size={22} strokeWidth={1.75} />}
          toneColor="#10b981"
          badge={
            <StatusBadge tone="success" withDot>
              Operativas
            </StatusBadge>
          }
        />
        <StatCard
          label="Revocadas"
          value={loading ? '—' : metrics.revoked}
          icon={<Ban size={22} strokeWidth={1.75} />}
          toneColor="#ef4444"
          badge={
            metrics.revoked > 0 ? (
              <StatusBadge tone="danger">Revocadas</StatusBadge>
            ) : undefined
          }
        />
        <StatCard
          label="Agotadas"
          value={loading ? '—' : metrics.exhausted}
          icon={<AlertTriangle size={22} strokeWidth={1.75} />}
          toneColor="#f59e0b"
          badge={
            metrics.exhausted > 0 ? (
              <StatusBadge tone="warning">Sin cupos</StatusBadge>
            ) : undefined
          }
        />
      </div>

      <SectionCard
        title="Licencias Emitidas"
        subtitle="Registro cronológico y trazabilidad criptográfica"
        action={
          <OptionGroup
            id="licenses-status-filter"
            name="licensesStatus"
            layout="segmented"
            variant="outline"
            size="sm"
            theme={theme}
            options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
            value={statusFilter}
            onChange={(val) => setStatusFilter(String(val))}
            disabled={loading || reissueBusy}
          />
        }
      >
        {!loading && visibleRows.length === 0 ? (
          <EmptyState
            icon={<KeyRound size={32} strokeWidth={1.75} />}
            title="No se encontraron licencias"
            description={
              statusFilter !== 'all'
                ? 'No existen licencias emitidas con el estado seleccionado.'
                : 'Genera la primera licencia comercial para activar un entorno de cliente.'
            }
            action={
              statusFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  theme={theme}
                  onClick={() => void navigate('/app/licencias/nueva')}
                >
                  <Plus size={16} aria-hidden />
                  Emitir primera licencia
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  theme={theme}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Ver todas las licencias
                </Button>
              )
            }
          />
        ) : (
          <LicensesGrid
            rows={visibleRows}
            loading={loading}
            onExpand={handleExpand}
          />
        )}
      </SectionCard>

      <Popup
        open={errorOpen}
        onClose={() => {
          setErrorOpen(false)
          setLoadError(null)
        }}
        title="Error de licencias"
        width="min(92vw, 28rem)"
        theme={theme}
        actions={[
          {
            id: 'close',
            label: 'Entendido',
            variant: 'primary',
            onClick: () => {
              setErrorOpen(false)
              setLoadError(null)
            },
          },
        ]}
      >
        <p className="issue-license-error-popup">{loadError ?? 'Ocurrió un error.'}</p>
      </Popup>

      <ExpandLicenseDialog
        open={expandOpen}
        license={expandRow}
        busy={reissueBusy}
        onClose={() => {
          if (reissueBusy) return
          setExpandOpen(false)
          setExpandRow(null)
        }}
        onConfirm={(planCode, enabledModules) => void handleConfirmExpand(planCode, enabledModules)}
      />

      {reissued ? (
        <IssueLicenseResultDialog
          issued={{
            licenseId: reissued.licenseId,
            activationCodePlaintext: reissued.activationCodePlaintext,
            licenseArtifact: reissued.licenseArtifact,
            expiresAtUtc: reissued.expiresAtUtc,
            provisioningSlotsRemaining: reissued.provisioningSlotsRemaining,
            planLabel: reissued.planLabel,
          }}
          enabledModules={reissuedModules}
          modulesLabel={moduleLabels(reissuedModules) || 'Ver plan emitido'}
          supersedesGrantId={reissued.supersedesGrantId}
          generation={reissued.generation}
          reissueKind={reissued.reissueKind}
          previousPlanLabel={reissued.previousPlanLabel}
          open={resultOpen}
          onClose={() => {
            setResultOpen(false)
            setReissued(null)
            setReissuedModules([])
          }}
        />
      ) : null}
    </div>
  )
}

