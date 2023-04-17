
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const binanceOrderSchema = new Schema({
    info: {
        type: Object,
        required: true
    },
    id: {
        type: String,
        required: false
    },
    clientOrderId: {
        type: String,
        required: false
    },
    timestamp: {
        type: String,
        required: false
    },
    datetime: {
        type: String,
        required: false
    },
    lastTradeTimestamp: {
        type: String,
        required: false
    },
    symbol: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: false
    },
    timeInForce: {
        type: String,
        required: false
    },
    postOnly: {
        type: Boolean,
        required: false
    },
    reduceOnly: {
        type: Boolean,
        required: false
    },
    side: {
        type: String,
        required: false
    },
    price: {
        type: Number,
        required: false
    },
    triggerPrice: {
        type: Number,
        required: false
    },
    amount: {
        type: Number,
        required: false
    },
    cost: {
        type: Number,
        required: false
    },
    average: {
        type: Number,
        required: false
    },
    filled: {
        type: Number,
        required: false
    },
    remaining: {
        type: Number,
        required: false
    },
    status: {
        type: String,
        required: false
    },
    fee: {
        type: Object,
        required: false
    },
    trades: {
        type: Array,
        required: false
    },
    fees: {
        type: Array,
        required: false
    },
    stopPrice: {
        type: Number,
        required: false
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    signal: {
        type: Schema.Types.ObjectId,
        ref: 'Tradingview',
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const binanceOrderModel = conn.model('Binanceorder', binanceOrderSchema);

module.exports = binanceOrderModel;