import { createToken, verifyToken } from './lib/auth.js'
import { normalizeRedirectUrl } from './lib/redirect.js'

type RequestLike = {
  url?: string
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type GithubTokenResponse = {
  access_token?: string
  token_type?: string
}

type GithubUser = {
  login?: string
}

function send(res: ResponseLike, statusCode: number, message: string): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end(message)
}

function getAllowedUsers(): string[] {
  return (process.env.ALLOWED_GITHUB_USERS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const callbackUrl = process.env.AUTH_REDIRECT_URI
  const tokenSecret = process.env.AUTH_JWT_SECRET

  if (!clientId || !clientSecret || !callbackUrl || !tokenSecret) {
    send(res, 503, 'OAuth 環境変数が不足しています。')
    return
  }

  const requestUrl = new URL(req.url ?? '/', 'https://placeholder.local')
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  if (!code || !state) {
    send(res, 400, 'code または state が不足しています。')
    return
  }

  const statePayload = verifyToken(state, tokenSecret)
  if (!statePayload || statePayload.typ !== 'oauth_state') {
    send(res, 401, 'state 検証に失敗しました。')
    return
  }

  const redirect = statePayload.redirect
  if (typeof redirect !== 'string') {
    send(res, 400, 'state の redirect が不正です。')
    return
  }

  const redirectUrl = normalizeRedirectUrl(redirect)
  if (!redirectUrl) {
    send(res, 403, 'state の redirect が許可されていません。')
    return
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      state,
    }),
  })

  if (!tokenResponse.ok) {
    send(res, 502, 'GitHub トークン交換に失敗しました。')
    return
  }

  const tokenJson = (await tokenResponse.json()) as GithubTokenResponse
  const githubAccessToken = tokenJson.access_token
  if (!githubAccessToken) {
    send(res, 502, 'GitHub アクセストークンを取得できませんでした。')
    return
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!userResponse.ok) {
    send(res, 502, 'GitHub ユーザー情報の取得に失敗しました。')
    return
  }

  const user = (await userResponse.json()) as GithubUser
  const login = user.login
  if (!login) {
    send(res, 502, 'GitHub ユーザーIDの取得に失敗しました。')
    return
  }

  const allowedUsers = getAllowedUsers()
  if (allowedUsers.length > 0 && !allowedUsers.includes(login)) {
    send(res, 403, 'このユーザーは更新権限を持っていません。')
    return
  }

  const appToken = createToken(
    {
      typ: 'access',
      sub: login,
      login,
    },
    tokenSecret,
    60 * 15,
  )

  redirectUrl.hash = `auth_token=${encodeURIComponent(appToken)}&auth_user=${encodeURIComponent(login)}`

  res.statusCode = 302
  res.setHeader('Location', redirectUrl.toString())
  res.setHeader(
    'Set-Cookie',
    `auth_token=${encodeURIComponent(appToken)}; Path=/; Max-Age=${60 * 15}; HttpOnly; Secure; SameSite=Lax`,
  )
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end()
}
