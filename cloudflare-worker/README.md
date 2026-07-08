# Discord 通知用 Cloudflare Workers Cron

このディレクトリには、5分ごとに実行されて既存の通知 API を呼び出すための最小構成の Cloudflare Worker を置いています。

## ファイル構成

- `src/index.ts`: スケジュール実行のハンドラと、`/health` エンドポイント
- `wrangler.toml`: Worker 名と cron 設定
- `package.json`: Wrangler 用スクリプト
- `tsconfig.json`: Workers 向け TypeScript 設定

## 環境変数

`CRON_SECRET` と `NOTIFY_API_URL` は Cloudflare の secret として設定します。

```bash
cd cloudflare-worker
npx wrangler secret put CRON_SECRET
npx wrangler secret put NOTIFY_API_URL
```

`NOTIFY_API_URL` には Vercel 側の通知 API エンドポイントを設定します。

```text
https://your-project.vercel.app/api/notify-discord
```

ローカル開発では、`cloudflare-worker/.dev.vars` に両方の値を書くと `wrangler dev` で読み込まれます。

```dotenv
# cloudflare-worker/.dev.vars
CRON_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTIFY_API_URL=https://your-project.vercel.app/api/notify-discord
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
