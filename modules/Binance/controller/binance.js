
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Market = require('../model/market');
const Tradingview = require('../../Tradingview/model/tradingview');

// const { createIndicatorSignal } = require('../../Tradingview/controller/tradingview');
const { saveExecutedUserOrder, fetchUserOrders } = require('./order');

const prepareRequestsBinanceExchange = async (users, symbol) => {
    console.log("🚀 ~ file: binance.js:12 ~ prepareRequestsBinanceExchange ~ symbol:", symbol)
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
            await binance.setLeverage(process.env.LEVERAGE_OPTION_BINANCE, symbol);
            await binance.setMarginMode(process.env.MARGIN_MODE_OPTION_BINANCE, symbol);
            return binance;
        });
        const responses = await Promise.all(promises);
        return responses;
    } catch (error) {
        console.error({ error });
        throw new Error('Failed to prepare requests for Binance exchange.');
    }
};

// TODO:
// REFACT TO REMOVE PREPARE REQUESTS BINANCE EXCHANGE, BECAUSE IT WILL BE PASSED AS PARAMETER
// ( const executeBinanceOrder = async (exchange, symbol, type, side, amount) )
const executeBinanceOrder = async (exchange, symbol, type, side, amount) => {
    try {
        const userLastPositionSymbol = await exchange.fetchAccountPositions([symbol]);
        const positionAmount = Math.abs(Number(userLastPositionSymbol[0].info['positionAmt']));

        if (positionAmount === 0) {
            const order = await exchange.createOrder(symbol, type, side, amount);
            console.log("🚀 ~ file: binance.js:49 ~ exchanges.map ~ order:", order)
            order.user = exchange.userBotDb;
            // userOrders.push(order);
            return order;
        }

        const positionSide = userLastPositionSymbol[0]['side'];

        if (side === 'buy' && positionSide === 'long') {
            return `Long/Buy position on ${symbol} already exists.`;
            // userOrders.push(`Long/Buy position on ${symbol} already exists.`);
        }
        if (side === 'sell' && positionSide === 'short') {
            return `Short/Sell position on ${symbol} already exists.`;
            // userOrders.push(`Short/Sell position on ${symbol} already exists.`);
        }
        if (positionSide === 'long' && side === 'sell') {
            const order = await exchange.createOrder(symbol, type, side, positionAmount);
            console.log("🚀 ~ file: binance.js:64 ~ exchanges.map ~ order:", order)
            order.user = exchange.userBotDb;
            // userOrders.push(order);
            return order;
        }
        if (positionSide === 'short' && side === 'buy') {
            const order = await exchange.createOrder(symbol, type, side, positionAmount);
            console.log("🚀 ~ file: binance.js:71 ~ exchanges.map ~ order:", order)
            order.user = exchange.userBotDb;
            // userOrders.push(order);
            return order;
        }
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
        const verifyToOpenOrders = async (exchanges) => {
            const orders = [];
            for (const exchange of exchanges) {
                // const user = exchange.userBotDb;
                const balance = await exchange.fetchBalance();
                const freeBalance = balance.free.USDT;
                console.log("🚀 ~ file: binance.js:119 ~ verifyToOpenOrders ~ freeBalance:", freeBalance)
                const percentageToOpenOrder = 0.03;
                const balanceToOpenOrder = Math.trunc(freeBalance * percentageToOpenOrder);
                // if (balanceToOpenOrder < minNotional) {
                //     console.error(`Insufficient balance for user: ${exchange.userBotDb}`);
                //     orders.push(null);
                //     continue;
                // }
                const amountBalanceToOpenOrder = balanceToOpenOrder / entry;
                const factor = 10 ** decimalPlaces;
                const amountToOpenOrder = 0.003 //Math.floor(amountBalanceToOpenOrder * factor) / factor;
                try {
                    const createMarketOrder = await executeBinanceOrder(exchange, pair, 'market', side, amountToOpenOrder);
                    if (createMarketOrder && createMarketOrder.info && createMarketOrder.user && createMarketOrder.user.userId) {
                        console.log("🚀 ~ file: binance.js:134 ~ verifyToOpenOrders ~ createMarketOrder:", createMarketOrder)
                        orders.push(createMarketOrder);
                    } else {
                        orders.push(null);
                    }
                } catch (error) {
                    console.error(error);
                    orders.push(null);
                }
            }
            console.log("🚀 ~ file: binance.js:144 ~ verifyToOpenOrders ~ orders:", orders)
            return orders;
        };

        const exchanges = await prepareRequestsBinanceExchange(users, pair);
        const orders = await verifyToOpenOrders(exchanges);
        console.log("🚀 ~ file: binance.js:149 ~ createOrderSignalIndicator= ~ orders:", orders)
        console.log("🚀 ~ file: binance.js:150 ~ createOrderSignalIndicator= ~ orders:", orders[0])

        const usersOrdersIds = [];
        const signal = new Tradingview({
            strategyName: strategyName,
            pair: pair,
            chartTimeframe: chartTimeframe,
            side: side,
            entry: entry,
            signalTradeType: signalTradeType
        });
        if (orders) {
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                console.log("🚀 ~ file: binance.js:164 ~ createOrderSignalIndicator= ~ order:", order)
                if (order.info && order.id && order.user && order.user.userId) {
                    const saveUserOder = await saveExecutedUserOrder(order, order.user, signal);
                    console.log("🚀 ~ file: binance.js:167 ~ createOrderSignalIndicator= ~ saveUserOder:", saveUserOder)
                    usersOrdersIds.push(saveUserOder._id);
                }
            }
        }
        console.log("🚀 ~ file: binance.js:172 ~ createOrderSignalIndicator= ~ usersOrdersIds:", usersOrdersIds)
        signal.orders = usersOrdersIds;
        const savedSignal = await signal.save();
        console.log("🚀 ~ file: binance.js:176 ~ createOrderSignalIndicator= ~ savedSignal:", savedSignal)

        return res.status(201).json({ orders: orders, savedSignal: savedSignal });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error });
    }
};

const fetchUserBinanceOrders = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const userOrders = await fetchUserOrders(userId);
        if (!userOrders) {
            return res.status(404).json({ message: 'User orders not found.' });
        }
        return res.status(200).json({ userOrders: userOrders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error });
    }
};


const binanceController = {
    createOrderSignalIndicator,
    fetchUserBinanceOrders
};

module.exports = binanceController;