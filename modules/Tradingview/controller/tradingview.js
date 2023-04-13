
const Tradingview = require('../model/tradingview');


const createIndicatorSignal = async (signalInfo) => {
    console.log("🚀 ~ file: tradingview.js:6 ~ createIndicatorSignal ~ signalInfo:", signalInfo)
    try {
        const newSignal = new Tradingview({
            strategyName: signalInfo.strategyName,
            pair: signalInfo.pair,
            chartTimeframe: signalInfo.chartTimeframe,
            side: signalInfo.side,
            entry: signalInfo.entry,
            signalTradeType: 'INDICATOR'
        });
        console.log("🚀 ~ file: tradingview.js:14 ~ createIndicatorSignal ~ newSignal:", newSignal)
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