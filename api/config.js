// api/config.js
// 負責讀取 Vercel 環境變數並回傳給前端

module.exports = (req, res) => {
    // 讀取環境變數
    const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    // 簡單檢查是否缺少設定
    if (!config.apiKey) {
        return res.status(500).json({ error: 'Environment variables not set in Vercel' });
    }

    res.status(200).json(config);
};