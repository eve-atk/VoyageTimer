import type { AppData } from '../types'
import { getStoredAuthToken } from './auth'

export interface SaveResult {
  ok: boolean
  message: string
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

  if (!authToken) {
    return {
      ok: false,
      message: 'GitHub へ保存するには先にログインしてください。',
    }
  }

  try {
    const response = await fetch(getUpdateApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
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