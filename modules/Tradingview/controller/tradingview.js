
const tradingview = require('../model/tradingview');

const createSignal = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, targets, stop, signalTradeType } = req.body;
        console.log("🚀 ~ file: tradingview.js:7 ~ createSignal ~ req.body:", req.body);

        const newSignal = new tradingview({
            strategyName,
            pair,
            chartTimeframe,
            side,
            entry,
            targets,
            stop,
            signalTradeType
        });

        const savedSignal = await newSignal.save();

        return res.status(201).json({ savedSignal });

    } catch (error) {
        console.log("🚀 ~ file: tradingview.js: ~ createSignal ~ error:", error);
        return res.status(500).json({ error: error });
    }
};

const tradingviewController = {
    createSignal
};

module.exports = tradingviewController;