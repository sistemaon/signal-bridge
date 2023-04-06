
const Market = require('../model/market');

const fetchAndSaveMarkets = async (req, res, next) => {
    // Fetch the market information for the symbol
    const binance = new ccxt.binance({
        apiKey: process.env.API_KEY_BINANCE,
        secret: process.env.API_SECRET_BINACE,
        enableRateLimit: true,
        options: {
            defaultType: 'future'
        }
    });
    const markets = await binance.fetchMarkets();
};


const marketController = {
    fetchAndSaveMarkets
};

module.exports = marketController;