import { verifyToken } from './lib/auth.js'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type SessionResponse = {
  user?: string
  isAuthenticated: boolean
}

function send(res: ResponseLike, statusCode: number, body: SessionResponse): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
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

export default function handler(req: RequestLike, res: ResponseLike): void {
  const tokenSecret = process.env.AUTH_JWT_SECRET
  if (!tokenSecret) {
    send(res, 503, { isAuthenticated: false })
    return
  }

  const rawCookies = req.headers?.cookie
  const cookies = Array.isArray(rawCookies) ? rawCookies[0] : rawCookies
  const authToken = getCookieValue(cookies, 'auth_token')

  if (!authToken) {
    send(res, 200, { isAuthenticated: false })
    return
  }

  const authPayload = verifyToken(authToken, tokenSecret)
  if (!authPayload || authPayload.typ !== 'access') {
    send(res, 200, { isAuthenticated: false })
    return
  }

  const user = authPayload.login
  if (typeof user !== 'string') {
    send(res, 200, { isAuthenticated: false })
    return
  }

  send(res, 200, { isAuthenticated: true, user })
}
