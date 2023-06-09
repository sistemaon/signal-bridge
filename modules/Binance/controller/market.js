
const ccxt = require('ccxt');

const Market = require('../model/market');

const fetchAndSaveMarkets = async (req, res, next) => {
    try {
        const binance = new ccxt.binance({
            apiKey: process.env.API_KEY_BINANCE,
            secret: process.env.API_SECRET_BINACE,
            enableRateLimit: true,
            options: {
                defaultType: 'future'
            }
        });
        const markets = await binance.fetchMarkets();
    
        for (const market of markets) {
            await Market.findOneAndUpdate(
                { id: market.id },
                market,
                { upsert: true }
            );
        }
        return res.status(201).json({ data: 'Binance markets saved and/or updated.' });        
    } catch (error) {
        console.log("🚀 ~ file: market.js:22 ~ fetchAndSaveMarkets ~ error:", error);
        return res.status(500).json({ error: error });
    }
};


const marketController = {
    fetchAndSaveMarkets
};

module.exports = marketController;