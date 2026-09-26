import { useCallback, useMemo, type ChangeEvent } from 'react'
import { CheckButton, TextBox, useToast } from 'glubox'
import { EcuLabeledDropDown } from '@/components/form/EcuLabeledDropDown'
import { ModuleChipList } from '@/components/licensing/ModuleChipList'
import { SectionCard } from '@/components/ui'
import {
  MODULES_WITH_LIMITS,
  ensureIdentityModule,
  getModuleDefaultLimits,
  getModuleFlags,
  limitKeyLabel,
  validateModuleDependencies,
} from '@/constants/tenantModules'

const TIER_OPTIONS = [
  { text: 'Small', value: '0' },
  { text: 'Medium', value: '1' },
  { text: 'Big', value: '2' },
  { text: 'Enterprise', value: '3' },
]

export type GrantEntitlementsFormProps = {
  readonly selectedModules: string[]
  readonly tiers: Record<string, string>
  readonly limits: Record<string, Record<string, string>>
  readonly disabled?: boolean
  readonly idPrefix?: string
  readonly onSelectedModulesChange: (codes: string[]) => void
  readonly onTierChange: (moduleCode: string, tier: string) => void
  readonly onLimitChange: (moduleCode: string, key: string, value: string) => void
}

export function GrantEntitlementsForm({
  selectedModules,
  tiers,
  limits,
  disabled = false,
  idPrefix = 'grant',
  onSelectedModulesChange,
  onTierChange,
  onLimitChange,
}: GrantEntitlementsFormProps) {
  const toast = useToast()

  const editableModules = useMemo(
    () => MODULES_WITH_LIMITS.filter((module) => selectedModules.includes(module.code)),
    [selectedModules]
  )

  const updateModules = useCallback(
    (codes: string[]) => {
      const normalized = ensureIdentityModule(codes)
      const dependencyErrors = validateModuleDependencies(normalized)
      if (dependencyErrors.length > 0) {
        toast.show({
          title: 'Dependencias de módulos',
          message: dependencyErrors[0],
          variant: 'warning',
        })
        return
      }
      onSelectedModulesChange(normalized)
    },
    [onSelectedModulesChange, toast]
  )

  return (
    <>
      <SectionCard title="Módulos habilitados">
        <ModuleChipList selected={selectedModules} onChange={updateModules} />
      </SectionCard>

      {editableModules.length > 0 ? (
        <SectionCard title="Tier y límites por módulo">
          {editableModules.map((module) => {
            const flags = getModuleFlags(module.code)
            const flagKeys = new Set(flags.map((flag) => flag.key))
            const limitKeys = Object.keys(getModuleDefaultLimits(module.code) ?? {}).filter(
              (key) => !flagKeys.has(key)
            )
            return (
              <div key={module.code} className="module-tier-row module-tier-row--stack">
                <div className="issue-license-form-grid">
                  <EcuLabeledDropDown
                    id={`${idPrefix}-tier-${module.code}`}
                    label={`${module.label} · Tier`}
                    dataSource={TIER_OPTIONS}
                    value={tiers[module.code] ?? '0'}
                    onChange={(value) => onTierChange(module.code, value)}
                    disabled={disabled}
                  />
                </div>
                {flags.length > 0 ? (
                  <div className="issue-license-form-grid">
                    {flags.map((flag) => (
                      <CheckButton
                        key={flag.key}
                        checked={(limits[module.code]?.[flag.key] ?? '1') !== '0'}
                        onChange={(checked: boolean) =>
                          onLimitChange(module.code, flag.key, checked ? '1' : '0')
                        }
                        disabled={disabled}
                        size="sm"
                      >
                        {flag.label}
                      </CheckButton>
                    ))}
                  </div>
                ) : null}
                {limitKeys.length > 0 ? (
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
                        min={0}
                        value={limits[module.code]?.[key] ?? ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          onLimitChange(module.code, key, e.target.value)
                        }
                        placeholder="ilimitado"
                        disabled={disabled}
                        fullWidth
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </SectionCard>
      ) : null}
    </>
  )
}
