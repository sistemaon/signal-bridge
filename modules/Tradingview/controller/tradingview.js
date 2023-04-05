
const Tradingview = require('../model/tradingview');

const createSignal = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, targets, stop, signalTradeType } = req.body;

        const tradingviewNewSignal = new Tradingview({
            strategyName,
            pair,
            chartTimeframe,
            side,
            entry,
            targets,
            stop,
            signalTradeType
        });

        const tradingviewSignal = await tradingviewNewSignal.save();

        return res.status(201).json({ data: req.body, signal: tradingviewSignal });

    } catch (error) {
        return res.status(500).json({ error: error });
    }
};

const tradingviewController = {
    createSignal
};

module.exports = tradingviewController;