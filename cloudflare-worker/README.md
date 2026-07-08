# Discord 通知用 Cloudflare Workers Cron

このディレクトリには、5分ごとに実行されて既存の通知 API を呼び出すための最小構成の Cloudflare Worker を置いています。

## ファイル構成

- `src/index.ts`: スケジュール実行のハンドラと、`/health` エンドポイント
- `wrangler.toml`: Worker 名、cron 設定、秘密ではない変数
- `package.json`: Wrangler 用スクリプト
- `tsconfig.json`: Workers 向け TypeScript 設定

## 環境変数

`CRON_SECRET` は Cloudflare の secret として設定します。

```bash
cd cloudflare-worker
npx wrangler secret put CRON_SECRET
```

ローカル開発では、`cloudflare-worker/.dev.vars` に `CRON_SECRET` を書くと `wrangler dev` で読み込まれます。

```dotenv
# cloudflare-worker/.dev.vars
CRON_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`NOTIFY_API_URL` は `wrangler.toml` の secret ではない変数として設定しています。必要に応じて、Vercel 側のエンドポイントに置き換えてください。

```toml
# cloudflare-worker/wrangler.toml
[vars]
NOTIFY_API_URL = "https://your-project.vercel.app/api/notify-discord"
```

## ローカル実行

```bash
npm install
npm run dev
```

## デプロイ

```bash
npm run deploy
```

## 補足

- cron は `*/5 * * * *` で実行されます。
- `/health` は `ok` を返します。
- 通知処理はスケジュール実行のみで動き、公開された手動実行エンドポイントはありません。
