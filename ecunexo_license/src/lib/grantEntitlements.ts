import {
  ensureIdentityModule,
  getModuleDefaultLimits,
} from '@/constants/tenantModules'
import type { ModuleEntitlement } from '@/lib/platformLicensingApi'

export type GrantEntitlementsDraft = {
  selectedModules: string[]
  tiers: Record<string, string>
  limits: Record<string, Record<string, string>>
}

export function createGrantEntitlementsDraft(
  enabledModuleCodes: readonly string[],
  moduleEntitlements?: readonly ModuleEntitlement[] | null
): GrantEntitlementsDraft {
  const selectedModules = ensureIdentityModule(enabledModuleCodes)
  const tiers: Record<string, string> = {}
  const limits: Record<string, Record<string, string>> = {}
  for (const entitlement of moduleEntitlements ?? []) {
    tiers[entitlement.moduleCode] = String(entitlement.tier)
    limits[entitlement.moduleCode] = Object.fromEntries(
      Object.entries(entitlement.limits ?? {}).map(([key, value]) => [key, String(value)])
    )
  }
  for (const module of selectedModules) {
    if (limits[module]) continue
    limits[module] = Object.fromEntries(
      Object.entries(getModuleDefaultLimits(module) ?? {}).map(([key, value]) => [key, String(value)])
    )
  }
  return { selectedModules, tiers, limits }
}

export function toModuleEntitlements(
  selectedModules: readonly string[],
  tiers: Record<string, string>,
  limits: Record<string, Record<string, string>>
): ModuleEntitlement[] {
  return selectedModules.map((code) => {
    const moduleLimits: Record<string, number> = {}
    for (const [key, raw] of Object.entries(limits[code] ?? {})) {
      if (raw.trim() === '') continue
      const parsed = Number(raw)
      if (!Number.isFinite(parsed) || parsed < 0) continue
      moduleLimits[key] = parsed
    }
    return {
      moduleCode: code,
      tier: Number(tiers[code] ?? '0'),
      limits: Object.keys(moduleLimits).length > 0 ? moduleLimits : undefined,
    }
  })
}
