import { platformApi } from './api'

/**
 * Normaliza respuestas de listado para DataGrid (`dataSource: T[]`).
 * Acepta array plano o envoltorio `{ items: T[] }` / `{ Items: T[] }`.
 */
function asRowList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }
  if (payload != null && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const items = record.items ?? record.Items
    if (Array.isArray(items)) {
      return items as T[]
    }
  }
  return []
}

export interface PlatformLoginResult {
  accessToken: string
  expiresAt: string
  operatorId: string
  role: string
}

export interface OperatorListItem {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface CreateOperatorInput {
  email: string
  name: string
  password: string
  role: number
}

export interface LicenseProvisioningInput {
  ownerEmail: string
  ownerName: string
  ownerPassword: string
  ownerDepartment?: string
  ownerPhone?: string
  ownerJobTitle?: string
}

export interface IssueLicenseInput {
  customerId: string
  planCode: string
  deploymentMode: number
  provisioning: LicenseProvisioningInput
  validityDays?: number
  maxTenantsOverride?: number
  maxUsersOverride?: number
  maxWarehousesOverride?: number
  enabledModuleCodesOverride?: string[]
  moduleEntitlementsOverride?: ModuleEntitlement[]
  onlineValidationIntervalDays?: number
  notes?: string
  trainingPeriodFromUtc?: string
  trainingPeriodToUtc?: string
  supportPeriodFromUtc?: string
  supportPeriodToUtc?: string
  /** Si el cliente ya tiene licencia vigente, confirma que se emite una adicional. */
  allowAdditionalLicense?: boolean
}

export interface ModuleEntitlement {
  moduleCode: string
  tier: number  // ModuleTier enum: 0=Small, 1=Medium, 2=Big, 3=Enterprise
  limits?: Record<string, number>
}

export interface ReissueLicenseResult {
  licenseId: string
  supersedesGrantId: string
  activationCodePlaintext: string
  licenseArtifact: string
  expiresAtUtc: string
  provisioningSlotsRemaining: number
  planLabel: string
  onlineValidationIntervalDays: number
  generation: number
  reissueKind: 'Renew' | 'Expand' | string
  previousPlanLabel: string | null
}

export interface IssueLicenseResult {
  licenseId: string
  activationCodePlaintext: string
  licenseArtifact: string
  expiresAtUtc: string
  provisioningSlotsRemaining: number
  planLabel: string
  supersedesGrantId?: string | null
  generation?: number
  reissueKind?: string | null
  previousPlanLabel?: string | null
}

export interface LicenseListItem {
  id: string
  customerId: string
  customerLegalName: string
  customerTradeName: string | null
  ownerEmail: string | null
  planCode: string
  planLabel: string
  status: string
  issuedAtUtc: string
  expiresAtUtc: string
  provisioningSlotsRemaining: number
  maxTenants: number
  issuedByOperatorName: string
  supersedesGrantId?: string | null
  onlineValidationIntervalDays?: number
  generation?: number
  reissueKind?: string | null
  previousPlanCode?: string | null
  previousPlanLabel?: string | null
}

export interface LicensingCustomerListItem {
  id: string
  legalName: string
  tradeName: string | null
  taxId: string | null
  contactEmail: string | null
  status: string
  licensesIssued: number
  activeLicenses: number
  lastLicenseIssuedAtUtc: string | null
}

export interface PlanListItem {
  code: string
  displayName: string
  description?: string | null
  maxTenantsDefault: number
  maxUsersDefault: number
  maxWarehousesDefault: number
  enabledModuleCodesDefault: string[]
  moduleEntitlementsDefault?: ModuleEntitlement[] | null
  suggestedPriceUsdMonthly?: number | null
  sortOrder?: number
  isActive: boolean
  updatedAt?: string | null
}

export interface PlanDetail {
  code: string
  displayName: string
  description?: string | null
  maxTenantsDefault: number
  maxUsersDefault: number
  maxWarehousesDefault: number
  enabledModuleCodesDefault: string[]
  moduleEntitlementsDefault?: ModuleEntitlement[] | null
  suggestedPriceUsdMonthly?: number | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export interface CreatePlanInput {
  code: string
  displayName: string
  maxTenantsDefault: number
  maxUsersDefault: number
  maxWarehousesDefault: number
  enabledModuleCodesDefault: string[]
  moduleEntitlementsDefault?: ModuleEntitlement[] | null
  sortOrder?: number
  suggestedPriceUsdMonthly?: number
  description?: string
}

export interface UpdatePlanInput {
  displayName?: string
  description?: string | null
  maxTenantsDefault?: number
  maxUsersDefault?: number
  maxWarehousesDefault?: number
  enabledModuleCodesDefault?: string[]
  moduleEntitlementsDefault?: ModuleEntitlement[] | null
  suggestedPriceUsdMonthly?: number | null
  sortOrder?: number
}

export async function platformLogin(
  email: string,
  password: string
): Promise<PlatformLoginResult> {
  const { data } = await platformApi.post<PlatformLoginResult>(
    '/api/v1/platform/auth/login',
    { email, password }
  )
  return data
}

export async function listPlans(includeInactive = false): Promise<PlanListItem[]> {
  const params = includeInactive ? '?includeInactive=true' : ''
  const { data } = await platformApi.get<unknown>(`/api/v1/platform/plans${params}`)
  return asRowList<PlanListItem>(data)
}

export async function getPlanDetail(code: string): Promise<PlanDetail> {
  const { data } = await platformApi.get<PlanDetail>(`/api/v1/platform/plans/${encodeURIComponent(code)}`)
  return data
}

export async function createPlan(body: CreatePlanInput): Promise<PlanListItem> {
  const { data } = await platformApi.post<PlanListItem>('/api/v1/platform/plans', body)
  return data
}

export async function updatePlan(code: string, body: UpdatePlanInput): Promise<PlanListItem> {
  const { data } = await platformApi.put<PlanListItem>(`/api/v1/platform/plans/${encodeURIComponent(code)}`, body)
  return data
}

export async function deactivatePlan(code: string): Promise<{ code: string; isActive: boolean }> {
  const { data } = await platformApi.delete<{ code: string; isActive: boolean }>(`/api/v1/platform/plans/${encodeURIComponent(code)}`)
  return data
}

export async function issueLicense(body: IssueLicenseInput): Promise<IssueLicenseResult> {
  const { data } = await platformApi.post<IssueLicenseResult>('/api/v1/platform/licenses', body)
  return data
}

export async function listLicenses(): Promise<LicenseListItem[]> {
  const { data } = await platformApi.get<unknown>('/api/v1/platform/licenses')
  return asRowList<LicenseListItem>(data)
}

export async function reissueLicense(
  grantId: string,
  body: {
    validityDays?: number
    onlineValidationIntervalDays?: number
    planCode?: string
  } = {}
): Promise<ReissueLicenseResult> {
  const { data } = await platformApi.post<ReissueLicenseResult>(
    `/api/v1/platform/licenses/${grantId}/reissue`,
    body
  )
  return data
}

export interface GrantEntitlements {
  grantId: string
  entitlementsVersion: number
  deploymentMode: string
  status: string
  enabledModuleCodes: string[]
  moduleEntitlements?: ModuleEntitlement[] | null
  updatedAtUtc?: string | null
  appliedToTenant: boolean
}

export async function getGrantEntitlements(grantId: string): Promise<GrantEntitlements> {
  const { data } = await platformApi.get<GrantEntitlements>(
    `/api/v1/platform/licenses/${grantId}/entitlements`
  )
  return data
}

export async function updateGrantEntitlements(
  grantId: string,
  body: {
    enabledModuleCodes: string[]
    moduleEntitlements?: ModuleEntitlement[] | null
    reason?: string | null
  }
): Promise<GrantEntitlements> {
  const { data } = await platformApi.put<GrantEntitlements>(
    `/api/v1/platform/licenses/${grantId}/entitlements`,
    body
  )
  return data
}

export async function listLicensingCustomers(): Promise<LicensingCustomerListItem[]> {
  const { data } = await platformApi.get<unknown>('/api/v1/platform/customers')
  return asRowList<LicensingCustomerListItem>(data)
}

export interface CreateCustomerInput {
  legalName: string
  deploymentMode?: number
  countryCode?: string
  tradeName?: string
  taxId?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
}

export interface CreateCustomerResult {
  id: string
  legalName: string
  tradeName: string | null
  taxId: string | null
  contactEmail: string | null
  countryCode: string
  deploymentMode: string
  status: string
}

export interface CustomerDetail extends CreateCustomerResult {
  contactName: string | null
  contactPhone: string | null
  notes: string | null
}

export async function createLicensingCustomer(
  body: CreateCustomerInput
): Promise<CreateCustomerResult> {
  const { data } = await platformApi.post<CreateCustomerResult>(
    '/api/v1/platform/customers',
    body
  )
  return data
}

export async function getLicensingCustomer(id: string): Promise<CustomerDetail> {
  const { data } = await platformApi.get<CustomerDetail>(`/api/v1/platform/customers/${id}`)
  return data
}

export async function updateLicensingCustomer(
  id: string,
  body: CreateCustomerInput
): Promise<CustomerDetail> {
  const { data } = await platformApi.put<CustomerDetail>(
    `/api/v1/platform/customers/${id}`,
    body
  )
  return data
}

export async function deactivateLicensingCustomer(
  id: string
): Promise<{ id: string; status: string; removed: boolean }> {
  const { data } = await platformApi.delete<{ id: string; status: string; removed: boolean }>(
    `/api/v1/platform/customers/${id}`
  )
  return data
}

export async function listOperators(): Promise<OperatorListItem[]> {
  const { data } = await platformApi.get<unknown>('/api/v1/platform/operators')
  return asRowList<OperatorListItem>(data)
}

export async function createOperator(body: CreateOperatorInput): Promise<void> {
  await platformApi.post('/api/v1/platform/operators', body)
}

// ═══════════════════════════════════════════════════════════════
// Training & Support
// ═══════════════════════════════════════════════════════════════

export interface ScheduleTrainingInput {
  customerId: string
  licenseGrantId: string
  topic: string
  kind: string
  modality: string
  durationHours: number
  scheduledAt: string
  attendeeEmails?: string[]
  notes?: string
}

export interface TrainingSessionItem {
  id: string
  customerId: string
  licenseGrantId: string
  topic: string
  kind: string
  modality: string
  durationHours: number
  status: string
  scheduledAt: string
  completedAt?: string | null
  attendeeEmails: string[]
  notes?: string | null
  createdByOperatorId: string
  createdAt: string
}

export interface CalendarInvite {
  icsContent: string
  fileName: string
  topic: string
  scheduledAt: string
  durationHours: number
}

export async function scheduleTraining(body: ScheduleTrainingInput): Promise<TrainingSessionItem> {
  const { data } = await platformApi.post<TrainingSessionItem>('/api/v1/platform/training', body)
  return data
}

export async function listTrainingSessions(params?: {
  customerId?: string
  licenseGrantId?: string
}): Promise<TrainingSessionItem[]> {
  const query = new URLSearchParams()
  if (params?.customerId) query.set('customerId', params.customerId)
  if (params?.licenseGrantId) query.set('licenseGrantId', params.licenseGrantId)
  const qs = query.toString()
  const { data } = await platformApi.get<unknown>(
    `/api/v1/platform/training${qs ? `?${qs}` : ''}`,
  )
  return asRowList<TrainingSessionItem>(data)
}

export async function completeTraining(id: string): Promise<{ id: string; status: string }> {
  const { data } = await platformApi.post<{ id: string; status: string }>(`/api/v1/platform/training/${id}/complete`)
  return data
}

export async function cancelTraining(id: string): Promise<{ id: string; status: string }> {
  const { data } = await platformApi.post<{ id: string; status: string }>(`/api/v1/platform/training/${id}/cancel`)
  return data
}

export async function getTrainingCalendarInvite(id: string): Promise<CalendarInvite> {
  const { data } = await platformApi.get<CalendarInvite>(`/api/v1/platform/training/${id}/calendar`)
  return data
}
