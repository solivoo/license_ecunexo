import type { IssueLicenseResult } from '@/lib/platformLicensingApi'

export const LICENSE_FILE_EXTENSION = '.ecunexo-license'

interface SignedLicenseArtifactEnvelope {
  version: number
  payloadBase64Url: string
  signatureBase64Url: string
}

export interface EcuNexoLicenseFile {
  format: 'ecunexo-license'
  formatVersion: 1
  issuedAt: string
  planLabel: string
  enabledModules: string[]
  artifact: SignedLicenseArtifactEnvelope
}

function coerceArtifactEnvelope(raw: unknown): SignedLicenseArtifactEnvelope {
  let value = raw
  if (typeof value === 'string') {
    value = JSON.parse(value) as unknown
  }
  if (!value || typeof value !== 'object') {
    throw new Error('Artefacto de licencia inválido.')
  }
  const o = value as Record<string, unknown>
  const version = o.version ?? o.Version
  const payloadBase64Url = o.payloadBase64Url ?? o.PayloadBase64Url
  const signatureBase64Url = o.signatureBase64Url ?? o.SignatureBase64Url
  if (
    typeof version !== 'number' ||
    typeof payloadBase64Url !== 'string' ||
    payloadBase64Url.length === 0 ||
    typeof signatureBase64Url !== 'string' ||
    signatureBase64Url.length === 0
  ) {
    throw new Error('Artefacto de licencia inválido.')
  }
  return {
    version,
    payloadBase64Url,
    signatureBase64Url,
  }
}

function parseArtifactEnvelope(licenseArtifact: string | SignedLicenseArtifactEnvelope): SignedLicenseArtifactEnvelope {
  return coerceArtifactEnvelope(licenseArtifact)
}

export function buildLicenseFileDocument(
  issued: IssueLicenseResult,
  enabledModules: string[]
): EcuNexoLicenseFile {
  return {
    format: 'ecunexo-license',
    formatVersion: 1,
    issuedAt: new Date().toISOString(),
    planLabel: issued.planLabel,
    enabledModules,
    artifact: parseArtifactEnvelope(issued.licenseArtifact),
  }
}

export function buildLicenseFileContent(
  issued: IssueLicenseResult,
  enabledModules: string[]
): string {
  return `${JSON.stringify(buildLicenseFileDocument(issued, enabledModules), null, 2)}\n`
}

export function suggestLicenseFileName(planLabel: string): string {
  const slug = planLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const base = slug.length > 0 ? slug : 'licencia'
  return `ecunexo-${base}${LICENSE_FILE_EXTENSION}`
}

export function createLicenseFileDownload(content: string, fileName: string): { url: string; fileName: string } {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  return {
    url: URL.createObjectURL(blob),
    fileName,
  }
}

export function downloadLicenseFile(content: string, fileName: string): void {
  const { url } = createLicenseFileDownload(content, fileName)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
