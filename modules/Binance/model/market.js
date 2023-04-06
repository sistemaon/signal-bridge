
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const binanceMarketSchema = new Schema({
    id: { type: String, required: false },
    lowercaseId: { type: String, required: false },
    symbol: { type: String, required: false },
    base: { type: String, required: false },
    quote: { type: String, required: false },
    settle: { type: String, required: false },
    baseId: { type: String, required: false },
    quoteId: { type: String, required: false },
    settleId: { type: String, required: false },
    type: { type: String, required: false },
    spot: { type: Boolean, required: false },
    margin: { type: Boolean, required: false },
    swap: { type: Boolean, required: false },
    future: { type: Boolean, required: false },
    option: { type: Boolean, required: false },
    active: { type: Boolean, required: false },
    contract: { type: Boolean, required: false },
    linear: { type: Boolean, required: false },
    inverse: { type: Boolean, required: false },
    taker: { type: Number, required: false },
    maker: { type: Number, required: false },
    contractSize: { type: Number, required: false },
    expiry: { type: String, required: false },
    expiryDatetime: { type: Date, required: false },
    strike: { type: Number, required: false },
    optionType: { type: String, required: false },
    precision: {
        amount: { type: Number, required: false },
        price: { type: Number, required: false },
        base: { type: Number, required: false },
        quote: { type: Number, required: false },
    },
    limits: {
        leverage: { type: Object, required: false },
        amount: { type: Object, required: false },
        price: { type: Object, required: false },
        cost: { type: Object, required: false },
        market: { type: Object, required: false },
    },
    info: { type: Object, required: false }
});

const binanceMarketModel = conn.model('Binancemarket', binanceMarketSchema);

module.exports = binanceMarketModel;