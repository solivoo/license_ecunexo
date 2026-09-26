import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  APP_PREFERENCES_EVENT,
  pageSizeOptionsFor,
  readAppPreferences,
  writeAppPreferences,
  type AppPreferences,
} from '@/lib/appPreferences'

type AppPreferencesContextValue = {
  readonly prefs: AppPreferences
  readonly pageSizeOptions: number[]
  readonly canUpdate: boolean
  readonly persistError: string | null
  readonly patch: (next: Partial<AppPreferences>) => void
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

export function AppPreferencesProvider({ children }: { readonly children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => readAppPreferences())

  useEffect(() => {
    const sync = () => setPrefs(readAppPreferences())
    window.addEventListener(APP_PREFERENCES_EVENT, sync)
    return () => window.removeEventListener(APP_PREFERENCES_EVENT, sync)
  }, [])

  const patch = useCallback((next: Partial<AppPreferences>) => {
    setPrefs(writeAppPreferences(next))
  }, [])

  const value = useMemo(
    (): AppPreferencesContextValue => ({
      prefs,
      pageSizeOptions: pageSizeOptionsFor(prefs.maxRecords),
      canUpdate: true,
      persistError: null,
      patch,
    }),
    [prefs, patch],
  )

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext)
  if (!ctx) {
    throw new Error('useAppPreferences requiere AppPreferencesProvider')
  }
  return ctx
}
