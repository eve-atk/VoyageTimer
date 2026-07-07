import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type TokenPayload = {
  [key: string]: JsonValue
  iat: number
  exp: number
  typ: string
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url')
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8')
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url')
}

export function createToken(
  payload: Omit<TokenPayload, 'iat' | 'exp' | 'typ'> & { typ: string },
  secret: string,
  expiresInSeconds: number,
): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body: TokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  }

  const encodedHeader = encodeBase64Url(JSON.stringify(header))
  const encodedPayload = encodeBase64Url(JSON.stringify(body))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = sign(signingInput, secret)

  return `${signingInput}.${signature}`
}

export function verifyToken(token: string, secret: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [encodedHeader, encodedPayload, providedSignature] = parts
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = sign(signingInput, secret)

  const provided = Buffer.from(providedSignature)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const decoded = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (!decoded.exp || now >= decoded.exp) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

export function createRandomState(): string {
  return randomBytes(16).toString('hex')
}
