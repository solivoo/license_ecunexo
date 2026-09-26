import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import 'glubox/style.css'
import 'glubox/themes/index.css'
import './index.css'
import { ToastProvider } from 'glubox'
import { applyDocumentPreferences, readAppPreferences } from '@/lib/appPreferences'
import { configurePlatformApi } from '@/lib/configurePlatformApi'
import { router } from '@/router'
import { store } from '@/store'
import { hydrateFromStorage } from '@/store/platformAuthSlice'
import { AppPreferencesProvider } from '@/features/settings/AppPreferencesProvider'

applyDocumentPreferences(readAppPreferences())

configurePlatformApi(store)
store.dispatch(hydrateFromStorage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AppPreferencesProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AppPreferencesProvider>
    </Provider>
  </StrictMode>
)
