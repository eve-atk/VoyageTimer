import type { AppData } from '../types'

export interface SaveResult {
  ok: boolean
  message: string
}

export async function saveRemoteData(data: AppData): Promise<SaveResult> {
  try {
    const response = await fetch('/api/update-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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