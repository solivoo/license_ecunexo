import { useCallback, useMemo } from 'react'
import { Button } from 'glubox'
import { TENANT_MODULE_OPTIONS } from '@/constants/tenantModules'

const PLAN_A1_MODULE_CODES = ['identity', 'customers', 'catalog', 'facturacion'] as const
const PLAN_B1_C1_MODULE_CODES = ['identity', 'customers', 'catalog', 'facturacion', 'purchases', 'warehousing', 'inventory'] as const
const ECOMMERCE_MODULE_CODES = ['identity', 'customers', 'catalog', 'facturacion', 'purchases', 'warehousing', 'inventory', 'orders', 'ecommerce'] as const
const ALL_MODULE_CODES = TENANT_MODULE_OPTIONS.map((m) => m.code)

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
}

export type ModulePresetChipsProps = {
  readonly selectedModules: string[]
  readonly onApply: (codes: string[]) => void
}

export function ModulePresetChips({ selectedModules, onApply }: ModulePresetChipsProps) {

  const activePreset = useMemo(() => {
    if (sameSet(selectedModules, PLAN_A1_MODULE_CODES)) return 'plan-a1'
    if (sameSet(selectedModules, PLAN_B1_C1_MODULE_CODES)) return 'plan-b1-c1'
    if (sameSet(selectedModules, ECOMMERCE_MODULE_CODES)) return 'ecommerce'
    if (sameSet(selectedModules, ALL_MODULE_CODES)) return 'all'
    return null
  }, [selectedModules])

  const applyPlanA1 = useCallback(() => {
    onApply([...PLAN_A1_MODULE_CODES])
  }, [onApply])

  const applyPlanB1C1 = useCallback(() => {
    onApply([...PLAN_B1_C1_MODULE_CODES])
  }, [onApply])

  const applyEcommerce = useCallback(() => {
    onApply([...ECOMMERCE_MODULE_CODES])
  }, [onApply])

  const applyAll = useCallback(() => {
    onApply([...ALL_MODULE_CODES])
  }, [onApply])

  return (
    <div className="ecu-module-preset-actions">
      <Button
        type="button"
        variant={activePreset === 'plan-a1' ? 'primary' : 'outline'}
        size="sm"
        onClick={applyPlanA1}
      >
        Plan A1
      </Button>
      <Button
        type="button"
        variant={activePreset === 'plan-b1-c1' ? 'primary' : 'outline'}
        size="sm"
        onClick={applyPlanB1C1}
      >
        Plan B1 / C1
      </Button>
      <Button
        type="button"
        variant={activePreset === 'ecommerce' ? 'primary' : 'outline'}
        size="sm"
        onClick={applyEcommerce}
      >
        + E-commerce
      </Button>
      <Button
        type="button"
        variant={activePreset === 'all' ? 'primary' : 'outline'}
        size="sm"
        onClick={applyAll}
      >
        Todos
      </Button>
    </div>
  )
}
