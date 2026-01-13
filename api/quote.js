// api/quote.js
// 使用 yahoo-finance2 套件，這是最穩定的 Node.js 抓股價方式
const yahooFinance = require('yahoo-finance2').default;

module.exports = async (req, res) => {
  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Missing symbols parameter' });
  }

  // 1. 處理代號
  // yahoo-finance2 對台股代號的格式要求是 "2330.TW"
  const symbolList = symbols.split(',').map(s => {
    s = s.toUpperCase().trim();
    // 如果是純數字 (如 2330)，補上 .TW
    if (!s.includes('.') && /^\d{4}$/.test(s)) return `${s}.TW`;
    return s;
  });

  try {
    // 2. 使用套件抓取 (比 fetch 更穩定，會自動處理 Crumb)
    // quoteCombine 可以一次抓多檔
    const quotes = await yahooFinance.quote(symbolList, { 
      fields: ['symbol', 'regularMarketPrice', 'longName', 'shortName'] 
    });

    const result = {};

    // 3. 格式化回傳資料
    // yahooFinance.quote 若只查一檔會回傳物件，查多檔回傳陣列
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

    quotesArray.forEach(stock => {
      // 移除 .TW 以便前端對應 key
      const rawCode = stock.symbol.replace('.TW', '').replace('.TWO', '');
      
      // 名稱優先順序
      const name = stock.longName || stock.shortName || rawCode;

      const stockData = {
        price: stock.regularMarketPrice,
        name: name
      };

      // 存入兩種 key (原始代號 & 純數字代號) 確保前端一定找得到
      result[rawCode] = stockData;
      result[stock.symbol] = stockData;
    });

    // 設定快取
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    res.status(200).json(result);

  } catch (error) {
    console.error("Yahoo Finance API Error:", error);
    // 即使失敗，也要回傳 JSON 避免前端炸裂
    res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: error.message,
      // 如果是找不到代號，通常 error.message 會包含 'Not Found'
    });
  }
};