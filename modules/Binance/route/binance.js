
const express = require('express');
const router = express.Router();

const binance = require('../controller/binance');


router.post('/balance', binance.getBalance);


module.exports = router;