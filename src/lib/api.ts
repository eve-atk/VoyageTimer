import type { AppData } from '../types'
import { getStoredAuthToken } from './auth'

export interface SaveResult {
  ok: boolean
  message: string
  authError?: boolean
}

function getUpdateApiUrl(): string {
  const baseUrl = import.meta.env.VITE_UPDATE_API_BASE_URL as string | undefined
  if (!baseUrl) {
    return '/api/update-data'
  }

  return `${baseUrl.replace(/\/$/, '')}/api/update-data`
}

export async function saveRemoteData(data: AppData): Promise<SaveResult> {
  const authToken = getStoredAuthToken()

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const response = await fetch(getUpdateApiUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (response.status === 401) {
        return {
          ok: false,
          authError: true,
          message: payload?.message ?? '認証トークンの有効期限が切れています。再度ログインしてください。',
        }
      }

      return {
        ok: false,
        message: payload?.message ?? 'GitHub への保存に失敗しました。',
      }
    }

    return {
      ok: true,
      message: 'GitHub へ保存しました。',
    }
  } catch {
    return {
      ok: false,
      message: '更新APIに接続できませんでした。Vercel 側の設定を確認してください。',
    }
  }
}