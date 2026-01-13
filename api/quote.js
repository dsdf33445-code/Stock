// api/quote.js
export default async function handler(req, res) {
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 1. 處理代號：自動補上 .TW (針對上市股票的簡易判斷)
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase().trim();
    // 如果是純數字且長度為4 (如 2330)，加上 .TW
    // 如果是上櫃股票 (如 8069)，Yahoo Finance 需要 .TWO，這裡暫時統一加 .TW 
    // (建議使用者如果查不到，手動輸入 "8069.TWO")
    if (!s.includes('.') && /^\d{4}$/.test(s)) return `${s}.TW`; 
    return s;
  });

  try {
    // 2. 呼叫 Yahoo Finance
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}&region=TW&lang=zh-Hant-TW`;
    
    const response = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const data = await response.json();
    const result = {};

    // 3. 解析與格式化
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        // 為了讓前端好對應，我們移除後綴 (.TW, .TWO) 當作 Key
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        
        // 優先使用 longName (全名) -> shortName -> code
        const name = stock.longName || stock.shortName || code;
        
        result[code] = {
            price: stock.regularMarketPrice,
            name: name
        };
        // 同時保留原始 symbol 當 key，以防萬一
        result[stock.symbol] = {
            price: stock.regularMarketPrice,
            name: name
        };
      });
    }

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}