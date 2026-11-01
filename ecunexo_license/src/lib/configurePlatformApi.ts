import type { Store } from '@reduxjs/toolkit'
import type { InternalAxiosRequestConfig } from 'axios'
import type { RootState } from '@/store'
import { clearCredentials } from '@/store/platformAuthSlice'
import { logger } from './logger'
import { platformApi } from './api'

export function configurePlatformApi(store: Store<RootState>): void {
  platformApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = store.getState().platformAuth.accessToken
    const url = config.url ?? ''
    if (token && !url.includes('/auth/login')) {
      config.headers.Authorization = `Bearer ${token}`
    }
    logger.debug('API req', { method: config.method?.toUpperCase(), url: config.url })
    return config
  })

  platformApi.interceptors.response.use(
    (response) => {
      logger.debug('API res', {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      })
      return response
    },
    (error) => {
      const status = error.response?.status
      const url = error.config?.url ?? '(sin url)'
      const method = error.config?.method?.toUpperCase() ?? '?'
      logger.error('API error', { method, url, status, message: error.message })

      const skipAuthRedirect =
        error.config?.headers?.['X-Skip-Auth-Redirect'] === 'true' ||
        (method === 'GET' && url.includes('/entitlements'))

      if (status === 401 && !skipAuthRedirect) {
        store.dispatch(clearCredentials())
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login')
        }
      }
      return Promise.reject(error)
    }
  )
}
