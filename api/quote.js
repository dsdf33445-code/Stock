// api/quote.js
// 使用 CommonJS 語法，確保 Vercel 在無 package.json 時能正確執行

module.exports = async function handler(req, res) {
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
    // 2. 呼叫 Yahoo Finance
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbolList.join(',')}&region=TW&lang=zh-Hant-TW`;
    
    // Node.js 18+ 內建 fetch，無需 import
    const response = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const data = await response.json();
    const result = {};

    // 3. 解析資料
    if (data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(stock => {
        const code = stock.symbol.replace('.TW', '').replace('.TWO', '');
        const name = stock.longName || stock.shortName || code;
        
        // 存入兩種 key 方便查找
        result[code] = { price: stock.regularMarketPrice, name: name };
        result[stock.symbol] = { price: stock.regularMarketPrice, name: name };
      });
    }

    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
};