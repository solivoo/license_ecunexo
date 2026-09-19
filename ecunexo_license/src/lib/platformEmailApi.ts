import { platformApi } from '@/lib/api'

export type PlatformEmailSettingsDto = {
  host: string
  port: number
  useSsl: boolean
  userName: string
  hasPassword: boolean
  senderEmail: string
  senderName: string
  isConfigured: boolean
  source: 'Database' | 'Environment' | 'None'
}

export type UpdatePlatformEmailSettingsPayload = {
  host: string
  port: number
  useSsl: boolean
  userName: string
  password?: string
  senderEmail: string
  senderName: string
}

export type TestPlatformEmailPayload = {
  targetEmail: string
  subject?: string
}

export type SendLicenseDeliveryEmailPayload = {
  grantId: string
  recipientEmail?: string
  activationCodePlaintext?: string
  licenseArtifact?: string
}

export type SendTrainingInviteEmailPayload = {
  sessionId: string
  recipientEmails?: string[]
}

export async function getPlatformEmailSettings(): Promise<PlatformEmailSettingsDto> {
  const res = await platformApi.get<PlatformEmailSettingsDto>('/api/v1/platform/settings/email')
  return res.data
}

export async function updatePlatformEmailSettings(
  payload: UpdatePlatformEmailSettingsPayload
): Promise<PlatformEmailSettingsDto> {
  const res = await platformApi.put<PlatformEmailSettingsDto>(
    '/api/v1/platform/settings/email',
    payload
  )
  return res.data
}

export async function testPlatformEmailSettings(
  payload: TestPlatformEmailPayload
): Promise<{ message: string }> {
  const res = await platformApi.post<{ message: string }>(
    '/api/v1/platform/settings/email/test',
    payload
  )
  return res.data
}

export async function sendLicenseDeliveryEmail(
  payload: SendLicenseDeliveryEmailPayload
): Promise<{ message: string }> {
  const res = await platformApi.post<{ message: string }>(
    `/api/v1/platform/licenses/${payload.grantId}/send-email`,
    payload
  )
  return res.data
}

export async function sendTrainingInviteEmail(
  payload: SendTrainingInviteEmailPayload
): Promise<{ message: string }> {
  const res = await platformApi.post<{ message: string }>(
    `/api/v1/platform/training/${payload.sessionId}/send-invite`,
    payload
  )
  return res.data
}
