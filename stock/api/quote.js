// api/quote.js
// 部署到 Vercel 時，這會自動變成 Serverless Function

export default async function handler(req, res) {
  // 1. 取得前端傳來的代號參數 (例如: ?symbols=2330,2603,0050)
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 2. 格式化代號：台股代號在 Yahoo Finance 通常需要加上 .TW (上市) 或 .TWO (上櫃)
  // 為了簡化，我們先假設都是上市 .TW，進階版可以做判斷
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase();
    if (!s.includes('.')) return `${s}.TW`; // 預設加 .TW
    return s;
  });

  try {
    // 3. 呼叫 Yahoo Finance API v8
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}`;
    
    // 注意：Yahoo 有時會擋無 User-Agent 的請求
    const response = await fetch(yahooUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });
    
    const data = await response.json();
    const result = {};

    // 4. 解析資料並回傳簡化格式 { "2330": 1080, "2603": 185 }
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        // 移除 .TW 以便前端對應
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        result[code] = stock.regularMarketPrice;
      });
    }

    // 5. 設定 Cache (避免太頻繁呼叫被鎖)
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}