
const express = require('express');
const router = express.Router();

const binance = require('../controller/binance');
const binanceMarket = require('../controller/market');

router.post('/add/order-signal-indicator', binance.createOrderSignalIndicator);

router.post('/add/markets', binanceMarket.fetchAndSaveMarkets);

module.exports = router;