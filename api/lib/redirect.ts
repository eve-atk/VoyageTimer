type RequestLike = {
  headers?: Record<string, string | string[] | undefined>
  url?: string
}

function normalizeAllowedOrigin(value: string): string {
  const unquoted = value.trim().replace(/^['\"]|['\"]$/g, '')

  try {
    return new URL(unquoted).origin
  } catch {
    return unquoted
  }
}

export function getAllowedFrontendOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => normalizeAllowedOrigin(item))
    .filter((item) => item.length > 0)
}

export function normalizeRedirectUrl(value: string): URL | null {
  try {
    const parsed = new URL(value)
    const allowedOrigins = getAllowedFrontendOrigins()

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(parsed.origin)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function getRedirectUrlFromRequest(req: RequestLike): URL | null {
  const requestUrl = new URL(req.url ?? '/', 'https://placeholder.local')
  const redirect = requestUrl.searchParams.get('redirect')

  if (!redirect) {
    return null
  }

  return normalizeRedirectUrl(redirect)
}

export function getLogoutRedirectUrl(req: RequestLike): string {
  const requestedRedirect = getRedirectUrlFromRequest(req)
  if (requestedRedirect) {
    return requestedRedirect.toString()
  }

  const referer = req.headers?.referer
  const refererUrl = Array.isArray(referer) ? referer[0] : referer
  if (refererUrl) {
    const parsedReferer = normalizeRedirectUrl(refererUrl)
    if (parsedReferer) {
      return parsedReferer.toString()
    }
  }

  return '/'
}