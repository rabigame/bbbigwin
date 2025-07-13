# 🎰 BIGWIN Images - GitHub連携版

BBDiscord システム用の画像ホスティングサービス（GitHub Repository永続化対応）

## 🚀 **新機能: GitHub Repository永続化**

画像ファイルはGitHub Repositoryに直接保存され、GitHub Pages/CDNから高速配信されます。

### **メリット**
- ✅ **完全な永続化**: ファイルが消失しない
- ✅ **高速配信**: GitHub CDNによる高速アクセス
- ✅ **バージョン管理**: Git履歴で変更を追跡
- ✅ **完全無料**: GitHub無料プランで利用可能

## ⚙️ **セットアップ手順**

### 1. **GitHub Personal Access Token作成**

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Generate new token (classic)** をクリック
3. 必要な権限を設定:
   ```
   ✅ repo (Full control of private repositories)
   ✅ public_repo (Access public repositories)
   ```
4. トークンをコピーして保存

### 2. **Netlify環境変数設定**

Netlifyダッシュボードで以下の環境変数を設定:

```bash
GITHUB_TOKEN=your_github_personal_access_token_here
NODE_ENV=production
```

### 3. **GitHubリポジトリ設定**

- **Repository**: `rabigame/bbbigwin`
- **Branch**: `main`
- **Images Directory**: `images/`

## 📡 **API エンドポイント**

### 画像アップロード
```bash
POST https://bbbigwin.netlify.app/.netlify/functions/upload

# マルチパートフォームデータ
Content-Type: multipart/form-data

# または JSON形式（Base64）
Content-Type: application/json
{
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "filename": "example.png"
}
```

### 画像一覧取得
```bash
GET https://bbbigwin.netlify.app/.netlify/functions/images
```

## 🔧 **ローカル開発**

```bash
# 依存関係インストール
npm install

# ローカル開発サーバー起動
npm run dev

# 本番デプロイ
npm run deploy
```

## 📁 **ファイル構造**

```
bbbigwin/
├── netlify/
│   └── functions/
│       ├── upload.js     # GitHub API画像アップロード
│       └── images.js     # GitHub API画像一覧取得
├── images/               # GitHub Repository保存先
├── netlify.toml          # Netlify設定
├── package.json          # プロジェクト設定
├── index.html            # フロントエンドUI
└── README.md             # このファイル
```

## 🌐 **画像URL形式**

アップロードされた画像は以下の形式でアクセス可能:

```
https://raw.githubusercontent.com/rabigame/bbbigwin/main/images/bigwin_20250714123456_a1b2c3d4_filename.png
```

## 🔗 **Render連携**

Render環境からは以下のようにアップロード:

```python
# Renderからの呼び出し例
import aiohttp

async def upload_to_netlify(image_data, filename):
    async with aiohttp.ClientSession() as session:
        data = aiohttp.FormData()
        data.add_field('file', image_data, filename=filename)
        
        async with session.post(
            'https://bbbigwin.netlify.app/.netlify/functions/upload',
            data=data
        ) as response:
            result = await response.json()
            return result.get('url')
```

## 🛠️ **トラブルシューティング**

### よくある問題

1. **GitHub Token権限不足**
   ```
   Error: GitHub API Error: 403
   ```
   → repo権限を含むTokenを再作成

2. **ファイルサイズ制限**
   ```
   Error: File size exceeds limit
   ```
   → 8MB以下のファイルのみ対応

3. **CORS エラー**
   ```
   Error: Access-Control-Allow-Origin
   ```
   → netlify.tomlのCORS設定を確認

## 📊 **統計情報**

- **対応形式**: PNG, JPG, JPEG, WebP, GIF
- **最大ファイルサイズ**: 8MB
- **保存期間**: 永続（GitHubリポジトリ）
- **配信速度**: GitHub CDN（高速）

## 🔧 **開発者向け情報**

### GitHub API制限
- **Rate Limit**: 5,000 requests/hour
- **ファイルサイズ**: 100MB/file (実際は8MB制限)
- **Repository容量**: 無制限（実用範囲内）

### セキュリティ
- Personal Access Tokenは環境変数で管理
- アップロードファイルの拡張子・サイズチェック
- CORS設定による外部アクセス制御

---

## 📞 **サポート**

問題が発生した場合:
1. [Issues](https://github.com/rabigame/bbbigwin/issues) で報告
2. ログを確認: `Functions > upload > Logs`
3. GitHub API制限を確認

**BBDiscord Team** - 2025 