
const ccxt = require('ccxt');

const binance = new ccxt.binance({
    apiKey: 
    secret: 
    enableRateLimit: true,
    options: {
        defaultType: 'future',
    },
});

const getBalance = async (req, res, next) => {
    const balance = await binance.fetchBalance();
    console.log("🚀 ~ file: binance.js:12 ~ getBalance ~ balance:", balance);
    return res.status(200).json({ balance });
};

const binanceController = {
    getBalance
};

module.exports = binanceController;