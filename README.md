# FF14 潜水艦帰港管理ツール

FF14 の潜水艦運用向けに、艦船設定、出港登録、帰港時刻計算、ダッシュボード表示を行う Web アプリです。

## 現在の実装範囲

- React + TypeScript のフロントエンド土台
- 艦船、航路、パーツ、ランク補正、出港データの型定義
- 帰港時刻の自動計算ロジック
- ダッシュボード、艦船設定、出港登録、マスタ管理の初期UI
- Vercel Functions 経由で GitHub JSON を更新する API スタブ

## セットアップ

WSL(Ubuntu) 上での実行環境準備が可能です。Windows で開発する場合は、WSL 上で Node.js 20 以降を用意してこのプロジェクトを実行してください。

1. Ubuntu (WSL) を起動し、Node.js 20 系をインストール

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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

フロントエンド側では、GitHub Pages から Vercel Functions を呼ぶために以下を設定します。

- VITE_UPDATE_API_BASE_URL

例: https://your-project.vercel.app

## デプロイ構成 (GitHub Pages + Vercel Functions)

- フロントエンドは GitHub Pages にデプロイします。
- 更新 API は Vercel Functions (/api/update-data) で実行します。
- 永続データは GitHub リポジトリ内の data/*.json に保存します。

この構成では、フロントエンドから更新 API へクロスオリジンアクセスが発生するため、ALLOWED_ORIGINS に GitHub Pages の公開 URL を設定してください。

## 保存方式

- フロントエンドは localStorage に即時保存します。
- その後、/api/update-data に POST して GitHub リポジトリ内の JSON 更新を試みます。
- 現在の API は最小スタブであり、将来は認証強化と競合制御の改善が必要です。