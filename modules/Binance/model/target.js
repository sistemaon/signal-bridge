
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const binanceTargetOrderSchema = new Schema({
    orderId: {
        type: String,
        required: false
    },
    symbol: {
        type: String,
        required: false
    },
    status: {
        type: String,
        required: false
    },
    clientOrderId: {
        type: String,
        required: false
    },
    price: {
        type: String,
        required: false
    },
    avgPrice: {
        type: String,
        required: false
    },
    origQty: {
        type: String,
        required: false
    },
    executedQty: {
        type: String,
        required: false
    },
    cumQty: {
        type: String,
        required: false
    },
    cumQuote: {
        type: String,
        required: false
    },
    timeInForce: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: false
    },
    reduceOnly: {
        type: Boolean,
        required: false
    },
    closePosition: {
        type: Boolean,
        required: false
    },
    side: {
        type: String,
        required: false
    },
    positionSide: {
        type: String,
        required: false
    },
    stopPrice: {
        type: String,
        required: false
    },
    workingType: {
        type: String,
        required: false
    },
    priceProtect: {
        type: Boolean,
        required: false
    },
    origType: {
        type: String,
        required: false
    },
    updateTime: {
        type: String,
        required: false
    },
    order: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const binanceOrderModel = conn.model('Binancetargetorder', binanceTargetOrderSchema);

module.exports = binanceOrderModel;