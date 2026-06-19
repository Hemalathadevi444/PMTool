import { MsalProvider } from '@azure/msal-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { msalInstance } from './auth/msalInstance'
import { ThemeProvider } from './context/ThemeContext'

msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MsalProvider>
    </StrictMode>,
  )
})
