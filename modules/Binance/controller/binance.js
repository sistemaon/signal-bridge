
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Market = require('../model/market');
const Tradingview = require('../../Tradingview/model/tradingview');

const { saveExecutedUserOrder, fetchUserOrders } = require('./order');

const prepareRequestsBinanceExchange = async (users, symbol) => {
    const defaultOptions = {
        defaultType: process.env.DEFAULT_TYPE_OPTION_BINANCE,
        timeout: process.env.TIMEOUT_OPTION_BINANCE,
        verbose: process.env.VERBOSE_OPTION_BINANCE,
        reconnect: process.env.RECONNECT_OPTION_BINANCE
    };
    try {
        const promises = users.map(async user => {
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

const executeBinanceOrder = async (exchange, symbol, type, side, amount) => {
    try {
        if (!exchange || !symbol || !type || !side || !amount) {
            console.error('Missing parameters.');
            return 'Missing parameters.';
        }
        if (typeof exchange !== 'object' || Array.isArray(exchange)) {
            console.error('Invalid exchange object.');
            return 'Invalid exchange object.';
        }
        if (typeof symbol !== 'string') {
            console.error('Invalid parameter: symbol must be a string.');
            return 'Invalid parameter: symbol must be a string.';
        }
        if (typeof type !== 'string' || (type !== 'market')) {
            console.error('Invalid parameter: type must be a string.');
            return 'Invalid parameter: type must be a string.';
        }
        if (typeof side !== 'string' || (side !== 'buy' && side !== 'sell')) {
            console.error('Invalid parameter: side must be a string.');
            return 'Invalid parameter: side must be a string.';
        }
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            console.error('Invalid parameter: amount must be a number.');
            return 'Invalid parameter: amount must be a number.';
        }

        const userLastPositionSymbol = await exchange.fetchAccountPositions([symbol]);
        if (!userLastPositionSymbol || !Array.isArray(userLastPositionSymbol) || userLastPositionSymbol.length === 0) {
            console.error('Unable to fetch user last position account or position account not found.');
            return 'Unable to fetch user last position account or position account not found.';
        }

        const positionAmount = Math.abs(Number(userLastPositionSymbol[0].info['positionAmt']));
        if (typeof positionAmount !== 'number' || isNaN(positionAmount) || positionAmount < 0) {
            console.error(`Invalid position amount: ${positionAmount}`);
            return `Invalid position amount: ${positionAmount}`;
        }

        if (positionAmount === 0) {
            const order = await exchange.createOrder(symbol, type, side, amount);
            order.user = exchange.userBotDb;
            return order;
        }

        const positionSide = userLastPositionSymbol[0]['side'];
        if (typeof positionSide !== 'string' || (positionSide !== 'long' && positionSide !== 'short')) {
            console.error(`Invalid position side: ${positionSide}`);
            return `Invalid position side: ${positionSide}`;
        }

        if (side === 'buy' && positionSide === 'long') {
            return `Long/Buy position on ${symbol} already exists.`;
        }
        if (side === 'sell' && positionSide === 'short') {
            return `Short/Sell position on ${symbol} already exists.`;
        }
        if (positionSide === 'long' && side === 'sell') {
            const order = await exchange.createOrder(symbol, type, side, positionAmount);
            order.user = exchange.userBotDb;
            return order;
        }
        if (positionSide === 'short' && side === 'buy') {
            const order = await exchange.createOrder(symbol, type, side, positionAmount);
            order.user = exchange.userBotDb;
            return order;
        }

        console.error(`Unable to execute order for exchange: ${exchange.userBotDb.username}`);
        return `Unable to execute order for exchange: ${exchange.userBotDb.username}`;
    } catch (error) {
        console.error(error);
        return error;
    }
};

const pairReplaceCache = {};
const verifyToOpenOrders = async (exchanges, entry, decimalPlaces, minQuantityInCoinsEntry, pair, side) => {
    if (!exchanges || !Array.isArray(exchanges) || exchanges.length === 0) {
        console.error('Invalid exchanges parameter.');
        return null;
    }
    if (typeof entry !== 'number' || isNaN(entry) || entry <= 0) {
        console.error('Invalid entry parameter.');
        return null;
    }
    if (typeof decimalPlaces !== 'number' || isNaN(decimalPlaces) || decimalPlaces < 0) {
        console.error('Invalid decimalPlaces parameter.');
        return null;
    }
    if (typeof minQuantityInCoinsEntry !== 'number' || isNaN(minQuantityInCoinsEntry) || minQuantityInCoinsEntry < 0) {
        console.error('Invalid minQuantityInCoinsEntry parameter.');
        return null;
    }
    if (typeof pair !== 'string') {
        console.error('Invalid pair parameter.');
        return null;
    }
    if (typeof side !== 'string') {
        console.error('Invalid side parameter.');
        return null;
    }

    const orders = await Promise.all(
        exchanges.map(async (exchange) => {
            const balance = await exchange.fetchBalance();

            if (!balance || typeof balance.free.USDT !== 'number' || balance.free.USDT <= 0 ) {
                console.error(`Invalid balance for user: ${exchange.userBotDb.username}.`);
                return null;
            }

            const freeBalance = balance.free.USDT;
            const percentageToOpenOrder = 0.03;
            const freeBalancePercentageToOpenOrderInFiat = Math.trunc(freeBalance * percentageToOpenOrder);
            const amountBalanceQuantityInCoins = freeBalancePercentageToOpenOrderInFiat / entry;
            const factor = 10 ** decimalPlaces;
            const amountBalanceQuantityInCoinsEntry = Math.floor(amountBalanceQuantityInCoins * factor) / factor;

            if (amountBalanceQuantityInCoinsEntry < minQuantityInCoinsEntry) {
                console.error(`Insufficient balance for user: ${exchange.userBotDb.username}. Minimum quantity required to open order is: ${minQuantityInCoinsEntry}. User balance quantity is: ${amountBalanceQuantityInCoinsEntry}.`);
                return null;
            }

            try {
                const createMarketOrder = await executeBinanceOrder(exchange, pair, 'market', side, amountBalanceQuantityInCoinsEntry);
                if (createMarketOrder && createMarketOrder.info && createMarketOrder.user && createMarketOrder.user.userId) {
                    return createMarketOrder;
                } else {
                    return null;
                }
            } catch (error) {
                console.error(error);
                return null;
            }
        })
    );
    return orders;
};

createOrderSignalIndicator = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, signalTradeType } = req.body;

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) {
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }

        if (!pairReplaceCache[pair]) {
            pairReplaceCache[pair] = pair.replace('/', '');
        }

        const marketSymbol = await Market.findOne({ id: pairReplaceCache[pair] });
        if (!marketSymbol) {
            console.error(`Market symbol ${pair} not found.`);
            return res.status(400).json({ message: `Market symbol params needed is not found.` });
        }

        const minNotional = marketSymbol.limits.cost.min;
        const decimalPlaces = marketSymbol.precision.amount;
        const lotSize = marketSymbol.info.filters.find(filter => filter.filterType === 'LOT_SIZE');
        const minOrderSize = Number(lotSize.minQty);
        const minQuantityInCoins = minNotional / entry;
        const minQuantityInCoinsCeil = Math.ceil(minQuantityInCoins / minOrderSize) * minOrderSize;
        const minQuantityInCoinsEntry = Number(minQuantityInCoinsCeil.toFixed(decimalPlaces));
        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users, pair);
        const orders = await verifyToOpenOrders(exchanges, entry, decimalPlaces, minQuantityInCoinsEntry, pair, side);
        const signal = new Tradingview({
            strategyName: strategyName,
            pair: pair,
            chartTimeframe: chartTimeframe,
            side: side,
            entry: entry,
            signalTradeType: signalTradeType
        });
        const usersOrdersIds = [];

        if (orders) {
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                try {
                    if (!order) {
                        continue;
                    }
                    if (order.info && order.id && order.user && order.user.userId) {
                        const saveUserOder = await saveExecutedUserOrder(order, order.user, signal);
                        usersOrdersIds.push(saveUserOder._id);
                    }
                } catch (error) {
                    console.error(error);
                    return error;
                }
            }
        }

        signal.orders = usersOrdersIds;
        const savedSignal = await signal.save();

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