import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { Button, Select, TextBox, useToast } from 'glubox'
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Link2,
  Lock,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import {
  ensureIdentityModule,
  getDependants,
  getRequiredModules,
  limitKeyLabel,
  MODULES_WITH_LIMITS,
  REQUIRED_LICENSE_MODULE_CODE,
  resolveModulesWithDependencies,
  TENANT_MODULE_OPTIONS,
} from '@/constants/tenantModules'
import { EcuAlertDialog } from '@/components/ui'

export type PlanModuleConfiguratorProps = {
  readonly selectedModules: string[]
  readonly onChangeModules: (codes: string[]) => void
  readonly limits: Record<string, Record<string, string>>
  readonly onChangeLimit: (moduleCode: string, limitKey: string, value: string) => void
  readonly disabled?: boolean
}

export function PlanModuleConfigurator({
  selectedModules,
  onChangeModules,
  limits,
  onChangeLimit,
  disabled = false,
}: PlanModuleConfiguratorProps) {
  const toast = useToast()
  const [selectedToAdd, setSelectedToAdd] = useState('')
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({})
  const [confirmRemoveModule, setConfirmRemoveModule] = useState<{
    code: string
    label: string
    dependants: string[]
  } | null>(null)

  const selectedSet = useMemo(
    () => new Set(selectedModules.map((c) => c.toLowerCase())),
    [selectedModules]
  )

  // Módulos opcionales disponibles para agregar
  const availableModules = useMemo(
    () => TENANT_MODULE_OPTIONS.filter((m) => !selectedSet.has(m.code)),
    [selectedSet]
  )

  const selectOptions = useMemo(
    () =>
      availableModules.map((m) => ({
        value: m.code,
        label: `${m.label}${m.category ? ` (${m.category})` : ''}`,
      })),
    [availableModules]
  )

  // Módulos actualmente activos ordenados según catálogo (identity primero)
  const activeModules = useMemo(
    () => TENANT_MODULE_OPTIONS.filter((m) => selectedSet.has(m.code)),
    [selectedSet]
  )

  const toggleCollapse = useCallback((code: string) => {
    setCollapsedCards((prev) => ({ ...prev, [code]: !prev[code] }))
  }, [])

  const handleAddModule = useCallback(() => {
    if (!selectedToAdd) return
    const moduleToAdd = TENANT_MODULE_OPTIONS.find((m) => m.code === selectedToAdd)
    if (!moduleToAdd) return

    const newModuleCodes = resolveModulesWithDependencies([...selectedModules, selectedToAdd])
    const addedDeps = newModuleCodes.filter(
      (c) => c !== selectedToAdd && !selectedSet.has(c) && c !== REQUIRED_LICENSE_MODULE_CODE
    )

    onChangeModules(newModuleCodes)
    setSelectedToAdd('')

    if (addedDeps.length > 0) {
      const depLabels = addedDeps
        .map((c) => TENANT_MODULE_OPTIONS.find((m) => m.code === c)?.label ?? c)
        .join(', ')
      toast.show({
        title: 'Módulo agregado con dependencias',
        message: `Se añadió «${moduleToAdd.label}» y se incluyeron automáticamente: ${depLabels}.`,
        variant: 'info',
      })
    } else {
      toast.show({
        title: 'Módulo agregado',
        message: `Se añadió «${moduleToAdd.label}» al plan.`,
        variant: 'success',
      })
    }
  }, [selectedToAdd, selectedModules, selectedSet, onChangeModules, toast])

  const requestRemoveModule = useCallback(
    (code: string) => {
      if (code === REQUIRED_LICENSE_MODULE_CODE) return

      const moduleObj = TENANT_MODULE_OPTIONS.find((m) => m.code === code)
      const label = moduleObj?.label ?? code

      // Verificar si hay módulos dependientes activos
      const activeDependants = getDependants(code).filter((d) => selectedSet.has(d))
      if (activeDependants.length > 0) {
        setConfirmRemoveModule({
          code,
          label,
          dependants: activeDependants,
        })
        return
      }

      // Quitar módulo directamente
      const next = selectedModules.filter((c) => c.toLowerCase() !== code.toLowerCase())
      onChangeModules(ensureIdentityModule(next))
      toast.show({
        title: 'Módulo removido',
        message: `Se quitó «${label}» del plan.`,
        variant: 'info',
      })
    },
    [selectedModules, selectedSet, onChangeModules, toast]
  )

  const confirmCascadeRemove = useCallback(() => {
    if (!confirmRemoveModule) return
    const toRemove = new Set<string>([
      confirmRemoveModule.code,
      ...confirmRemoveModule.dependants,
    ])
    const next = selectedModules.filter((c) => !toRemove.has(c.toLowerCase()))
    onChangeModules(ensureIdentityModule(next))
    const removedLabels = confirmRemoveModule.dependants
      .map((d) => TENANT_MODULE_OPTIONS.find((m) => m.code === d)?.label ?? d)
      .join(', ')
    toast.show({
      title: 'Módulos removidos en cascada',
      message: `Se quitó «${confirmRemoveModule.label}» y sus dependientes: ${removedLabels}.`,
      variant: 'warning',
    })
    setConfirmRemoveModule(null)
  }, [confirmRemoveModule, selectedModules, onChangeModules, toast])

  return (
    <div className="ecu-plan-module-configurator">
      {/* Barra para agregar módulo desde select */}
      <div className="ecu-plan-module-picker-bar">
        <div className="ecu-plan-module-picker-bar__select">
          <Select
            label="Agregar módulo habilitado"
            labelPosition="outlined"
            variant="outline"
            size="md"
            options={selectOptions}
            value={selectedToAdd}
            onChange={setSelectedToAdd}
            placeholder={
              selectOptions.length > 0
                ? 'Seleccionar módulo para habilitar…'
                : 'Todos los módulos disponibles ya están incluidos'
            }
            disabled={disabled || selectOptions.length === 0}
            fullWidth
          />
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={disabled || !selectedToAdd}
          onClick={handleAddModule}
          className="ecu-plan-module-picker-bar__btn"
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
          Agregar módulo
        </Button>
      </div>

      {/* Lista de tarjetas de módulos activos con sus límites contextuales */}
      <div className="ecu-plan-module-list">
        {activeModules.map((module) => {
          const isRequired = module.code === REQUIRED_LICENSE_MODULE_CODE
          const isCollapsed = !!collapsedCards[module.code]
          const requiredByThis = getRequiredModules(module.code)
          const activeDependants = getDependants(module.code).filter((d) => selectedSet.has(d))
          const moduleLimitsConfig = MODULES_WITH_LIMITS.find((m) => m.code === module.code)
          const limitKeys = moduleLimitsConfig ? Object.keys(moduleLimitsConfig.defaultLimits) : []
          const currentLimits = limits[module.code] ?? {}

          return (
            <div
              key={module.code}
              className={`ecu-plan-module-card ${
                isRequired ? 'ecu-plan-module-card--required' : ''
              }`}
            >
              <div className="ecu-plan-module-card__header">
                <div className="ecu-plan-module-card__title-row">
                  <span className="ecu-plan-module-card__icon">
                    <Layers size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h4 className="ecu-plan-module-card__title">
                      {module.label}
                      {isRequired ? (
                        <span className="ecu-plan-module-tag ecu-plan-module-tag--required">
                          <Lock size={12} strokeWidth={2} aria-hidden />
                          Base obligatorio
                        </span>
                      ) : null}
                      {module.category ? (
                        <span className="ecu-plan-module-tag ecu-plan-module-tag--category">
                          {module.category}
                        </span>
                      ) : null}
                    </h4>
                    <p className="ecu-plan-module-card__desc">{module.description}</p>
                  </div>
                </div>

                <div className="ecu-plan-module-card__actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCollapse(module.code)}
                    title={isCollapsed ? 'Expandir configuración' : 'Colapsar configuración'}
                  >
                    {isCollapsed ? (
                      <ChevronDown size={16} strokeWidth={2} aria-hidden />
                    ) : (
                      <ChevronUp size={16} strokeWidth={2} aria-hidden />
                    )}
                  </Button>
                  {!isRequired ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      onClick={() => requestRemoveModule(module.code)}
                      className="ecu-plan-module-card__btn-remove"
                      title={`Quitar módulo ${module.label}`}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Dependencias informativas */}
              {(requiredByThis.length > 0 || activeDependants.length > 0) && !isCollapsed ? (
                <div className="ecu-plan-module-card__deps">
                  {requiredByThis.length > 0 ? (
                    <span className="ecu-plan-module-dep-hint">
                      <Link2 size={13} strokeWidth={2} aria-hidden />
                      Requiere:{' '}
                      <strong>
                        {requiredByThis
                          .map((r) => TENANT_MODULE_OPTIONS.find((m) => m.code === r)?.label ?? r)
                          .join(', ')}
                      </strong>
                    </span>
                  ) : null}
                  {activeDependants.length > 0 ? (
                    <span className="ecu-plan-module-dep-used">
                      Requerido por:{' '}
                      <strong>
                        {activeDependants
                          .map((d) => TENANT_MODULE_OPTIONS.find((m) => m.code === d)?.label ?? d)
                          .join(', ')}
                      </strong>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Configuración de límites contextuales dentro de la tarjeta del módulo */}
              {!isCollapsed ? (
                <div className="ecu-plan-module-card__body">
                  {limitKeys.length > 0 ? (
                    <div className="ecu-plan-module-card__limits-section">
                      <div className="ecu-plan-module-card__limits-header">
                        <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
                        <span>Configuración de límites de cuota</span>
                        <span className="ecu-plan-module-card__limits-note">
                          (Dejar vacío o -1 para ilimitado)
                        </span>
                      </div>
                      <div className="issue-license-form-grid">
                        {limitKeys.map((key) => {
                          const val = currentLimits[key] ?? ''
                          const defaultVal = moduleLimitsConfig?.defaultLimits[key]
                          return (
                            <TextBox
                              key={key}
                              label={limitKeyLabel(key)}
                              labelPosition="outlined"
                              variant="outline"
                              size="md"
                              type="number"
                              inputMode="numeric"
                              min={-1}
                              value={val}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                onChangeLimit(module.code, key, e.target.value)
                              }
                              placeholder="ilimitado"
                              helperText={
                                defaultVal !== undefined
                                  ? `Valor sugerido: ${defaultVal === -1 ? 'Ilimitado' : defaultVal}`
                                  : undefined
                              }
                              disabled={disabled}
                              fullWidth
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="ecu-plan-module-card__no-limits">
                      Módulo habilitado por permisos de rol sin límites numéricos de cuota.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Diálogo de advertencia al intentar quitar un módulo con dependientes activos */}
      <EcuAlertDialog
        open={confirmRemoveModule !== null}
        title="Quitar módulo dependiente"
        message={
          confirmRemoveModule
            ? `El módulo «${confirmRemoveModule.label}» es requerido por: ${confirmRemoveModule.dependants
                .map((d) => TENANT_MODULE_OPTIONS.find((m) => m.code === d)?.label ?? d)
                .join(', ')}. Si continúas, también se removerán estos módulos dependientes del plan.`
            : ''
        }
        confirmLabel="Quitar módulo y dependientes"
        onConfirm={confirmCascadeRemove}
        onClose={() => setConfirmRemoveModule(null)}
      />
    </div>
  )
}
