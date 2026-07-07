const TOKEN_KEY = 'ff14-submarine-manager-auth-token'
const USER_KEY = 'ff14-submarine-manager-auth-user'

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_UPDATE_API_BASE_URL as string | undefined
  if (!baseUrl) {
    return ''
  }

  return baseUrl.replace(/\/$/, '')
}

export function getAuthStartUrl(): string {
  const baseUrl = getApiBaseUrl()
  const redirectUrl = window.location.origin + window.location.pathname + window.location.search
  const query = new URLSearchParams({ redirect: redirectUrl })
  return `${baseUrl}/api/auth-start?${query.toString()}`
}

export function getLogoutUrl(): string {
  const baseUrl = getApiBaseUrl()
  return baseUrl ? `${baseUrl}/api/logout` : '/api/logout'
}

export async function fetchAuthSession(): Promise<{ user?: string; isAuthenticated: boolean }> {
  const baseUrl = getApiBaseUrl()
  const url = baseUrl ? `${baseUrl}/api/session` : '/api/session'

  try {
    const response = await fetch(url, {
      credentials: 'include',
    })

    if (!response.ok) {
      return { isAuthenticated: false }
    }

    return await response.json()
  } catch {
    return { isAuthenticated: false }
  }
}

export function clearAuthSession(): void {
  // クッキーをクリアするため、ログアウト時にサーバー側と連携することが推奨される
  // ここではフロントエンド側のUI状態をクリアするのみ
}
