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

const TIER_NAME_TO_VALUE: Record<string, string> = {
  Small: '0',
  Medium: '1',
  Big: '2',
  Enterprise: '3',
}

/** Normaliza el tier al value numérico del dropdown (la API lo serializa como nombre, ej. "Small"). */
function normalizeTierValue(tier: unknown): string {
  if (typeof tier === 'number' && Number.isFinite(tier)) return String(tier)
  const raw = String(tier ?? '').trim()
  if (TIER_NAME_TO_VALUE[raw]) return TIER_NAME_TO_VALUE[raw]
  return /^[0-3]$/.test(raw) ? raw : '0'
}

export function createGrantEntitlementsDraft(
  enabledModuleCodes: readonly string[],
  moduleEntitlements?: readonly ModuleEntitlement[] | null
): GrantEntitlementsDraft {
  const selectedModules = ensureIdentityModule(enabledModuleCodes)
  const tiers: Record<string, string> = {}
  const limits: Record<string, Record<string, string>> = {}
  for (const entitlement of moduleEntitlements ?? []) {
    tiers[entitlement.moduleCode] = normalizeTierValue(entitlement.tier)
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
    const tier = Number(normalizeTierValue(tiers[code] ?? '0'))
    return {
      moduleCode: code,
      tier: Number.isFinite(tier) ? tier : 0,
      limits: Object.keys(moduleLimits).length > 0 ? moduleLimits : undefined,
    }
  })
}
