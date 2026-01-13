// api/quote.js
// 無依賴版本 (Zero-Dependency)
// 直接使用 Node.js 內建的 fetch，不需要 package.json

module.exports = async (req, res) => {
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 1. 處理代號：自動補上 .TW
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase().trim();
    // 如果是 4 位數純數字，補上 .TW
    if (!s.includes('.') && /^\d{4}$/.test(s)) return `${s}.TW`;
    return s;
  });

  try {
    // 2. 構建 Yahoo Finance URL
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}&region=TW&lang=zh-Hant-TW`;
    
    // 3. 發送請求 (偽裝成瀏覽器 User-Agent 以免被擋)
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Yahoo API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const result = {};

    // 4. 解析資料
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        // 移除 .TW/.TWO 以便前端對應
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        
        // 名稱優先順序
        const name = stock.longName || stock.shortName || code;
        
        const stockData = {
            price: stock.regularMarketPrice,
            name: name
        };
        
        // 存入兩種 key 確保一定找得到
        result[code] = stockData;
        result[stock.symbol] = stockData;
      });
    }

    // 設定快取 10 秒
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
};