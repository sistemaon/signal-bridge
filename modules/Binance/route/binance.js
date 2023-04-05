
const express = require('express');
const router = express.Router();

const binance = require('../controller/binance');

router.post('/balance', binance.getBalance);

router.post('/add/order-signal-indicator', binance.createOrderSignalIndicator);

module.exports = router;