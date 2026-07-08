# FF14 潜水艦帰港管理ツール

FF14 の潜水艦運用向けに、艦船設定、出港登録、帰港時刻計算、ダッシュボード表示を行う Web アプリです。

## 現在の実装範囲

- React + TypeScript のフロントエンド土台
- 艦船、航路、パーツ、ランク補正、出港データの型定義
- 帰港時刻の自動計算ロジック
- ダッシュボード、艦船設定、出港登録、マスタ管理の初期UI
- Vercel Functions 経由で GitHub JSON を更新する API スタブ

## セットアップ

WSL(Ubuntu) 上での実行環境準備が可能です。Windows で開発する場合は、WSL 上で Node.js 24 以降を用意してこのプロジェクトを実行してください。

1. Ubuntu (WSL) を起動し、Node.js 24 系をインストール

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

2. プロジェクトディレクトリで依存関係をインストールし、開発サーバーを起動

```bash
npm install
npm run dev
```

3. VS Code は「Remote - WSL」経由でフォルダを開くことを推奨

- コマンドパレットで `WSL: Reopen Folder in WSL` を実行してください。

PowerShell で直接実行したい場合は、従来どおり以下でも動作します。

```powershell
npm install
npm run dev
```

## 環境変数

Vercel 側で以下を設定します。

- GITHUB_TOKEN
- GITHUB_OWNER
- GITHUB_REPO
- GITHUB_BRANCH
- ALLOWED_ORIGINS
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- AUTH_REDIRECT_URI
- AUTH_JWT_SECRET
- ALLOWED_GITHUB_USERS
- DISCORD_WEBHOOK_URL
- CRON_SECRET
- DISCORD_NOTIFY_MAX_PER_RUN (任意。未設定時は 20)

GitHub Actions (Repository Secrets) 側で以下を設定します。

- NOTIFY_API_URL (例: `https://your-project.vercel.app/api/notify-discord`)
- CRON_SECRET (Vercel 側 `CRON_SECRET` と同じ値)

`NOTIFY_API_URL` は GitHub Actions 専用です。Vercel 側へは設定不要です。

フロントエンド側では、GitHub Pages から Vercel Functions を呼ぶために以下を設定します。

- VITE_UPDATE_API_BASE_URL
- VITE_DATA_RAW_BASE_URL

例: https://your-project.vercel.app

`VITE_DATA_RAW_BASE_URL` には GitHub の raw URL を設定します。これにより、Pages を再ビルドしなくても、起動時に GitHub 上の最新 JSON を読み込めます。

## デプロイ構成 (GitHub Pages + Vercel Functions)

- フロントエンドは GitHub Pages にデプロイします。
- 更新 API は Vercel Functions (/api/update-data) で実行します。
- 永続データは GitHub リポジトリ内の data/*.json に保存します。

この構成では、フロントエンドから更新 API へクロスオリジンアクセスが発生するため、ALLOWED_ORIGINS に GitHub Pages の公開 URL を設定してください。

## ユーザー認証付き更新フロー

- `/api/auth-start` で GitHub OAuth 認証を開始します。
- `/api/auth-callback` で GitHub ログインを検証し、短命アクセストークンを発行します。
- フロントエンドはトークンを保持し、`/api/update-data` 呼び出し時に Authorization ヘッダーへ Bearer トークンとして付与します。
- `ALLOWED_GITHUB_USERS` に含まれない GitHub ユーザーは更新できません。

### GitHub OAuth App の設定

1. GitHub の Developer settings > OAuth Apps で新規 App を作成
2. Authorization callback URL に `AUTH_REDIRECT_URI` と同じ URL を設定
	- 例: `https://your-vercel-project.vercel.app/api/auth-callback`
3. 発行された Client ID / Client Secret を Vercel 環境変数へ設定

### 認証テスト手順

1. GitHub Pages 側を開く
2. 画面右上の「GitHubでログイン」を押す
3. GitHub 認証完了後、アプリに戻ってユーザー名表示を確認
4. 保存操作を行い、`GitHub リポジトリへ保存しました。` が表示されることを確認

## 保存方式

- フロントエンドは localStorage に即時保存します。
- 起動時は GitHub の raw JSON を読み込み、最新データを表示します。
- その後、/api/update-data に POST して GitHub リポジトリ内の JSON 更新を試みます。
- 現在の API は最小スタブであり、将来は認証強化と競合制御の改善が必要です。

## Discord 通知 (単一Webhook + 5分Cron + 重複防止)

- 通知処理は `/api/notify-discord` で実行します。
- `data/voyage-data.json` の `notified=false` かつ `arrivalTime <= 現在時刻` を通知対象とします。
- Discord 送信成功後にのみ `notified=true` へ更新し、重複通知を防ぎます。

### スケジュール実行設定 (GitHub Actions)

Vercel Hobby の制限を避けるため、スケジュール実行は GitHub Actions で行います。

ワークフローは `.github/workflows/notify-discord.yml` で管理し、`*/5 * * * *` で `/api/notify-discord` を呼び出します。

`CRON_SECRET` は十分長いランダム文字列にし、定期的にローテーションしてください。

設定後は Actions の `Discord Arrival Notify` を手動実行して、応答と通知結果を確認してください。

### セキュリティ注意点

- `DISCORD_WEBHOOK_URL` は Vercel の Environment Variables のみで管理し、フロントエンドへ渡さないでください。
- Webhook URL をログ出力しないでください。
- 通知本文では `@everyone` / `@here` / メンションを無効化して送信します。