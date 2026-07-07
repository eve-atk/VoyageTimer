const TOKEN_KEY = 'ff14-submarine-manager-auth-token'
const USER_KEY = 'ff14-submarine-manager-auth-user'

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_UPDATE_API_BASE_URL as string | undefined
  if (!baseUrl) {
    return ''
  }

  return baseUrl.replace(/\/$/, '')
}

export function getStoredAuthToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredAuthUser(): string | null {
  return window.localStorage.getItem(USER_KEY)
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function getAuthStartUrl(): string {
  const baseUrl = getApiBaseUrl()
  const redirectUrl = window.location.origin + window.location.pathname + window.location.search
  const query = new URLSearchParams({ redirect: redirectUrl })
  return `${baseUrl}/api/auth-start?${query.toString()}`
}

export function consumeAuthCallbackFromHash(): { changed: boolean; user?: string } {
  if (!window.location.hash) {
    return { changed: false }
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const authToken = hashParams.get('auth_token')
  const authUser = hashParams.get('auth_user')

  if (!authToken || !authUser) {
    return { changed: false }
  }

  window.localStorage.setItem(TOKEN_KEY, authToken)
  window.localStorage.setItem(USER_KEY, authUser)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)

  return { changed: true, user: authUser }
}
