declare const Buffer: {
  from(input: string, encoding?: string): { toString(encoding: string): string }
}

type RequestLike = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type Voyage = {
  shipId: number
  routeId: string
  departureTime: string
  arrivalTime: string
  notified: boolean
}

type Ship = {
  id: number
  account: string
  name: string
}

type Route = {
  id: string
  name: string
}

const dateTimeWithoutSecondsFormat: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}

type RepoFile<T> = {
  sha: string
  json: T
  text: string
}

type GithubContentResponse = {
  sha?: string
  content?: string
  encoding?: string
}

function send(res: ResponseLike, statusCode: number, payload: Record<string, unknown>): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.end(JSON.stringify(payload))
}

function readHeader(headers: RequestLike['headers'], name: string): string {
  const raw = headers?.[name]
  if (!raw) {
    return ''
  }

  return Array.isArray(raw) ? raw[0] ?? '' : raw
}

function sanitizeDiscordText(input: string): string {
  return input
    .replace(/@everyone/g, '@\u200beveryone')
    .replace(/@here/g, '@\u200bhere')
    .replace(/<@!?\d+>/g, '[user]')
    .replace(/<@&\d+>/g, '[role]')
}

function voyageKey(voyage: Voyage): string {
  return `${voyage.shipId}|${voyage.routeId}|${voyage.departureTime}|${voyage.arrivalTime}`
}

async function readRepoJson<T>(owner: string, repo: string, branch: string, token: string, path: string): Promise<RepoFile<T>> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    throw new Error(`${path} の取得に失敗しました。status=${response.status}`)
  }

  const payload = (await response.json()) as GithubContentResponse
  if (!payload.sha || payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    throw new Error(`${path} のレスポンス形式が不正です。`)
  }

  const text = Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString('utf-8')

  return {
    sha: payload.sha,
    text,
    json: JSON.parse(text) as T,
  }
}

async function updateRepoFile(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  path: string,
  sha: string,
  text: string,
  message: string,
): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(text, 'utf-8').toString('base64'),
      sha,
      branch,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(payload?.message ?? `${path} の更新に失敗しました。status=${response.status}`)
  }
}

async function postDiscord(webhookUrl: string, content: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      allowed_mentions: {
        parse: [],
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord 通知に失敗しました。status=${response.status}`)
  }
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== 'GET') {
    send(res, 405, { message: 'GET のみ受け付けます。' })
    return
  }

  const cronSecret = process.env.CRON_SECRET
  const authorization = readHeader(req.headers, 'authorization')
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!cronSecret || bearerToken !== cronSecret) {
    send(res, 401, { message: '認証に失敗しました。' })
    return
  }

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH ?? 'main'
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  const maxPerRun = Number(process.env.DISCORD_NOTIFY_MAX_PER_RUN ?? '20')

  if (!token || !owner || !repo || !webhookUrl) {
    send(res, 503, {
      message: '必要な環境変数が不足しています。GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DISCORD_WEBHOOK_URL を確認してください。',
    })
    return
  }

  try {
    const [voyagesFile, shipsFile, routesFile] = await Promise.all([
      readRepoJson<Voyage[]>(owner, repo, branch, token, 'data/voyage-data.json'),
      readRepoJson<Ship[]>(owner, repo, branch, token, 'data/ship-data.json'),
      readRepoJson<Route[]>(owner, repo, branch, token, 'data/route-master.json'),
    ])

    const now = Date.now()
    const dueVoyages = voyagesFile.json
      .filter((voyage) => !voyage.notified && new Date(voyage.arrivalTime).getTime() <= now)
      .sort((a, b) => new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime())

    if (dueVoyages.length === 0) {
      send(res, 200, { message: '通知対象はありません。', notifiedCount: 0 })
      return
    }

    const targets = dueVoyages.slice(0, Math.max(1, maxPerRun))
    const lines = targets.map((voyage) => {
      const ship = shipsFile.json.find((item) => item.id === voyage.shipId)
      const route = routesFile.json.find((item) => item.id === voyage.routeId)
      const shipName = ship ? `${ship.account} / ${ship.name}` : `shipId=${voyage.shipId}`
      const routeName = route?.name ?? voyage.routeId
      const arrivedAt = new Date(voyage.arrivalTime).toLocaleString('ja-JP', dateTimeWithoutSecondsFormat)
      return sanitizeDiscordText(`- ${shipName}: ${routeName} が帰港済みです (${arrivedAt})`)
    })

    let content = ['潜水艦帰港通知', ...lines].join('\n')
    if (content.length > 1900) {
      content = `${content.slice(0, 1850)}\n...`
    }

    await postDiscord(webhookUrl, content)

    const targetKeySet = new Set(targets.map((item) => voyageKey(item)))
    const nextVoyages = voyagesFile.json.map((voyage) => {
      if (!targetKeySet.has(voyageKey(voyage))) {
        return voyage
      }

      return {
        ...voyage,
        notified: true,
      }
    })

    const nextText = JSON.stringify(nextVoyages, null, 2)
    if (nextText !== voyagesFile.text) {
      await updateRepoFile(
        owner,
        repo,
        branch,
        token,
        'data/voyage-data.json',
        voyagesFile.sha,
        nextText,
        `Notify arrived voyages (${targets.length}) via Discord`,
      )
    }

    send(res, 200, {
      message: 'Discord 通知を送信しました。',
      notifiedCount: targets.length,
      remainingCount: Math.max(0, dueVoyages.length - targets.length),
    })
  } catch (error) {
    send(res, 500, {
      message: error instanceof Error ? error.message : '通知処理中にエラーが発生しました。',
    })
  }
}