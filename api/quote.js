// api/quote.js
// 負責抓取股價與名稱，並強制使用繁體中文

export default async function handler(req, res) {
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 1. 處理代號：加上 .TW (上市) 或 .TWO (上櫃)
  // 這裡做一個簡單判斷：如果是 4 位數數字，預設先試上市 (.TW)
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase().trim();
    if (!s.includes('.')) return `${s}.TW`; 
    return s;
  });

  try {
    // 2. 呼叫 Yahoo Finance API (加上 lang=zh-Hant-TW 強制繁體中文)
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}&region=TW&lang=zh-Hant-TW`;
    
    const response = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const data = await response.json();
    const result = {};

    // 3. 解析資料，回傳 { price, name } 物件
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        // 移除 .TW/.TWO 以便前端對應
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        
        // 優先使用 longName (通常是全名)，沒有則用 shortName
        const name = stock.longName || stock.shortName || code;
        
        result[code] = {
            price: stock.regularMarketPrice,
            name: name
        };
      });
    }

    // 設定快取 10 秒
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}