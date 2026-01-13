// api/quote.js
// 使用 CommonJS 語法，解決 Vercel 404 問題
// 整合了: 抓股價 (quote) 與 讀取設定 (config) 的功能 (若是分開的檔案，請確認 config.js 也是用 module.exports)

// 由於您有兩個 API 需求 (股價 & 設定)，建議保持分開。
// 這裡是 quote.js 的修正版：

module.exports = async (req, res) => {
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 1. 處理代號
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase().trim();
    if (!s.includes('.') && /^\d{4}$/.test(s)) return `${s}.TW`;
    return s;
  });

  try {
    // 2. 抓取 Yahoo Finance (偽裝瀏覽器)
    const url = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}&region=TW&lang=zh-Hant-TW`;
    
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) throw new Error(`Yahoo API status: ${response.status}`);
    
    const data = await response.json();
    const result = {};

    // 3. 解析資料
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        const name = stock.longName || stock.shortName || code;
        const stockData = { price: stock.regularMarketPrice, name: name };
        
        result[code] = stockData;
        result[stock.symbol] = stockData;
      });
    }

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Fetch failed', details: error.message });
  }
};