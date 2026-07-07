type RequestLike = {
  headers?: Record<string, string | string[] | undefined>
  url?: string
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

export default function handler(req: RequestLike, res: ResponseLike): void {
  // リファラーからリダイレクト先を取得、またはクエリパラメータから取得
  const referer = req.headers?.referer
  const refererUrl = Array.isArray(referer) ? referer[0] : referer
  const redirectUrl = refererUrl ? new URL(refererUrl).origin + '/' : '/'

  res.statusCode = 302
  res.setHeader('Location', redirectUrl)
  res.setHeader(
    'Set-Cookie',
    'auth_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  )
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end()
}
