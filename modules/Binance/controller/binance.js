
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Market = require('../model/market');

const { createIndicatorSignal } = require('../../Tradingview/controller/tradingview');
const { saveExecutedOrder } = require('./order');

const prepareRequestsBinanceExchange = async (users) => {
    try {
        const promises = users.map(async user => {
            const defaultOptions = {
                defaultType: process.env.DEFAULT_TYPE_OPTION_BINANCE,
                timeout: process.env.TIMEOUT_OPTION_BINANCE,
                verbose: process.env.VERBOSE_OPTION_BINANCE,
                reconnect: process.env.RECONNECT_OPTION_BINANCE
            };
            const binance = new ccxt.binance({
                apiKey: user.exchange.binance.apiKey,
                secret: user.exchange.binance.apiSecret,
                enableRateLimit: process.env.ENABLE_RATE_LIMIT_OPTION_BINANCE,
                options: defaultOptions
            });
            binance.userBotDb = { userId: user._id, username: user.username };
            return binance;
        });
        const responses = await Promise.all(promises);
        return responses;
    } catch (error) {
        console.error({ error });
        throw new Error('Failed to prepare requests for Binance exchange.');
    }
};

const executeBinanceOrder = async (symbol, type, side, amount) => {
    try {
        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users);
        const orders = await Promise.all(
            exchanges.map(async (exchange) => {

                const user = exchange.userBotDb;
                const userLastPositionSymbol = await exchange.fetchAccountPositions([symbol]);
                const positionAmount = Math.abs(Number(userLastPositionSymbol[0].info['positionAmt']));

                if (positionAmount === 0) {
                    const order = await exchange.createOrder(symbol, type, side, amount);
                    const saveUserOder = await saveExecutedOrder(order, user);
                    return { order, saveUserOder };
                }

                const positionSide = userLastPositionSymbol[0]['side'];

                if (side === 'buy' && positionSide === 'long') {
                    return `Long/Buy position on ${symbol} already exists.`;
                }
                if (side === 'sell' && positionSide === 'short') {
                    return `Short/Sell position on ${symbol} already exists.`;
                }
                if (positionSide === 'long' && side === 'sell') {
                    const order = await exchange.createOrder(symbol, type, side, positionAmount);
                    const saveUserOder = await saveExecutedOrder(order, user);
                    return { order, saveUserOder };
                }
                if (positionSide === 'short' && side === 'buy') {
                    const order = await exchange.createOrder(symbol, type, side, positionAmount);
                    const saveUserOder = await saveExecutedOrder(order, user);
                    return { order, saveUserOder };
                }
            })
        );
        return orders;
    } catch (error) {
        console.error(error);
        return error;
    }
};


createOrderSignalIndicator = async (req, res, next) => {
    try {

        const { strategyName, pair, chartTimeframe, side, entry, signalTradeType } = req.body;

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) {
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }

        const marketSymbol = await Market.findOne({ id: pair.replace('/', '') });
        if (!marketSymbol || !marketSymbol.limits.cost.min || !marketSymbol.precision.amount) {
            console.error(`Market symbol ${pair} not found.`);
            return res.status(400).json({ message: `Market symbol params needed is not found.` });
        }

        // TODO: Check if the user has enough balance to open the order minimum notional value
        // minNotional / current price = amount in coins (to open order) --
        // amount in coins * current price = amount in USDT (to open order) --
        // TODO: Check if the user has enough balance to open the order minimum notional value

        // Get the minimum notional value
        const minNotional = marketSymbol.limits.cost.min;
        const decimalPlaces = marketSymbol.precision.amount;

        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users);

        const verifyToOpenOrders = exchanges.map(async (exchange) => {
            const user = exchange.userBotDb;
            const balance = await exchange.fetchBalance();
            const freeBalance = balance.free.USDT;
            const percentageToOpenOrder = 0.03;
            const balanceToOpenOrder = Math.trunc(freeBalance * percentageToOpenOrder);

            if (balanceToOpenOrder < minNotional) {
                console.error(`Insufficient balance for user with API key ${exchange.apiKey}`);
                return null;
            }

            const amountBalanceToOpenOrder = balanceToOpenOrder / entry;
            const factor = 10 ** decimalPlaces;
            const amountToOpenOrder = 0.003 // Math.trunc(amountBalanceToOpenOrder * factor) / factor;

            // NOTE: DONE CREATE AND SAVE ORDER
            try {
                const createMarketOrder = await executeBinanceOrder(pair, 'market', side, amountToOpenOrder);
                console.log("🚀 ~ file: binance.js:168 ~ verifyToOpenOrders ~ createMarketOrder:", createMarketOrder);
                return createMarketOrder;
            } catch (error) {
                console.error(error);
                return null;
            }
            // NOTE: DONE CREATE AND SAVE ORDER
        });

        const orders = await Promise.all(verifyToOpenOrders);

        // TODO:
        // TO RELATION SIGNAL TO USER ORDER IF POSITION IS OPENED
        let usersOrdersIds = [];
        if (orders[0]) {
            console.log("🚀 ~ file: binance.js:145 ~ createOrderSignalIndicator= ~ orders[0]:", {or: orders[0]})
            console.error('Failed to save signal.');
            usersOrdersIds = orders[0].map(order => order.saveUserOder._id);
            console.log("🚀 ~ file: binance.js:148 ~ createOrderSignalIndicator= ~ usersOrdersIds:", usersOrdersIds);
        }
        const savedSignal = await createIndicatorSignal(req.body, usersOrdersIds);

        return res.status(201).json({ orders: orders[0], savedSignal: savedSignal });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error });
    }
};


const binanceController = {
    createOrderSignalIndicator
};

module.exports = binanceController;