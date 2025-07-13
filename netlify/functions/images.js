// GitHub設定
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your_github_token_here';
const GITHUB_REPO = 'rabigame/bbbigwin';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH = 'images';

// GitHub APIから画像一覧を取得
const getImagesFromGitHub = async () => {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${IMAGES_PATH}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'BIGWIN-Image-Viewer'
                }
            }
        );

        if (!response.ok) {
            if (response.status === 404) {
                // imagesディレクトリが存在しない場合
                return [];
            }
            throw new Error(`GitHub API Error: ${response.status}`);
        }

        const files = await response.json();
        
        // 画像ファイルのみをフィルタリング
        const imageFiles = files.filter(file => {
            if (file.type !== 'file') return false;
            
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
        });

        // 詳細情報を取得
        const images = await Promise.all(
            imageFiles.map(async (file) => {
                try {
                    // ファイルの詳細情報を取得
                    const detailResponse = await fetch(file.url, {
                        headers: {
                            'Authorization': `token ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'BIGWIN-Image-Viewer'
                        }
                    });

                    let fileInfo = null;
                    if (detailResponse.ok) {
                        fileInfo = await detailResponse.json();
                    }

                    // コミット情報から最終更新日時を取得
                    const commitsResponse = await fetch(
                        `https://api.github.com/repos/${GITHUB_REPO}/commits?path=${IMAGES_PATH}/${file.name}&per_page=1`,
                        {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'User-Agent': 'BIGWIN-Image-Viewer'
                            }
                        }
                    );

                    let lastCommit = null;
                    if (commitsResponse.ok) {
                        const commits = await commitsResponse.json();
                        lastCommit = commits[0];
                    }

                    // 元のファイル名を復元（bigwin_timestamp_hash_originalname.ext の形式から）
                    let originalFilename = file.name;
                    const parts = file.name.split('_');
                    if (parts.length >= 4 && parts[0] === 'bigwin') {
                        originalFilename = parts.slice(3).join('_');
                    }

                    return {
                        filename: file.name,
                        original_filename: originalFilename,
                        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file.name}`,
                        github_url: file.html_url,
                        size: file.size,
                        sha: file.sha,
                        uploaded_at: lastCommit ? lastCommit.commit.author.date : new Date().toISOString(),
                        modified_at: lastCommit ? lastCommit.commit.author.date : new Date().toISOString(),
                        source: 'github',
                        commit_message: lastCommit ? lastCommit.commit.message : 'Unknown'
                    };
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    return {
                        filename: file.name,
                        original_filename: file.name,
                        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file.name}`,
                        github_url: file.html_url,
                        size: file.size,
                        sha: file.sha,
                        uploaded_at: new Date().toISOString(),
                        modified_at: new Date().toISOString(),
                        source: 'github',
                        error: error.message
                    };
                }
            })
        );

        return images;

    } catch (error) {
        console.error('GitHub images retrieval error:', error);
        throw error;
    }
};

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
        console.log('Fetching images from GitHub...');
        
        // GitHubから画像一覧を取得
        const images = await getImagesFromGitHub();

        // 最新順でソート
        images.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

        // 統計情報を計算
        const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
        const today = new Date().toISOString().split('T')[0];
        const todayUploads = images.filter(img => 
            img.uploaded_at && img.uploaded_at.startsWith(today)
        ).length;

        console.log(`Images retrieved: ${images.length} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB total`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Images retrieved successfully from GitHub',
                data: {
                    images: images,
                    total: images.length,
                    total_size: totalSize,
                    total_size_mb: (totalSize / 1024 / 1024).toFixed(2),
                    today_uploads: todayUploads,
                    last_updated: new Date().toISOString(),
                    source: 'github',
                    repository: GITHUB_REPO,
                    branch: GITHUB_BRANCH
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
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
}; 