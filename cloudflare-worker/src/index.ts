export interface Env {
  NOTIFY_API_URL: string
  CRON_SECRET: string
}

function validateEnv(env: Env): void {
  if (!env.NOTIFY_API_URL) {
    throw new Error("NOTIFY_API_URL が設定されていません。")
  }

  if (!env.CRON_SECRET) {
    throw new Error("CRON_SECRET が設定されていません。")
  }
}

async function runNotification(env: Env): Promise<void> {
  validateEnv(env)

  const response = await fetch(env.NOTIFY_API_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`notify failed: ${response.status} ${body}`)
  }
}

const worker: ExportedHandler<Env> = {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runNotification(env))
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 })
    }

    return new Response("not found", { status: 404 })
  },
}

export default worker
