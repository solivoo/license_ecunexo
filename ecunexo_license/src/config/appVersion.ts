export interface AppVersionInfo {
  version: string
  gitCommit: string
  gitBranch: string
  buildTime: string
  repositoryUrl: string
  commitUrl: string
  isProduction: boolean
}

export const APP_VERSION_INFO: AppVersionInfo = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.6.1',
  gitCommit: typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'dev',
  gitBranch: typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'main',
  buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '',
  repositoryUrl: 'https://github.com/solivoo/license_ecunexo',
  commitUrl: `https://github.com/solivoo/license_ecunexo/commit/${typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : ''}`,
  isProduction: import.meta.env.PROD,
}

export function formatBuildDate(isoString: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return isoString
  }
}
