
const express = require('express');
const router = express.Router();

const tradingview = require('../controller/tradingview');

router.post('/add', tradingview.createSignal);

module.exports = router;