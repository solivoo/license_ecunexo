import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ensureIdentityModule,
  getModuleDefaultLimits,
} from '@/constants/tenantModules'
import { toModuleEntitlements } from '@/lib/grantEntitlements'
import { listPlans, type PlanListItem, type LicensingCustomerListItem } from '@/lib/platformLicensingApi'

function formatCustomerLabel(customer: LicensingCustomerListItem): string {
  return customer.tradeName ? `${customer.legalName} (${customer.tradeName})` : customer.legalName
}

export function useIssueLicenseForm() {
  const [plans, setPlans] = useState<PlanListItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [planCode, setPlanCode] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerLabel, setCustomerLabel] = useState('')
  const [customerDeploymentMode, setCustomerDeploymentMode] = useState<string>('CloudShared')
  const [validityDays, setValidityDays] = useState(365)
  const [maxTenants, setMaxTenants] = useState(1)
  const [maxUsers, setMaxUsers] = useState(5)
  const [maxWarehouses, setMaxWarehouses] = useState(1)
  const [selectedModules, setSelectedModules] = useState<string[]>(['identity'])
  /** Límites editables por módulo (`{ [moduleCode]: { limitKey: "stringValue" } }`). */
  const [editLimits, setEditLimits] = useState<Record<string, Record<string, string>>>({})

  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('')
  const [ownerDepartment, setOwnerDepartment] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerJobTitle, setOwnerJobTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [onlineValidationIntervalDays, setOnlineValidationIntervalDays] = useState(30)

  /** Período personalizado de capacitación. */
  const [trainingPeriodFrom, setTrainingPeriodFrom] = useState('')
  const [trainingPeriodTo, setTrainingPeriodTo] = useState('')
  /** Período personalizado de soporte. */
  const [supportPeriodFrom, setSupportPeriodFrom] = useState('')
  const [supportPeriodTo, setSupportPeriodTo] = useState('')
  const selectedPlan = useMemo(
    () => plans.find((p) => p.code === planCode) ?? null,
    [plans, planCode]
  )

  const applyPlanDefaults = useCallback((plan: PlanListItem) => {
    setMaxTenants(plan.maxTenantsDefault)
    setMaxUsers(plan.maxUsersDefault)
    setMaxWarehouses(plan.maxWarehousesDefault)
    const activeMods = ensureIdentityModule(plan.enabledModuleCodesDefault)
    setSelectedModules(activeMods)

    const tl: Record<string, Record<string, string>> = {}
    for (const code of activeMods) {
      const defaults = getModuleDefaultLimits(code)
      if (defaults) {
        tl[code] = Object.fromEntries(
          Object.entries(defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
        )
      }
    }
    if (plan.moduleEntitlementsDefault && plan.moduleEntitlementsDefault.length > 0) {
      for (const e of plan.moduleEntitlementsDefault) {
        const defaults = getModuleDefaultLimits(e.moduleCode) ?? {}
        tl[e.moduleCode] = Object.fromEntries(
          Object.entries(e.limits ?? defaults).map(([k, v]) => [k, String(v === -1 ? '' : v)])
        )
      }
    }
    if (tl['identity'] && plan.maxUsersDefault > 0) {
      tl['identity'].max_users = String(plan.maxUsersDefault)
    }
    if (tl['warehousing'] && plan.maxWarehousesDefault > 0) {
      tl['warehousing'].max_warehouses = String(plan.maxWarehousesDefault)
    }
    setEditLimits(tl)
  }, [])

  const updateSelectedModules = useCallback((codes: string[]) => {
    const normalized = ensureIdentityModule(codes)
    setSelectedModules(normalized)
    // Agregar defaults para módulos nuevos sin límites definidos aún
    setEditLimits((prev) => {
      const next = { ...prev }
      for (const code of normalized) {
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
        if (!normalized.includes(key)) delete next[key]
      }
      return next
    })
  }, [])

  /** Cambia un límite individual de un módulo y sincroniza cupos globales si aplica. */
  const setLimit = useCallback((moduleCode: string, limitKey: string, value: string) => {
    setEditLimits((prev) => ({
      ...prev,
      [moduleCode]: { ...prev[moduleCode], [limitKey]: value },
    }))
    if (moduleCode === 'identity' && limitKey === 'max_users') {
      const n = Number(value)
      if (n > 0) setMaxUsers(n)
    }
    if (moduleCode === 'warehousing' && limitKey === 'max_warehouses') {
      const n = Number(value)
      if (n > 0) setMaxWarehouses(n)
    }
  }, [])

  useEffect(() => {
    void listPlans()
      .then((raw) => {
        setLoadError(null)
        const p = raw.map((plan) => ({
          ...plan,
          maxTenantsDefault: plan.maxTenantsDefault ?? 1,
          maxUsersDefault: plan.maxUsersDefault ?? 5,
          maxWarehousesDefault: plan.maxWarehousesDefault ?? 1,
          enabledModuleCodesDefault:
            plan.enabledModuleCodesDefault?.length > 0
              ? plan.enabledModuleCodesDefault
              : ['identity'],
        }))
        setPlans(p)
        if (p.length > 0) {
          setPlanCode(p[0].code)
          applyPlanDefaults(p[0])
        }
      })
      .catch(() => setLoadError('No se pudo cargar planes. ¿API en 5090 y login?'))
  }, [applyPlanDefaults])

  const onCustomerSelect = useCallback((customer: LicensingCustomerListItem) => {
    setCustomerId(customer.id)
    setCustomerLabel(formatCustomerLabel(customer))
    setCustomerDeploymentMode(customer.deploymentMode ?? 'CloudShared')
  }, [])

  const onPlanChange = useCallback(
    (code: string) => {
      setPlanCode(code)
      const plan = plans.find((p) => p.code === code)
      if (plan) {
        applyPlanDefaults(plan)
      }
    },
    [plans, applyPlanDefaults]
  )

  const buildIssuePayload = useCallback(() => {
    const email = ownerEmail.trim()
    const name = ownerName.trim()
    if (!customerId) {
      throw new Error('Selecciona el cliente comercial (solicitado por).')
    }
    if (!email) {
      throw new Error('Indica el correo del titular.')
    }
    if (!name) {
      throw new Error('Indica el nombre del titular.')
    }
    if (ownerPassword.length < 8) {
      throw new Error('La contraseña inicial debe tener al menos 8 caracteres.')
    }
    if (ownerPassword !== ownerPasswordConfirm) {
      throw new Error('La contraseña y su confirmación no coinciden.')
    }

    const modules = ensureIdentityModule(selectedModules)
    const moduleEntitlementsOverride = toModuleEntitlements(modules, {}, editLimits)
    const resolvedMaxUsers = Number(editLimits['identity']?.max_users) || maxUsers
    const resolvedMaxWarehouses = modules.includes('warehousing')
      ? Number(editLimits['warehousing']?.max_warehouses) || maxWarehouses || 1
      : 0

    const toUtcIso = (dateOnly: string): string | undefined => {
      const t = dateOnly.trim()
      if (!t) return undefined
      return new Date(`${t}T00:00:00.000Z`).toISOString()
    }

    const deploymentModeNum =
      customerDeploymentMode === 'CustomerHosted'
        ? 1
        : customerDeploymentMode === 'HybridEdge'
          ? 2
          : 0

    return {
      customerId,
      planCode,
      deploymentMode: deploymentModeNum,
      provisioning: {
        ownerEmail: email,
        ownerName: name,
        ownerPassword,
        ownerDepartment: ownerDepartment.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
        ownerJobTitle: ownerJobTitle.trim() || undefined,
      },
      validityDays,
      maxTenantsOverride: Math.max(1, maxTenants),
      maxUsersOverride: Math.max(1, resolvedMaxUsers),
      maxWarehousesOverride: modules.includes('warehousing') ? Math.max(1, resolvedMaxWarehouses) : 0,
      enabledModuleCodesOverride: modules,
      moduleEntitlementsOverride,
      onlineValidationIntervalDays,
      notes: notes.trim() || undefined,
      trainingPeriodFromUtc: toUtcIso(trainingPeriodFrom),
      trainingPeriodToUtc: toUtcIso(trainingPeriodTo),
      supportPeriodFromUtc: toUtcIso(supportPeriodFrom),
      supportPeriodToUtc: toUtcIso(supportPeriodTo),
    }
  }, [
    customerDeploymentMode,
    customerId,
    editLimits,
    maxTenants,
    maxUsers,
    maxWarehouses,
    notes,
    onlineValidationIntervalDays,
    ownerDepartment,
    ownerEmail,
    ownerJobTitle,
    ownerName,
    ownerPassword,
    ownerPasswordConfirm,
    ownerPhone,
    planCode,
    selectedModules,
    supportPeriodFrom,
    supportPeriodTo,
    trainingPeriodFrom,
    trainingPeriodTo,
    validityDays,
  ])

  const resetIssuance = useCallback(() => {
    setCustomerId('')
    setCustomerLabel('')
    setCustomerDeploymentMode('CloudShared')
    setOwnerEmail('')
    setOwnerName('')
    setOwnerPassword('')
    setOwnerPasswordConfirm('')
    setOwnerDepartment('')
    setOwnerPhone('')
    setOwnerJobTitle('')
    setNotes('')
    setValidityDays(365)
    setOnlineValidationIntervalDays(30)
    setTrainingPeriodFrom('')
    setTrainingPeriodTo('')
    setSupportPeriodFrom('')
    setSupportPeriodTo('')
    const first = plans[0]
    if (first) {
      setPlanCode(first.code)
      applyPlanDefaults(first)
    }
  }, [applyPlanDefaults, plans])

  const plansReady = plans.length > 0 && planCode.length > 0

  return {
    plans,
    plansReady,
    loadError,
    planCode,
    onPlanChange,
    selectedPlan,
    customerId,
    customerLabel,
    customerDeploymentMode,
    onCustomerSelect,
    validityDays,
    setValidityDays,
    maxTenants,
    setMaxTenants,
    maxUsers,
    setMaxUsers,
    maxWarehouses,
    setMaxWarehouses,
    selectedModules,
    setSelectedModules: updateSelectedModules,
    editLimits,
    setLimit,
    ownerEmail,
    setOwnerEmail,
    ownerName,
    setOwnerName,
    ownerPassword,
    setOwnerPassword,
    ownerPasswordConfirm,
    setOwnerPasswordConfirm,
    ownerDepartment,
    setOwnerDepartment,
    ownerPhone,
    setOwnerPhone,
    ownerJobTitle,
    setOwnerJobTitle,
    notes,
    setNotes,
    onlineValidationIntervalDays,
    setOnlineValidationIntervalDays,
    trainingPeriodFrom,
    setTrainingPeriodFrom,
    trainingPeriodTo,
    setTrainingPeriodTo,
    supportPeriodFrom,
    setSupportPeriodFrom,
    supportPeriodTo,
    setSupportPeriodTo,
    buildIssuePayload,
    resetIssuance,
  }
}
