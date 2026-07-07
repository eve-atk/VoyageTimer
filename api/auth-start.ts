import { createRandomState, createToken } from './lib/auth.js'

type RequestLike = {
  url?: string
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

function send(res: ResponseLike, statusCode: number, message: string): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end(message)
}

function normalizeAllowedOrigin(value: string): string {
  const unquoted = value.trim().replace(/^['\"]|['\"]$/g, '')

  try {
    return new URL(unquoted).origin
  } catch {
    return unquoted
  }
}

function getAllowedFrontendOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => normalizeAllowedOrigin(item))
    .filter((item) => item.length > 0)
}

export default function handler(req: RequestLike, res: ResponseLike): void {
  const clientId = process.env.GITHUB_CLIENT_ID
  const callbackUrl = process.env.AUTH_REDIRECT_URI
  const tokenSecret = process.env.AUTH_JWT_SECRET

  if (!clientId || !callbackUrl || !tokenSecret) {
    send(res, 503, 'OAuth 環境変数が不足しています。')
    return
  }

  const requestUrl = new URL(req.url ?? '/', 'https://placeholder.local')
  const redirect = requestUrl.searchParams.get('redirect')
  const debug = requestUrl.searchParams.get('debug') === '1'

  if (!redirect) {
    send(res, 400, 'redirect パラメータが必要です。')
    return
  }

  let redirectUrl: URL
  try {
    redirectUrl = new URL(redirect)
  } catch {
    send(res, 400, 'redirect URL が不正です。')
    return
  }

  const allowedOrigins = getAllowedFrontendOrigins()
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(redirectUrl.origin)) {
    send(
      res,
      403,
      `許可されていない redirect URL です。received=${redirectUrl.origin} allowed=${allowedOrigins.join(',')}`,
    )
    return
  }

  const state = createToken(
    {
      typ: 'oauth_state',
      redirect: redirectUrl.toString(),
      nonce: createRandomState(),
    },
    tokenSecret,
    300,
  )

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl)
  authorizeUrl.searchParams.set('scope', 'read:user')
  authorizeUrl.searchParams.set('state', state)

  if (debug) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.end(
      JSON.stringify(
        {
          clientId,
          callbackUrl,
          authorizeUrl: authorizeUrl.toString(),
          requestedRedirect: redirectUrl.toString(),
          allowedOrigins,
        },
        null,
        2,
      ),
    )
    return
  }

  res.statusCode = 302
  res.setHeader('Location', authorizeUrl.toString())
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end()
}
