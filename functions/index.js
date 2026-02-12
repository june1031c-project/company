const functions = require('firebase-functions');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const cheerio = require('cheerio'); // For Naver scraping

admin.initializeApp();

const EODHD_API_KEY = defineString('EODHD_API_KEY');

// Helper function to scrape Naver Finance
async function getPriceFromNaver(ticker) {
  try {
    // Dynamically import node-fetch as it's used here as well
    const { default: fetch } = await import('node-fetch');
    const url = `https://finance.naver.com/item/sise.naver?code=${ticker}`;
    const response = await fetch(url, {
      headers: { // Add a user-agent to mimic a real browser
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.log(`Naver: Failed to fetch page for ${ticker}. Status: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const priceString = $('#_nowVal').text();

    if (!priceString) {
      console.log(`Naver: Could not find price for ${ticker} in HTML.`);
      return null;
    }

    const price = parseInt(priceString.replace(/,/g, ''), 10);
    console.log(`Naver: Fetched price ${price} for ${ticker}`);
    return price;

  } catch (error) {
    console.error(`Naver: Error fetching price for ${ticker}: ${error.message}`);
    return null;
  }
}


exports.proxyEODHD = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const { default: fetch } = await import('node-fetch');

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { items, hasUS } = req.body;
    const apiKey = EODHD_API_KEY.value();

    if (!apiKey) {
      console.error('EODHD_API_KEY is not set in Firebase environment config.');
      return res.status(500).send('API key not configured.');
    }

    try {
      let exchangeRate = 0;
      if (hasUS) {
        const rateUrl = `https://eodhd.com/api/real-time/USDKRW.FOREX?api_token=${apiKey}&fmt=json`;
        const rateResponse = await fetch(rateUrl);
        const rateData = await rateResponse.json();
        exchangeRate = rateData.close || rateData.previousClose || 0;
      }

      const tickerList = [];
      const nameNeedsFetching = [];
      const uniqueTickers = new Set();

      items.forEach(item => {
        if (item.itemType !== 'stock') return;
        const key = item.ticker + '.' + (item.market || 'US');
        if (!uniqueTickers.has(key)) {
          uniqueTickers.add(key);
          tickerList.push({ ticker: item.ticker, market: item.market || 'US' });
        }
        if (!item.name || item.name === item.ticker || item.name === '-') {
          nameNeedsFetching.push({ ticker: item.ticker, market: item.market || 'US' });
        }
      });
      
      const priceMap = {};
      for (const t of tickerList) {
        let price = 0;
        let key = t.ticker + '.' + t.market;
        
        // 국내 종목이면서, 티커에 영문자가 포함된 경우 Naver에서 시세 조회
        if (t.market === 'KR' && /[A-Za-z]/.test(t.ticker)) {
            console.log(`Fetching KR stock ${t.ticker} from Naver finance...`);
            price = await getPriceFromNaver(t.ticker);
        } 
        // 그 외 모든 종목은 EODHD를 통해 시세 조회
        else {
            const suffix = t.market === 'KR' ? '.KO' : '.US';
            const url = `https://eodhd.com/api/real-time/${t.ticker}${suffix}?api_token=${apiKey}&fmt=json`;
            try {
                const eodhdRes = await fetch(url);
                const eodhdData = await eodhdRes.json();
                price = eodhdData.close || eodhdData.previousClose || 0;
            } catch(e) {
                 console.error(`Error fetching price for ${t.ticker} from EODHD: ${e.message}`);
            }
        }
        priceMap[key] = price;
      }

      const nameFetches = nameNeedsFetching.map(t => {
        const url = `https://eodhd.com/api/search/${t.ticker}?api_token=${apiKey}&fmt=json`;
        return fetch(url).then(r => r.json()).catch(e => {
            console.error(`Error fetching name for ${t.ticker}: ${e.message}`);
            return null; // Return null on error
        });
      });

      const nameResults = await Promise.allSettled(nameFetches);

      const nameMap = {};
      nameResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          const t = nameNeedsFetching[i];
          if (Array.isArray(result.value)) {
            let match;
            if (t.market === 'KR') {
              match = result.value.find(d => d.Code === t.ticker && (d.Exchange === 'KO' || d.Exchange === 'KQ'));
            } else {
              match = result.value.find(d => d.Code === t.ticker && d.Exchange === 'US');
            }
            if (!match && result.value.length > 0) match = result.value[0]; // Fallback to first if exact not found
            if (match) nameMap[t.ticker + '.' + t.market] = match.Name;
          }
        }
      });

      const updatedItems = items.map(item => {
        const key = item.ticker + '.' + (item.market || 'US');
        const newItem = { ...item };
        
        if (priceMap[key] !== undefined && priceMap[key] > 0) { // Only update if we have a valid price
             newItem.currentPrice = priceMap[key];
        }
        
        const fetchedName = nameMap[key];
        if (fetchedName) newItem.name = fetchedName;

        if (newItem.market === 'US') {
          newItem.exchangeRate = exchangeRate;
        } else {
          newItem.exchangeRate = null;
        }
        return newItem;
      });

      res.status(200).json({ updatedItems, exchangeRate });

    } catch (error) {
      console.error('Error in proxyEODHD function:', error);
      res.status(500).send('Error fetching data from external API.');
    }
  });
});
