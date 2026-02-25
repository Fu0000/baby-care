import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { applyColorMode, getSettings } from './lib/settings.ts'
import { getAuthSession } from './lib/auth.ts'
import { migrateLocalDataIfNeeded } from './lib/migration.ts'

applyColorMode(getSettings().colorMode)

const session = getAuthSession()
if (session?.user.inviteBound) {
  void migrateLocalDataIfNeeded().catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
