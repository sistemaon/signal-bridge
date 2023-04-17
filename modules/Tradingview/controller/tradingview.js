
const Tradingview = require('../model/tradingview');


const createIndicatorSignal = async (signalInfo, orders) => {
    try {
        const newSignal = new Tradingview({
            strategyName: signalInfo.strategyName,
            pair: signalInfo.pair,
            chartTimeframe: signalInfo.chartTimeframe,
            side: signalInfo.side,
            entry: signalInfo.entry,
            signalTradeType: 'INDICATOR',
            orders: orders ? orders : []
        });
        return await newSignal.save();
    } catch (error) {
        console.error(error);
        return error;
    }
};

const tradingviewController = {
    createIndicatorSignal
};

module.exports = tradingviewController;