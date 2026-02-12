const functions = require('firebase-functions');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const EODHD_API_KEY = defineString('EODHD_API_KEY');

exports.proxyEODHD = functions.https.onRequest(async (req, res) => { // Made the onRequest handler async
  cors(req, res, async () => {
    // Dynamically import node-fetch within the async context
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
        const key = item.ticker + '.' + (item.market || 'US');
        if (!uniqueTickers.has(key)) {
          uniqueTickers.add(key);
          tickerList.push({ ticker: item.ticker, market: item.market || 'US' });
        }
        if (!item.name || item.name === item.ticker || item.name === '-') {
            nameNeedsFetching.push({ ticker: item.ticker, market: item.market || 'US' });
        }
      });
      
      const priceFetches = tickerList.map(t => {
        const suffix = t.market === 'KR' ? '.KO' : '.US';
        const url = `https://eodhd.com/api/real-time/${t.ticker}${suffix}?api_token=${apiKey}&fmt=json`;
        return fetch(url).then(r => r.json()).catch(e => {
            console.error(`Error fetching price for ${t.ticker}: ${e.message}`);
            return null; // Return null on error so Promise.allSettled can handle
        });
      });

      const nameFetches = nameNeedsFetching.map(t => {
        const url = `https://eodhd.com/api/search/${t.ticker}?api_token=${apiKey}&fmt=json`;
        return fetch(url).then(r => r.json()).catch(e => {
            console.error(`Error fetching name for ${t.ticker}: ${e.message}`);
            return null; // Return null on error
        });
      });

      const [priceResults, nameResults] = await Promise.all([
        Promise.allSettled(priceFetches),
        Promise.allSettled(nameFetches)
      ]);

      const priceMap = {};
      priceResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
          const key = tickerList[i].ticker + '.' + tickerList[i].market;
          priceMap[key] = result.value.close || result.value.previousClose || 0;
        }
      });

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
        newItem.currentPrice = priceMap[key] !== undefined ? priceMap[key] : item.currentPrice; // Only update if fetched
        
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
