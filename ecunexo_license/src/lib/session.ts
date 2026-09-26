const ACCESS = 'ecunexo.platform.accessToken'
const OPERATOR = 'ecunexo.platform.operatorId'
const EXPIRES = 'ecunexo.platform.expiresAt'
const ROLE = 'ecunexo.platform.operatorRole'
const EMAIL = 'ecunexo.platform.operatorEmail'

const LEGACY_ACCESS = 'ecunexo.platform.accessToken'

export function getAccessToken(): string | null {
  return (
    sessionStorage.getItem(ACCESS) ??
    localStorage.getItem(ACCESS) ??
    localStorage.getItem(LEGACY_ACCESS)
  )
}

export function getOperatorId(): string | null {
  return sessionStorage.getItem(OPERATOR) ?? localStorage.getItem(OPERATOR)
}

export function getExpiresAt(): string | null {
  return sessionStorage.getItem(EXPIRES) ?? localStorage.getItem(EXPIRES)
}

export function getOperatorRole(): string | null {
  return sessionStorage.getItem(ROLE) ?? localStorage.getItem(ROLE)
}

export function getOperatorEmail(): string | null {
  return sessionStorage.getItem(EMAIL) ?? localStorage.getItem(EMAIL)
}

export function setSession(
  accessToken: string,
  operatorId: string,
  expiresAt: string,
  role: string,
  email: string
): void {
  sessionStorage.setItem(ACCESS, accessToken)
  sessionStorage.setItem(OPERATOR, operatorId)
  sessionStorage.setItem(EXPIRES, expiresAt)
  sessionStorage.setItem(ROLE, role)
  sessionStorage.setItem(EMAIL, email)
  localStorage.removeItem(LEGACY_ACCESS)
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(OPERATOR)
  localStorage.removeItem(EXPIRES)
  localStorage.removeItem(ROLE)
  localStorage.removeItem(EMAIL)
}

export function clearSession(): void {
  sessionStorage.removeItem(ACCESS)
  sessionStorage.removeItem(OPERATOR)
  sessionStorage.removeItem(EXPIRES)
  sessionStorage.removeItem(ROLE)
  sessionStorage.removeItem(EMAIL)
  localStorage.removeItem(LEGACY_ACCESS)
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(OPERATOR)
  localStorage.removeItem(EXPIRES)
  localStorage.removeItem(ROLE)
  localStorage.removeItem(EMAIL)
}
