const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 許可される画像形式
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

// 画像保存ディレクトリ
const IMAGES_DIR = path.join(process.cwd(), 'images');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

exports.handler = async (event, context) => {
    // CORS ヘッダーの設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS リクエストの処理（CORS プリフライト）
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    // POST リクエストのみ許可
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // リクエストボディのパース
        const body = JSON.parse(event.body);
        const { image, filename, source } = body;

        // 必須フィールドの確認
        if (!image || !filename) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: image, filename' })
            };
        }

        // Base64 データの検証
        if (!image.startsWith('data:image/')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid image format' })
            };
        }

        // ファイル拡張子の確認
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Unsupported file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
                })
            };
        }

        // Base64 から Buffer に変換
        const base64Data = image.split(',')[1];
        if (!base64Data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid base64 data' })
            };
        }

        const buffer = Buffer.from(base64Data, 'base64');

        // ファイルサイズの確認
        if (buffer.length > MAX_FILE_SIZE) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `File size exceeds limit: ${(buffer.length / 1024 / 1024).toFixed(2)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB` 
                })
            };
        }

        // ユニークなファイル名を生成
        const timestamp = new Date().toISOString().replace(/[:\-]/g, '').replace(/\..+/, '');
        const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
        const uniqueFilename = `bigwin_${timestamp}_${hash}${ext}`;

        // ファイルを保存
        const filePath = path.join(IMAGES_DIR, uniqueFilename);
        fs.writeFileSync(filePath, buffer);

        // 画像URL を生成
        const imageUrl = `${process.env.URL || 'https://your-site.netlify.app'}/images/${uniqueFilename}`;

        // メタデータを保存
        const metadata = {
            filename: uniqueFilename,
            original_filename: filename,
            size: buffer.length,
            uploaded_at: new Date().toISOString(),
            source: source || 'unknown',
            url: imageUrl
        };

        // メタデータファイルに記録
        const metadataPath = path.join(IMAGES_DIR, 'metadata.json');
        let metadataList = [];
        
        if (fs.existsSync(metadataPath)) {
            try {
                const metadataContent = fs.readFileSync(metadataPath, 'utf8');
                metadataList = JSON.parse(metadataContent);
            } catch (error) {
                console.error('Failed to read metadata:', error);
            }
        }

        metadataList.push(metadata);

        // 最新100件のみ保持
        if (metadataList.length > 100) {
            metadataList = metadataList.slice(-100);
        }

        fs.writeFileSync(metadataPath, JSON.stringify(metadataList, null, 2));

        console.log(`Image uploaded successfully: ${uniqueFilename} (${(buffer.length / 1024).toFixed(2)}KB)`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    url: imageUrl,
                    filename: uniqueFilename,
                    size: buffer.length,
                    uploaded_at: metadata.uploaded_at
                }
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
}; 