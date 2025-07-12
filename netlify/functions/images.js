const fs = require('fs');
const path = require('path');

// 画像保存ディレクトリ
const IMAGES_DIR = path.join(process.cwd(), 'images');

exports.handler = async (event, context) => {
    // CORS ヘッダーの設定
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // GET リクエストのみ許可
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // メタデータファイルの読み込み
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

        // 画像ディレクトリの確認
        if (!fs.existsSync(IMAGES_DIR)) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'No images directory found',
                    data: {
                        images: [],
                        total: 0,
                        total_size: 0,
                        last_updated: new Date().toISOString()
                    }
                })
            };
        }

        // 実際のファイル一覧を取得
        const files = fs.readdirSync(IMAGES_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
        });

        // メタデータとファイル一覧を突合
        const images = [];
        let totalSize = 0;
        const baseUrl = process.env.URL || 'https://your-site.netlify.app';

        for (const file of imageFiles) {
            const filePath = path.join(IMAGES_DIR, file);
            const stat = fs.statSync(filePath);
            
            // メタデータから詳細情報を取得
            const metadata = metadataList.find(m => m.filename === file);
            
            const imageData = {
                filename: file,
                original_filename: metadata?.original_filename || file,
                url: `${baseUrl}/images/${file}`,
                size: stat.size,
                uploaded_at: metadata?.uploaded_at || stat.birthtime.toISOString(),
                source: metadata?.source || 'unknown',
                modified_at: stat.mtime.toISOString()
            };

            images.push(imageData);
            totalSize += stat.size;
        }

        // 最新順でソート
        images.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

        // 統計情報を計算
        const today = new Date().toISOString().split('T')[0];
        const todayUploads = images.filter(img => 
            img.uploaded_at.startsWith(today)
        ).length;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Images retrieved successfully',
                data: {
                    images: images,
                    total: images.length,
                    total_size: totalSize,
                    total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
                    today_uploads: todayUploads,
                    last_updated: new Date().toISOString()
                }
            })
        };

    } catch (error) {
        console.error('Images retrieval error:', error);
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