import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextArea, TextBox } from 'glubox'
import {
  AlertTriangle,
  DollarSign,
  Info,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react'
import { EcuAlertDialog } from '@/components/ui/EcuAlertDialog'
import { ModuleChipList } from '@/components/licensing/ModuleChipList'
import {
  MODULES_WITH_LIMITS,
  getModuleDefaultLimits,
  ensureIdentityModule,
  limitKeyLabel,
  validateModuleDependencies,
} from '@/constants/tenantModules'
import {
  createPlan,
  listPlans,
  type ModuleEntitlement,
  type PlanListItem,
} from '@/lib/platformLicensingApi'
import { readApiError } from '@/lib/readApiError'

/** Inicializa límites editables desde los defaults del catálogo. */
function initLimitsForModules(modules: string[]): Record<string, Record<string, string>> {
  const tl: Record<string, Record<string, string>> = {}
  for (const code of modules) {
    const defaults = getModuleDefaultLimits(code)
    if (defaults) {
      tl[code] = Object.fromEntries(
        Object.entries(defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
      )
    }
  }
  return tl
}

export function CreatePlanPage() {
  const formRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorOpen, setErrorOpen] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [existingPlans, setExistingPlans] = useState<PlanListItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [maxTenants, setMaxTenants] = useState(1)
  const [maxUsers, setMaxUsers] = useState(5)
  const [maxWarehouses, setMaxWarehouses] = useState(1)
  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])
  const [suggestedPrice, setSuggestedPrice] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  /** Límites editables por módulo. */
  const [editLimits, setEditLimits] = useState<Record<string, Record<string, string>>>(() =>
    initLimitsForModules(['identity'])
  )

  useEffect(() => {
    listPlans()
      .then(setExistingPlans)
      .catch(() => setLoadError('No se pudieron cargar los planes existentes.'))
  }, [])

  const codeTaken = useMemo(
    () => existingPlans.some((p) => p.code.toLowerCase() === code.trim().toLowerCase()),
    [existingPlans, code]
  )

  const depWarnings = useMemo(
    () => validateModuleDependencies(selectedModules),
    [selectedModules]
  )

  const updateSelectedModules = useCallback((codes: string[]) => {
    setSelectedModules(codes)
    setEditLimits((prev) => {
      const next = { ...prev }
      for (const code of codes) {
        if (!next[code]) {
          const defaults = getModuleDefaultLimits(code)
          if (defaults) {
            next[code] = Object.fromEntries(
              Object.entries(defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
            )
          }
        }
      }
      for (const key of Object.keys(next)) {
        if (!codes.includes(key)) delete next[key]
      }
      return next
    })
  }, [])

  const setLimit = useCallback((moduleCode: string, limitKey: string, value: string) => {
    setEditLimits((prev) => ({
      ...prev,
      [moduleCode]: { ...prev[moduleCode], [limitKey]: value },
    }))
  }, [])

  const showError = (message: string) => {
    setError(message)
    setErrorOpen(true)
  }

  const onSubmit = async () => {
    setError(null)
    setErrorOpen(false)
    setSuccess(null)
    setBusy(true)

    try {
      const codeTrimmed = code.trim().toLowerCase()
      if (!codeTrimmed) throw new Error('El código es obligatorio.')
      if (!/^[a-z0-9-]+$/.test(codeTrimmed)) {
        throw new Error('El código solo permite minúsculas, números y guiones.')
      }
      if (!displayName.trim()) throw new Error('El nombre visible es obligatorio.')
      if (codeTaken) throw new Error('El código ya existe en otro plan.')

      const modules = ensureIdentityModule(selectedModules)
      const depErrors = validateModuleDependencies(modules)
      if (depErrors.length > 0) throw new Error(depErrors.join(' '))

      const price = suggestedPrice.trim()
        ? parseFloat(suggestedPrice.trim())
        : undefined

      const entitlements: ModuleEntitlement[] = []
      for (const mc of modules) {
        const rawLimits = editLimits[mc]
        if (!rawLimits) continue
        const limits: Record<string, number> = Object.fromEntries(
          Object.entries(rawLimits)
            .filter(([, v]) => v.trim() !== '')
            .map(([k, v]) => {
              const num = Number(v)
              return [k, isNaN(num) ? -1 : num]
            })
        )
        if (Object.keys(limits).length > 0) {
          entitlements.push({ moduleCode: mc, tier: 0, limits })
        }
      }

      const result = await createPlan({
        code: codeTrimmed,
        displayName: displayName.trim(),
        maxTenantsDefault: maxTenants,
        maxUsersDefault: maxUsers,
        maxWarehousesDefault: maxWarehouses,
        enabledModuleCodesDefault: modules,
        moduleEntitlementsDefault: entitlements.length > 0 ? entitlements : null,
        sortOrder,
        suggestedPriceUsdMonthly: price,
        description: description.trim() || undefined,
      })

      setSuccess(`Plan «${result.displayName}» creado.`)
      const fresh = await listPlans()
      setExistingPlans(fresh)
      navigate(`/app/planes/${encodeURIComponent(result.code)}`)
    } catch (err: unknown) {
      showError(readApiError(err, 'Error al crear plan.'))
    } finally {
      setBusy(false)
    }
  }

  const limitsModules = MODULES_WITH_LIMITS.filter((m) => selectedModules.includes(m.code))

  return (
    <>
      <div className="ecu-page-header">
        <div>
          <h1 className="platform-shell__page-title">Crear plan</h1>
          <p className="platform-shell__page-lead">
            Define un plan comercial que los operadores elegirán al emitir licencias.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/planes')}>
          ← Catálogo
        </Button>
      </div>

      {loadError ? (
        <p className="welcome-onboarding__error" role="alert">
          {loadError}
        </p>
      ) : null}

      {success ? (
        <p className="ecu-success-message" role="status">
          {success}
        </p>
      ) : null}

      {depWarnings.length > 0 ? (
        <div className="ecu-validation-warnings" role="alert">
          <AlertTriangle className="ecu-validation-warnings__icon" size={18} strokeWidth={1.75} aria-hidden />
          <ul className="ecu-validation-warnings__list">
            {depWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        ref={formRef}
        className="ecu-sf-form-skin"
        onSubmit={(e) => { e.preventDefault(); void onSubmit() }}
        noValidate
      >
        <div className="issue-license-panel">
          {/* Sección 1: Identidad */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <Info size={18} strokeWidth={1.75} aria-hidden />
              Identidad del plan
            </h3>

            <div className="issue-license-form-grid">
              <TextBox
                id="plan-code"
                label="Código"
                labelPosition="outlined"
                variant="outline"
                value={code}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="p. ej. enterprise-plus"
                helperText={
                  codeTaken
                    ? 'Este código ya está en uso.'
                    : 'Solo minúsculas, números y guiones.'
                }
                required
                fullWidth
                size="md"
                
              />
              <TextBox
                id="plan-name"
                label="Nombre visible"
                labelPosition="outlined"
                variant="outline"
                value={displayName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                placeholder="p. ej. Enterprise Plus"
                required
                fullWidth
                size="md"
                
              />
              <TextArea
                id="plan-desc"
                className="issue-license-form-grid__span-full"
                label="Descripción"
                labelPosition="outlined"
                variant="outline"
                size="md"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Resumen comercial del plan (opcional)"
                rows={2}
                resize="vertical"
                fullWidth
                
              />
            </div>
          </section>

          {/* Sección 2: Límites base */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
              Límites predeterminados
            </h3>

            <div className="issue-license-form-grid">
              <TextBox
                id="plan-max-tenants"
                label="Empresas"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                value={String(maxTenants)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxTenants(Number(e.target.value))}
                helperText="Tenants máximos por licencia"
                fullWidth
                size="md"
                
              />
              <TextBox
                id="plan-max-users"
                label="Usuarios por empresa"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={1}
                max={99999}
                value={String(maxUsers)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxUsers(Number(e.target.value))}
                fullWidth
                size="md"
                
              />
              <TextBox
                id="plan-max-warehouses"
                label="Bodegas por empresa"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                value={String(maxWarehouses)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxWarehouses(Number(e.target.value))}
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          {/* Sección 3: Módulos */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
              Módulos predeterminados
            </h3>
            <ModuleChipList selected={selectedModules} onChange={updateSelectedModules} />
          </section>

          {/* Sección 4: Límites por módulo */}
          {limitsModules.length > 0 ? (
            <section className="issue-license-subpanel">
              <h3 className="issue-license-subpanel__title">
                <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
                Límites por módulo
              </h3>
              <p className="issue-license-subpanel__desc">
                Ajusta los límites de cada módulo. Dejar vacío = ilimitado.
              </p>

              {limitsModules.map((m) => {
                const limits = editLimits[m.code]
                const limitKeys = Object.keys(m.defaultLimits)
                return (
                  <div key={m.code} className="module-tier-row module-tier-row--stack">
                    <span className="module-tier-row__label">{m.label}</span>
                    {limitKeys.length > 0 && limits ? (
                      <div className="issue-license-form-grid">
                        {limitKeys.map((key) => (
                          <TextBox
                            key={key}
                            label={limitKeyLabel(key)}
                            labelPosition="outlined"
                            variant="outline"
                            size="md"
                            type="number"
                            inputMode="numeric"
                            min={-1}
                            value={limits[key] ?? ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setLimit(m.code, key, e.target.value)}
                            placeholder="ilimitado"
                            fullWidth
                            
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </section>
          ) : null}

          {/* Sección 5: Comercial */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <DollarSign size={18} strokeWidth={1.75} aria-hidden />
              Información comercial
            </h3>

            <div className="issue-license-form-grid">
              <TextBox
                id="plan-price"
                label="Precio sugerido USD/mes"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={suggestedPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSuggestedPrice(e.target.value)}
                placeholder="0.00"
                fullWidth
                size="md"
                
              />
              <TextBox
                id="plan-sort"
                label="Orden en catálogo"
                labelPosition="outlined"
                variant="outline"
                type="number"
                inputMode="numeric"
                min={0}
                max={999}
                value={String(sortOrder)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSortOrder(Number(e.target.value))}
                helperText="Menor = primero en la lista"
                fullWidth
                size="md"
                
              />
            </div>
          </section>

          <footer className="issue-license-form-footer">
            <Button
              className="ecu-btn issue-license-submit"
              variant="primary" 
              size="lg"
              disabled={busy}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {busy ? 'Creando…' : 'Crear plan'}
            </Button>
          </footer>
        </div>
      </form>

      <EcuAlertDialog
        open={errorOpen}
        title="No se pudo crear el plan"
        message={error ?? 'Error inesperado.'}
        onClose={() => {
          setErrorOpen(false)
          setError(null)
        }}
      />
    </>
  )
}
