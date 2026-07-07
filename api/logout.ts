type RequestLike = {
  headers?: Record<string, string | string[] | undefined>
  url?: string
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

import { getLogoutRedirectUrl } from './lib/redirect.js'

export default function handler(req: RequestLike, res: ResponseLike): void {
  const redirectUrl = getLogoutRedirectUrl(req)

  res.statusCode = 302
  res.setHeader('Location', redirectUrl)
  res.setHeader(
    'Set-Cookie',
    'auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  )
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end()
}
