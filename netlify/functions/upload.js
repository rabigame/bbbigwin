const crypto = require('crypto');

// 許可される画像形式
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

// GitHub設定（直接記入）
const GITHUB_TOKEN = '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';
const GITHUB_REPO = 'rabigame/bbbigwin';
const GITHUB_BRANCH = 'main';

// マルチパートフォームデータのパース
const parseMultipartFormData = (body, boundary) => {
    const parts = body.split(`--${boundary}`);
    const files = {};
    
    for (const part of parts) {
        if (part.includes('Content-Disposition: form-data')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            
            if (nameMatch && filenameMatch) {
                const fieldName = nameMatch[1];
                const filename = filenameMatch[1];
                
                // バイナリデータの開始位置を見つける
                const headerEnd = part.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                    const binaryData = part.slice(headerEnd + 4);
                    // 最後の\r\nを除去
                    const cleanData = binaryData.slice(0, -2);
                    
                    files[fieldName] = {
                        filename: filename,
                        data: Buffer.from(cleanData, 'binary')
                    };
                }
            }
        }
    }
    
    return files;
};

// GitHub APIで画像をアップロード
const uploadToGitHub = async (filename, buffer, originalFilename) => {
    const base64Content = buffer.toString('base64');
    const path = `images/${filename}`;
    
    try {
        // ファイルが既に存在するかチェック
        let sha = null;
        try {
            const checkResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'BIGWIN-Image-Uploader'
                    }
                }
            );
            
            if (checkResponse.ok) {
                const existing = await checkResponse.json();
                sha = existing.sha;
            }
        } catch (error) {
            // ファイルが存在しない場合は無視
        }
        
        // ファイルをアップロード/更新
        const uploadData = {
            message: `Upload: ${originalFilename} -> ${filename}`,
            content: base64Content,
            branch: GITHUB_BRANCH
        };
        
        if (sha) {
            uploadData.sha = sha;
        }
        
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'BIGWIN-Image-Uploader',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadData)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // GitHub Pages/CDN URL を生成
        const imageUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
        
        return {
            success: true,
            url: imageUrl,
            github_url: result.content.html_url,
            sha: result.content.sha
        };
        
    } catch (error) {
        console.error('GitHub upload error:', error);
        throw error;
    }
};

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
        console.log('Upload request received');
        console.log('Content-Type:', event.headers['content-type']);
        
        let fileData = null;
        let originalFilename = null;
        
        // Content-Type に基づいてデータを解析
        const contentType = event.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
            // マルチパートフォームデータの処理
            const boundary = contentType.split('boundary=')[1];
            if (!boundary) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid multipart boundary' })
                };
            }
            
            const files = parseMultipartFormData(event.body, boundary);
            
            if (!files.file && !files.image) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'No file uploaded' })
                };
            }
            
            const uploadedFile = files.file || files.image;
            fileData = uploadedFile.data;
            originalFilename = uploadedFile.filename;
            
        } else if (contentType.includes('application/json')) {
            // JSON形式（Base64）の処理
            const body = JSON.parse(event.body);
            const { image, filename } = body;
            
            if (!image || !filename) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields: image, filename' })
                };
            }
            
            if (!image.startsWith('data:image/')) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid image format' })
                };
            }
            
            const base64Data = image.split(',')[1];
            fileData = Buffer.from(base64Data, 'base64');
            originalFilename = filename;
            
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Unsupported content type' })
            };
        }
        
        if (!fileData || !originalFilename) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid file data' })
            };
        }
        
        console.log(`Processing file: ${originalFilename} (${fileData.length} bytes)`);
        
        // ファイル拡張子の確認
        const ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `Unsupported file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
                })
            };
        }

        // ファイルサイズの確認
        if (fileData.length > MAX_FILE_SIZE) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `File size exceeds limit: ${(fileData.length / 1024 / 1024).toFixed(2)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB` 
                })
            };
        }

        // ユニークなファイル名を生成
        const timestamp = new Date().toISOString().replace(/[:\-]/g, '').replace(/\..+/, '');
        const hash = crypto.createHash('md5').update(fileData).digest('hex').substring(0, 8);
        const safeName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `bigwin_${timestamp}_${hash}_${safeName}`;

        // GitHubにアップロード
        console.log(`Uploading to GitHub: ${uniqueFilename}`);
        const uploadResult = await uploadToGitHub(uniqueFilename, fileData, originalFilename);

        console.log(`Upload successful: ${uniqueFilename} -> ${uploadResult.url}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Image uploaded successfully to GitHub',
                url: uploadResult.url,
                filename: uniqueFilename,
                size: fileData.length,
                uploaded_at: new Date().toISOString(),
                github_url: uploadResult.github_url,
                sha: uploadResult.sha
            })
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
}; 