# 🎰 BIGWIN Images - Netlify ホスティング

BBDiscord システム用の画像ホスティングサービス

## 📁 プロジェクト構成

```
netlify-images/
├── index.html          # メインページ
├── netlify.toml        # Netlify 設定
├── package.json        # Node.js 依存関係
├── README.md           # このファイル
└── netlify/
    └── functions/
        ├── upload.js   # 画像アップロード API
        └── images.js   # 画像一覧取得 API
```

## 🚀 デプロイ手順

### 1. Netlify アカウントの準備

1. [Netlify](https://app.netlify.com/) にアクセス
2. GitHubアカウントでサインアップ/ログイン
3. 新しいサイトを作成

### 2. GitHub経由デプロイ（推奨）

1. このリポジトリをGitHubにプッシュ
2. Netlify で「New site from Git」を選択
3. GitHubリポジトリを選択して連携
4. 設定：
   - Build command: `echo 'Build complete'`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

## 🔧 設定

### 環境変数

Netlify管理画面 → Site settings → Environment variables で以下を設定：

```
URL=https://your-site.netlify.app
```

## 📡 API エンドポイント

### 画像アップロード
```
POST /api/upload
Content-Type: application/json

{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "filename": "example.png",
  "source": "bigwin-system"
}
```

### 画像一覧取得
```
GET /api/images
```

## 🔗 BBDiscord システムとの連携

```python
# 設定例
NETLIFY_SITE_URL = "https://your-site.netlify.app"
NETLIFY_UPLOAD_ENDPOINT = f"{NETLIFY_SITE_URL}/api/upload"
```

## 🌟 特徴

- Discord embed 画像の永続化
- 既存メッセージの編集対応
- 美しいダッシュボード
- 統計情報の表示
- CORS対応API

---

© 2025 BBDiscord Team • GitHub: [rabigame/bbbigwin](https://github.com/rabigame/bbbigwin) 