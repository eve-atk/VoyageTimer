import { createRandomState, createToken } from './lib/auth.js'
import { getRedirectUrlFromRequest } from './lib/redirect.js'

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

export default function handler(req: RequestLike, res: ResponseLike): void {
  const clientId = process.env.GITHUB_CLIENT_ID
  const callbackUrl = process.env.AUTH_REDIRECT_URI
  const tokenSecret = process.env.AUTH_JWT_SECRET

  if (!clientId || !callbackUrl || !tokenSecret) {
    send(res, 503, 'OAuth 環境変数が不足しています。')
    return
  }

  const redirectUrl = getRedirectUrlFromRequest(req)
  if (!redirectUrl) {
    send(res, 400, 'redirect パラメータが必要です。')
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

  res.statusCode = 302
  res.setHeader('Location', authorizeUrl.toString())
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end()
}
