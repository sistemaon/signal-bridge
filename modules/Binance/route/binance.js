
const express = require('express');
const router = express.Router();

const binance = require('../controller/binance');
const binanceMarket = require('../controller/market');

router.post('/add/order-signal-indicator', binance.createOrderSignalIndicator);

router.post('/add/order-target-indicator', binance.createOrderTargetIndicator);

router.post('/add/markets', binanceMarket.fetchAndSaveMarkets);

router.post('/user/:userId/orders', binance.fetchUserBinanceOrders);

module.exports = router;