import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextArea, TextBox, useToast } from 'glubox'
import {
  DollarSign,
  Info,
  LayoutGrid,
} from 'lucide-react'
import { PageHeader } from '@/components/ui'
import { PlanModuleConfigurator } from '@/components/licensing/PlanModuleConfigurator'
import {
  getModuleDefaultLimits,
  ensureIdentityModule,
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
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const [existingPlans, setExistingPlans] = useState<PlanListItem[]>([])

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
    if (moduleCode === 'identity' && limitKey === 'max_users') {
      const parsed = Number(value)
      if (parsed > 0) setMaxUsers(parsed)
    }
    if (moduleCode === 'warehousing' && limitKey === 'max_warehouses') {
      const parsed = Number(value)
      if (parsed > 0) setMaxWarehouses(parsed)
    }
  }, [])

  useEffect(() => {
    listPlans()
      .then(setExistingPlans)
      .catch(() => {
        toast.show({
          title: 'Error de carga',
          message: 'No se pudieron cargar los planes existentes.',
          variant: 'error',
        })
      })
  }, [toast])

  const codeTaken = useMemo(
    () => existingPlans.some((p) => p.code.toLowerCase() === code.trim().toLowerCase()),
    [existingPlans, code]
  )

  const onSubmit = async () => {
    setBusy(true)

    try {
      const codeTrimmed = code.trim().toLowerCase()
      if (!codeTrimmed) {
        toast.show({ title: 'Campo obligatorio', message: 'El código del plan es obligatorio.', variant: 'warning' })
        return
      }
      if (!/^[a-z0-9-]+$/.test(codeTrimmed)) {
        toast.show({ title: 'Formato inválido', message: 'El código solo permite minúsculas, números y guiones.', variant: 'warning' })
        return
      }
      if (!displayName.trim()) {
        toast.show({ title: 'Campo obligatorio', message: 'El nombre visible es obligatorio.', variant: 'warning' })
        return
      }
      if (codeTaken) {
        toast.show({ title: 'Código duplicado', message: 'El código ya existe en otro plan.', variant: 'warning' })
        return
      }

      const modules = ensureIdentityModule(selectedModules)
      const depErrors = validateModuleDependencies(modules)
      if (depErrors.length > 0) {
        toast.show({ title: 'Dependencias de módulos', message: depErrors.join(' '), variant: 'warning' })
        return
      }

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

      const userLimit = editLimits['identity']?.max_users
      const whLimit = editLimits['warehousing']?.max_warehouses
      const resolvedMaxUsers = userLimit && Number(userLimit) > 0 ? Number(userLimit) : maxUsers
      const resolvedMaxWarehouses = whLimit && Number(whLimit) > 0 ? Number(whLimit) : maxWarehouses

      const result = await createPlan({
        code: codeTrimmed,
        displayName: displayName.trim(),
        maxTenantsDefault: maxTenants,
        maxUsersDefault: resolvedMaxUsers,
        maxWarehousesDefault: resolvedMaxWarehouses,
        enabledModuleCodesDefault: modules,
        moduleEntitlementsDefault: entitlements.length > 0 ? entitlements : null,
        sortOrder,
        suggestedPriceUsdMonthly: price,
        description: description.trim() || undefined,
      })

      toast.show({
        title: 'Plan creado',
        message: `Plan «${result.displayName}» creado exitosamente.`,
        variant: 'success',
      })
      navigate(`/app/planes/${encodeURIComponent(result.code)}`)
    } catch (err: unknown) {
      toast.show({
        title: 'No se pudo crear el plan',
        message: readApiError(err, 'Error al crear plan.'),
        variant: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ecu-dashboard-layout ecu-section-page">
      <PageHeader
        title="Crear plan"
        subtitle="Define un plan comercial que los operadores elegirán al emitir licencias."
        actions={
          <Button variant="outline" onClick={() => navigate('/app/planes')}>
            ← Catálogo
          </Button>
        }
      />

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
              <TextBox
                id="plan-max-tenants"
                label="Empresas permitidas"
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

          {/* Sección 2: Módulos y límites contextuales */}
          <section className="issue-license-subpanel">
            <h3 className="issue-license-subpanel__title">
              <LayoutGrid size={18} strokeWidth={1.75} aria-hidden />
              Módulos y límites del plan
            </h3>
            <p className="issue-license-subpanel__desc">
              Selecciona los módulos habilitados. Cada módulo te permite configurar sus límites específicos directamente en su tarjeta.
            </p>
            <PlanModuleConfigurator
              selectedModules={selectedModules}
              onChangeModules={updateSelectedModules}
              limits={editLimits}
              onChangeLimit={setLimit}
              disabled={busy}
            />
          </section>

          {/* Sección 4: Comercial */}
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

          <footer className="issue-license-form-footer issue-license-form-footer--plan">
            <div />
            <div className="ecu-form-footer-actions">
              <Button
                variant="outline"
                size="md"
                disabled={busy}
                onClick={() => navigate('/app/planes')}
              >
                Cancelar
              </Button>
              <Button
                variant="primary" 
                size="md"
                disabled={busy}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {busy ? 'Creando…' : 'Crear plan'}
              </Button>
            </div>
          </footer>
        </div>
      </form>
    </div>
  )
}
