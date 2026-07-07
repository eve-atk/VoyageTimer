type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

import { verifyToken } from './lib/auth.js'

declare const Buffer: {
  from(input: string, encoding?: string): { toString(encoding: string): string }
  concat(chunks: Uint8Array[]): { toString(encoding: string): string }
  isBuffer(value: unknown): boolean
}

type RequestLike = {
  method?: string
  [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array | string>
}

type ResponseLike = {
  statusCode: number
  getHeader?(name: string): string | number | string[] | undefined
  setHeader(name: string, value: string): void
  end(body?: string): void
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true
  }

  if (allowedOrigins.length === 0) {
    return true
  }

  return allowedOrigins.includes(origin)
}

function normalizeAllowedOrigin(value: string): string {
  const unquoted = value.trim().replace(/^['\"]|['\"]$/g, '')

  try {
    return new URL(unquoted).origin
  } catch {
    return unquoted
  }
}

function setCorsHeaders(reqOrigin: string | undefined, res: ResponseLike, allowedOrigins: string[]): boolean {
  if (!isAllowedOrigin(reqOrigin, allowedOrigins)) {
    return false
  }

  if (reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin)
    res.setHeader('Vary', 'Origin')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  return true
}

function getCookieValue(cookies: string | undefined, name: string): string | null {
  if (!cookies) {
    return null
  }

  const cookiePairs = cookies.split(';')
  for (const pair of cookiePairs) {
    const [key, value] = pair.split('=')
    if (key.trim() === name) {
      return decodeURIComponent(value.trim())
    }
  }

  return null
}

function send(res: ResponseLike, statusCode: number, body: Record<string, JsonValue>) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end(JSON.stringify(body))
}

async function readBody(req: RequestLike): Promise<string> {
  const chunks: Uint8Array[] = []

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
  }

  return Buffer.concat(chunks).toString('utf-8')
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  const requestOrigin = (req as { headers?: Record<string, string | string[] | undefined> }).headers?.origin
  const origin = Array.isArray(requestOrigin) ? requestOrigin[0] : requestOrigin
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => normalizeAllowedOrigin(item))
    .filter((item) => item.length > 0)

  if (!setCorsHeaders(origin, res, allowedOrigins)) {
    send(res, 403, { message: 'このオリジンからのアクセスは許可されていません。' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.end()
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, { message: 'POST のみ受け付けます。' })
    return
  }

  const authSecret = process.env.AUTH_JWT_SECRET
  if (!authSecret) {
    send(res, 503, { message: 'AUTH_JWT_SECRET が未設定です。' })
    return
  }

  const cookieHeader = (req as { headers?: Record<string, string | string[] | undefined> }).headers?.cookie
  const cookies = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader
  const authToken = getCookieValue(cookies, 'auth_token')

  if (!authToken) {
    send(res, 401, { message: '認証トークンが必要です。先にログインしてください。' })
    return
  }

  const authPayload = verifyToken(authToken, authSecret)
  if (!authPayload || authPayload.typ !== 'access') {
    send(res, 401, { message: '認証トークンが無効または期限切れです。再ログインしてください。' })
    return
  }

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH ?? 'main'

  if (!token || !owner || !repo) {
    send(res, 503, {
      message: 'Vercel 環境変数が未設定です。GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO を設定してください。',
    })
    return
  }

  const rawBody = await readBody(req)

  let parsed: JsonValue
  try {
    parsed = JSON.parse(rawBody) as JsonValue
  } catch {
    send(res, 400, { message: 'JSON の形式が不正です。' })
    return
  }

  const files = [
    { path: 'data/ship-data.json', content: JSON.stringify((parsed as Record<string, JsonValue>).ships ?? [], null, 2) },
    { path: 'data/voyage-data.json', content: JSON.stringify((parsed as Record<string, JsonValue>).voyages ?? [], null, 2) },
    { path: 'data/part-master.json', content: JSON.stringify((parsed as Record<string, JsonValue>).parts ?? [], null, 2) },
    { path: 'data/route-master.json', content: JSON.stringify((parsed as Record<string, JsonValue>).routes ?? [], null, 2) },
    { path: 'data/rank-bonus.json', content: JSON.stringify((parsed as Record<string, JsonValue>).rankBonus ?? {}, null, 2) },
  ]

  try {
    let updatedCount = 0

    for (const file of files) {
      const metadataResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      let sha: string | undefined
      let currentContent: string | undefined
      if (metadataResponse.ok) {
        const metadata = (await metadataResponse.json()) as { sha?: string; content?: string; encoding?: string }
        sha = metadata.sha

        if (metadata.encoding === 'base64' && typeof metadata.content === 'string') {
          currentContent = Buffer.from(metadata.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        }
      } else if (metadataResponse.status !== 404) {
        const payload = (await metadataResponse.json().catch(() => null)) as { message?: string } | null
        send(res, 502, {
          message: payload?.message ?? `${file.path} の取得に失敗しました。`,
        })
        return
      }

      if (currentContent !== undefined && currentContent === file.content) {
        continue
      }

      const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update ${file.path} from FF14 submarine manager`,
          content: Buffer.from(file.content, 'utf-8').toString('base64'),
          sha,
          branch,
        }),
      })

      if (!updateResponse.ok) {
        const payload = (await updateResponse.json().catch(() => null)) as { message?: string } | null
        send(res, updateResponse.status === 409 ? 409 : 502, {
          message: payload?.message ?? `${file.path} の更新に失敗しました。`,
        })
        return
      }

      updatedCount += 1
    }

    if (updatedCount === 0) {
      send(res, 200, { message: '変更がないため、GitHub への保存は行いませんでした。' })
      return
    }

    send(res, 200, { message: 'GitHub リポジトリへ保存しました。' })
  } catch {
    send(res, 500, { message: 'GitHub API 呼び出し中にエラーが発生しました。' })
  }
}