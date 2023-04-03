
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const tradingviewSchema = new Schema({
    strategyName: {
        type: String,
        required: true
    },
    pair: {
        type: String,
        required: true
    },
    chartTimeframe: {
        type: String,
        required: true
    },
    side: {
        type: String,
        required: true,

        // BOTH side is strategy that opens long and short position at the same time
        enum: ['LONG', 'SHORT', 'BOTH']
    },
    entry: {
        type: String,
        required: true
    },
    targets: {
        type: Object,
        required: false
    },
    stop: {
        type: String,
        required: false
    },
    sigalTradeType: {
        type: String,
        required: true,

        // INDICATOR is signal trade type that depends on indicator to open and close position
        // TARGET is signal trade type that sets the target to close position and set stop loss to protect position
        enum: ['INDICATOR', 'TARGET']
    },
    signalTradeDate: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const tradingviewModel = conn.model('Tradingview', tradingviewSchema);

module.exports = tradingviewModel;