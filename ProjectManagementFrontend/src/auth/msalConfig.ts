import type { Configuration, PopupRequest } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID ?? ''
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID ?? 'organizations'

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email'],
  domainHint: 'aighospitals.com',
}

export const isMicrosoftLoginConfigured = Boolean(clientId)
