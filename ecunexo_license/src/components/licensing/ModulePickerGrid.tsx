import { useCallback } from 'react'
import {
  ensureIdentityModule,
  getDependants,
  getRequiredModules,
  moduleShortLabel,
  REQUIRED_LICENSE_MODULE_CODE,
  TENANT_MODULE_OPTIONS,
} from '@/constants/tenantModules'

export type ModulePickerGridProps = {
  readonly selected: string[]
  readonly onChange: (codes: string[]) => void
  readonly disabled?: boolean
  readonly idPrefix?: string
}

/**
 * Selector compacto multi-columna de módulos.
 * Mantiene la misma semántica de dependencias que `ModuleChipList`:
 * al activar agrega dependencias y al desactivar quita dependientes.
 */
export function ModulePickerGrid({
  selected,
  onChange,
  disabled = false,
  idPrefix = 'grant',
}: ModulePickerGridProps) {
  const selectedSet = new Set(selected.map((code) => code.toLowerCase()))

  const toggleModule = useCallback(
    (code: string, checked: boolean) => {
      const base = selected.filter((current) => current !== REQUIRED_LICENSE_MODULE_CODE)
      if (checked) {
        const toAdd = new Set<string>([code])
        const stack = [code]
        while (stack.length > 0) {
          const current = stack.pop()
          if (!current) break
          for (const required of getRequiredModules(current)) {
            if (!toAdd.has(required)) {
              toAdd.add(required)
              stack.push(required)
            }
          }
        }
        onChange(ensureIdentityModule([...new Set([...base, ...toAdd])]))
        return
      }
      const toRemove = new Set<string>([code])
      const stack = [code]
      while (stack.length > 0) {
        const current = stack.pop()
        if (!current) break
        for (const dependant of getDependants(current)) {
          if (!toRemove.has(dependant)) {
            toRemove.add(dependant)
            stack.push(dependant)
          }
        }
      }
      onChange(ensureIdentityModule(base.filter((current) => !toRemove.has(current))))
    },
    [onChange, selected]
  )

  return (
    <div className="grant-tenants__module-grid" role="group" aria-label="Módulos habilitados">
      {TENANT_MODULE_OPTIONS.map((module) => {
        const required = module.code === REQUIRED_LICENSE_MODULE_CODE
        const checked = required || selectedSet.has(module.code)
        const inputId = `${idPrefix}-module-${module.code}`
        const optionDisabled = disabled || required
        return (
          <label
            key={module.code}
            htmlFor={inputId}
            className={`grant-tenants__module-option${
              optionDisabled ? ' grant-tenants__module-option--disabled' : ''
            }`}
            title={required ? `${module.label} — incluido en todas las licencias` : module.label}
          >
            <input
              id={inputId}
              type="checkbox"
              checked={checked}
              disabled={optionDisabled}
              onChange={(event) => toggleModule(module.code, event.target.checked)}
            />
            <span>{moduleShortLabel(module.code)}</span>
          </label>
        )
      })}
    </div>
  )
}
