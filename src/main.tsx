import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from './hooks/useAuth'
import { persistOptions, queryClient } from './lib/queryClient'
import App from './App'
import './index.css'

// Reload into a new deploy as soon as its service worker takes over,
// instead of showing the cached old version until the next visit.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
