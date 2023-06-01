
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Market = require('../model/market');
const BinanceOrder = require('../model/order');
const Tradingview = require('../../Tradingview/model/tradingview');

const { saveExecutedUserOrder, fetchUserOrders } = require('./order');
const { saveExecutedTargetUserOrder } = require('./target');

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
            return 'Invalid exchange object type.';
        }
        if (typeof symbol !== 'string') {
            console.error('Invalid parameter type: symbol must be a string.');
            return 'Invalid parameter type: symbol must be a string.';
        }
        if (typeof type !== 'string' || (type !== 'market')) {
            console.error('Invalid parameter type: type must be a string.');
            return 'Invalid parameter type: type must be a string.';
        }
        if (typeof side !== 'string' || (side !== 'buy' && side !== 'sell')) {
            console.error('Invalid parameter type: side must be a string.');
            return 'Invalid parameter type: side must be a string.';
        }
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            console.error('Invalid parameter type: amount must be a number.');
            return 'Invalid parameter type: amount must be a number.';
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
            try {
                const order = await exchange.createOrder(symbol, type, side, amount);
                if (!order) {
                    const message = `Unable to create order for user: ${exchange.userBotDb.username}.`;
                    console.error(message);
                    return message;
                }
                order.user = exchange.userBotDb;
                return order;
            } catch (error) {
                console.error(`Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }

        const positionSide = userLastPositionSymbol[0]['side'];
        if (typeof positionSide !== 'string' || (positionSide !== 'long' && positionSide !== 'short')) {
            console.error(`Invalid position side: ${positionSide}`);
            return `Invalid position side: ${positionSide}`;
        }

        if (positionSide === 'long' && side === 'buy') {
            return `Long/Buy position on ${symbol} already exists.`;
        }
        if (positionSide === 'short' && side === 'sell') {
            return `Short/Sell position on ${symbol} already exists.`;
        }
    
        if (positionSide === 'long' && side === 'sell') {
            try {
                const positionAmountToCreateOppositeDirectionOrder = (positionAmount * 2);
                const order = await exchange.createOrder(symbol, type, side, positionAmountToCreateOppositeDirectionOrder);
                if (!order) {
                    const message = `Unable to create order for user: ${exchange.userBotDb.username}.`;
                    console.error(message);
                    return message;
                }
                order.user = exchange.userBotDb;
                return order;
            } catch (error) {
                console.error(`Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }
    
        if (positionSide === 'short' && side === 'buy') {
            try {
                const positionAmountToCreateOppositeDirectionOrder = (positionAmount * 2);
                const order = await exchange.createOrder(symbol, type, side, positionAmountToCreateOppositeDirectionOrder);
                if (!order) {
                    const message = `Unable to create order for user: ${exchange.userBotDb.username}.`;
                    console.error(message);
                    return message;
                }
                order.user = exchange.userBotDb;
                return order;
            } catch (error) {
                console.error(`Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }

        console.error(`Unable to execute order for user: ${exchange.userBotDb.username}`);
        return `Unable to execute order for user: ${exchange.userBotDb.username}`;
    } catch (error) {
        console.error(error);
        return error;
    }
};

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
            const percentageToOpenOrder = 0.05;
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

const pairReplaceCache = {};
const createOrderSignalIndicator = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, signalTradeType } = req.body;

        console.log("🚀 ~ file: binance.js:215 ~ createOrderSignalIndicator= ~ req.body:", { reqbody: req.body });

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) {
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }
        if (typeof strategyName !== 'string' || typeof pair !== 'string' || typeof chartTimeframe !== 'object' || typeof chartTimeframe.chronoAmount !== 'string' || typeof chartTimeframe.chronoUnit !== 'string' || typeof side !== 'string' || typeof entry !== 'number' || typeof signalTradeType !== 'string') {
            console.error('Invalid parameters types.');
            return res.status(400).json({ message: 'Invalid parameters types.' });
        }
        if (chartTimeframe.chronoUnit !== 'SECOND' && chartTimeframe.chronoUnit !== 'MINUTE' && chartTimeframe.chronoUnit !== 'HOUR' && chartTimeframe.chronoUnit !== 'DAY' && chartTimeframe.chronoUnit !== 'WEEK' && chartTimeframe.chronoUnit !== 'MONTH' && chartTimeframe.chronoUnit !== 'YEAR') {
            console.error(`Invalid parameter for chartTimeframe.chronoUnit: ${chartTimeframe.chronoUnit}.`);
            return res.status(400).json({ message: `Invalid parameter for chartTimeframe.chronoUnit: ${chartTimeframe.chronoUnit}.` });
        }
        if (side !== 'buy' && side !== 'sell' && side !== 'long' && side !== 'short' && side !== 'both') {
            console.error(`Invalid parameter for side: ${side}.`);
            return res.status(400).json({ message: `Invalid parameter for side: ${side}.` });
        }
        if (signalTradeType !== 'INDICATOR' && signalTradeType !== 'TARGET') {
            console.error(`Invalid parameter for signalTradeType: ${signalTradeType}.`);
            return res.status(400).json({ message: `Invalid parameter for signalTradeType: ${signalTradeType}.` });
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
        const decimalPlaces = marketSymbol.precision.price;
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
            for (const order of orders) {
                try {
                    if (!order) {
                        continue;
                    }
                    if (order.info && order.id && order.user && order.user.userId) {
                        const saveUserOrder = await saveExecutedUserOrder(order, order.user, signal);
                        usersOrdersIds.push(saveUserOrder._id);
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






const executeBinanceTargetOrder = async (exchange, symbol, type, side, amount, isPriceProtect, stop, target) => {
    try {
        if (!exchange || !symbol || !type || !side || !amount) {
            console.error('Missing parameters.');
            return 'Missing parameters.';
        }
        if (typeof exchange !== 'object' || Array.isArray(exchange)) {
            console.error('Invalid exchange object.');
            return 'Invalid exchange object type.';
        }
        if (typeof symbol !== 'string') {
            console.error('Invalid parameter type: symbol must be a string.');
            return 'Invalid parameter type: symbol must be a string.';
        }
        if (typeof type !== 'string' || (type !== 'market')) {
            console.error('Invalid parameter type: type must be a string.');
            return 'Invalid parameter type: type must be a string.';
        }
        if (typeof side !== 'string' || (side !== 'buy' && side !== 'sell')) {
            console.error('Invalid parameter type: side must be a string.');
            return 'Invalid parameter type: side must be a string.';
        }
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            console.error('Invalid parameter type: amount must be a number.');
            return 'Invalid parameter type: amount must be a number.';
        }

        const userLastPositionSymbol = await exchange.fetchAccountPositions([symbol]);
        // console.log("🚀 ~ file: binance.js:347 ~ executeBinanceTargetOrder ~ userLastPositionSymbol:", userLastPositionSymbol)
        if (!userLastPositionSymbol || !Array.isArray(userLastPositionSymbol) || userLastPositionSymbol.length === 0) {
            console.error('Unable to fetch user last position account or position account not found.');
            return 'Unable to fetch user last position account or position account not found.';
        }

        const positionAmount = Math.abs(Number(userLastPositionSymbol[0].info['positionAmt']));
        if (typeof positionAmount !== 'number' || isNaN(positionAmount) || positionAmount < 0) {
            console.error(`Invalid position amount: ${positionAmount}`);
            return `Invalid position amount: ${positionAmount}`;
        }

        if (positionAmount === 0 && !isPriceProtect) {
            try {
                if (side === 'buy') {
                    const positions = await exchange.createOrder(symbol, type, side, amount);
                    if (!positions) {
                        const message = `Unable to create positions for user: ${exchange.userBotDb.username}.`;
                        console.error(message);
                        return message;
                    }
                    positions.user = exchange.userBotDb;

                    const stopLossPositions = await exchange.fapiPrivatePostOrder({
                        symbol: pairReplaceCache[symbol],
                        side: 'SELL',
                        type: 'STOP_MARKET',
                        stopPrice: stop,
                        quantity: amount,
                        closePosition: true
                    });
                    console.log("🚀 ~ file: binance.js:384 ~ executeBinanceTargetOrder ~ stopLossPositions:", stopLossPositions)

                    const takeProfitPositions = await exchange.fapiPrivatePostOrder({
                        symbol: pairReplaceCache[symbol],
                        side: 'SELL',
                        type: 'TAKE_PROFIT_MARKET',
                        stopPrice: target,
                        quantity: amount,
                        closePosition: true
                    });
                    console.log("🚀 ~ file: binance.js:396 ~ executeBinanceTargetOrder ~ takeProfitPositions:", takeProfitPositions)

                    return [positions, stopLossPositions, takeProfitPositions];
                }
                if (side === 'sell') {
                    const positions = await exchange.createOrder(symbol, type, side, amount);
                    if (!positions) {
                        const message = `Unable to create positions for user: ${exchange.userBotDb.username}.`;
                        console.error(message);
                        return message;
                    }
                    positions.user = exchange.userBotDb;

                    const stopLossPositions = await exchange.fapiPrivatePostOrder({
                        symbol: pairReplaceCache[symbol],
                        side: 'BUY',
                        type: 'STOP_MARKET',
                        stopPrice: stop,
                        quantity: amount,
                        closePosition: true
                    });
                    console.log("🚀 ~ file: binance.js:419 ~ executeBinanceTargetOrder ~ stopLossPositions:", stopLossPositions)

                    const takeProfitPositions = await exchange.fapiPrivatePostOrder({
                        symbol: pairReplaceCache[symbol],
                        side: 'BUY',
                        type: 'TAKE_PROFIT_MARKET',
                        stopPrice: target,
                        quantity: amount,
                        closePosition: true
                    });
                    console.log("🚀 ~ file: binance.js:431 ~ executeBinanceTargetOrder ~ takeProfitPositions:", takeProfitPositions)

                    return [positions, stopLossPositions, takeProfitPositions];
                }
            } catch (error) {
                console.error(`Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to create order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }

        const positionSide = userLastPositionSymbol[0]['side'];
        console.log("🚀 ~ file: binance.js:377 ~ executeBinanceTargetOrder ~ positionSide:", positionSide)
        if (typeof positionSide !== 'string' || (positionSide !== 'long' && positionSide !== 'short')) {
            console.error(`Invalid position side: ${positionSide}`);
            return `Invalid position side: ${positionSide}`;
        }

        // if (positionSide === 'long' && side === 'buy') {
        //     return `Long/Buy position on ${symbol} already exists.`;
        // }
        // if (positionSide === 'short' && side === 'sell') {
        //     return `Short/Sell position on ${symbol} already exists.`;
        // }

        // positionSide === 'long' &&
        side = 'buy';
        if ( side === 'buy') {
            try {
                // Find last order for user
                const lastOrder = await BinanceOrder.findOne({ 'info.symbol': pairReplaceCache[symbol], user: exchange.userBotDb.userId }).sort({ createdAt: -1 })
                console.log("🚀 ~ file: binance.js:394 ~ executeBinanceTargetOrder ~ lastOrder:", lastOrder)

                const openOrders = await exchange.fetchOpenOrders(pairReplaceCache[symbol])
                console.log("🚀 ~ file: binance.js:472 ~ executeBinanceTargetOrder ~ openOrders:", openOrders)

                return null;

                if (openOrders) {
                    for (const openOrder of openOrders) {
                        try {
                            if (!openOrder) {
                                continue;
                            }
                            if (openOrder) {
                                console.log("🚀 ~ file: binance.js:481 ~ executeBinanceTargetOrder ~ openOrder:", openOrder)
                                const cancelOrder = await exchange.cancelOrder(openOrder.id, pairReplaceCache[symbol])
                                console.log("🚀 ~ file: binance.js:482 ~ executeBinanceTargetOrder ~ cancelOrder:", cancelOrder)
                                // const saveUserOrder = await saveExecutedUserOrder(openOrder, openOrder.user, signal);
                                // usersOrdersIds.push(saveUserOrder._id);
                            }
                        } catch (error) {
                            console.error(error);
                            return error;
                        }
                    }
                }

                // Create a stop loss order
                const stopLossPositions = await exchange.fapiPrivatePostOrder({
                    symbol: pairReplaceCache[symbol],
                    side: 'BUY',
                    type: 'STOP_MARKET', // STOP_MARKET
                    stopPrice: stop, // stop
                    quantity: lastOrder.amount, // Set to 0 for the entire position
                    closePosition: true,
                    // reduceOnly: true,
                });
                console.log("🚀 ~ file: binance.js:421 ~ executeBinanceTargetOrder ~ stopLossPositions:", stopLossPositions)

                // Create a take profit order
                const takeProfitPositions = await exchange.fapiPrivatePostOrder({
                    symbol: pairReplaceCache[symbol],
                    side: 'BUY',
                    type: 'TAKE_PROFIT_MARKET', // TAKE_PROFIT_MARKET
                    stopPrice: target, // target
                    quantity: lastOrder.amount, // Set to 0 for the entire position
                    closePosition: true,
                    // reduceOnly: true,
                });
                console.log("🚀 ~ file: binance.js:431 ~ executeBinanceTargetOrder ~ takeProfitPositions:", takeProfitPositions)
                return null;

                // const orderId = lastOrder.id; // ID of the last order fetched from user's exchange info
                // const symbol = lastOrder.info.symbol; // Symbol of the last order
                // const type = 'MARKET'; // Set order type as market
                // const side = 'BUY'; // Side of the order (buy)
                // const amount = lastOrder.info.origQty; // Use the original quantity from the last order
                // const price = undefined; // Not required for market orders
                // const params = {
                // stopPrice: updatedStopLoss,
                // takeProfitPrice: updatedTakeProfit,
                // };
                // const updatedOrder = await binance.editOrder(orderId, symbol, type, side, amount, price, params);

                // edit update stop loss and take profit
                // const updatedOrder = await binance.editOrder(order.id, symbol, 'MARKET', order.side, order.amount, undefined, {
                //     stopPrice: stopLossPrice,
                //     takeProfitPrice: takeProfitPrice,
                //   });


                // const positionAmountToCreateOppositeDirectionOrder = (positionAmount * 2);
                // const order = await exchange.createOrder(symbol, type, side, positionAmountToCreateOppositeDirectionOrder);
                // if (!order) {
                //     const message = `Unable to update stop loss and take profit order for user: ${exchange.userBotDb.username}.`;
                //     console.error(message);
                //     return message;
                // }
                // order.user = exchange.userBotDb;
                // return order;
            } catch (error) {
                console.error(`Unable to update stop loss and take profit order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to update stop loss and take profit order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }
        
        // positionSide === 'short' &&
        if ( side === 'sell') {
            try {
                console.log("🚀 ~ file: binance.js:441 ~ executeBinanceTargetOrder ~ isPriceProtect:", isPriceProtect)

                // Find last order for user
                console.log("🚀 ~ file: binance.js:446 ~ executeBinanceTargetOrder ~ symbol:", symbol)
                const lastOrder = await BinanceOrder.findOne({ 'info.symbol': pairReplaceCache[symbol], user: exchange.userBotDb.userId })
                .sort({ createdAt: -1 })
                //
                console.log("🚀 ~ file: binance.js:445 ~ executeBinanceTargetOrder ~ exchange.userBotDb.userId:", exchange.userBotDb.userId)
                // console.log("🚀 ~ file: binance.js:456 ~ executeBinanceTargetOrder ~ exchange:", exchange)
                console.log("🚀 ~ file: binance.js:438 ~ executeBinanceTargetOrder ~ lastOrder:", lastOrder)
                // const updateOrder = await exchange.createOrder(lastOrder.info.symbol, 'LIMIT', 'buy', lastOrder.amount, 0.22);
                // console.log("🚀 ~ file: binance.js:458 ~ executeBinanceTargetOrder ~ updateOrder:", updateOrder)
                // const updatedPosition = await exchange.fapiPrivatePostPositionMargin({
                //     symbol: pairReplaceCache[symbol],
                //     stopLoss: 0.22,
                //     takeProfit: 0.19,
                // });
                // console.log("🚀 ~ file: binance.js:457 ~ executeBinanceTargetOrder ~ updatedPosition:", updatedPosition)
                // const updatedOrder = await exchange.editOrder(lastOrder.id, lastOrder.info.symbol, 'MARKET', 'SELL', 0, undefined, {'stopLossPrice': 0.22, 'takeProfitPrice': 0.19 });
                // console.log("🚀 ~ file: binance.js:465 ~ executeBinanceTargetOrder ~ updatedOrder:", updatedOrder)
                return null;

                // const orderId = lastOrder.id; // ID of the last order fetched from user's exchange info
                // const symbol = lastOrder.info.symbol; // Symbol of the last order
                // const type = 'MARKET'; // Set order type as market
                // const side = 'BUY'; // Side of the order (buy)
                // const amount = lastOrder.info.origQty; // Use the original quantity from the last order
                // const price = undefined; // Not required for market orders
                // const params = {
                // stopPrice: updatedStopLoss,
                // takeProfitPrice: updatedTakeProfit,
                // };
                // const updatedOrder = await binance.editOrder(orderId, symbol, type, side, amount, price, params);

                // edit update stop loss and take profit
                // const updatedOrder = await binance.editOrder(order.id, symbol, 'MARKET', order.side, order.amount, undefined, {
                //     stopPrice: stopLossPrice,
                //     takeProfitPrice: takeProfitPrice,
                //   });
                
                // const positionAmountToCreateOppositeDirectionOrder = (positionAmount * 2);
                // const order = await exchange.createOrder(symbol, type, side, positionAmountToCreateOppositeDirectionOrder);
                // if (!order) {
                //     const message = `Unable to update stop loss and take profit order for user: ${exchange.userBotDb.username}.`;
                //     console.error(message);
                //     return message;
                // }
                // order.user = exchange.userBotDb;
                // return order;
            } catch (error) {
                console.error(`Unable to update stop loss and take profit order for user ${exchange.userBotDb.username}: ${error.message}`);
                return `Unable to update stop loss and take profit order for user ${exchange.userBotDb.username}: ${error.message}`;
            }
        }

        console.error(`Unable to execute order for user: ${exchange.userBotDb.username}`);
        return `Unable to execute order for user: ${exchange.userBotDb.username}`;
    } catch (error) {
        console.error(error);
        return error;
    }
};
const verifyToOpenTargetOrders = async (exchanges, entry, decimalPlaces, minQuantityInCoinsEntry, pair, side, isPriceProtect, stop, target) => { // stop, target
    console.log("🚀 ~ file: binance.js:547 ~ verifyToOpenTargetOrders ~ stop:  ", stop)
    console.log("🚀 ~ file: binance.js:544 ~ verifyToOpenTargetOrders ~ target:  ", target)
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
            const percentageToOpenOrder = 0.01;
            const freeBalancePercentageToOpenOrderInFiat = Math.trunc(freeBalance * percentageToOpenOrder);
            const amountBalanceQuantityInCoins = freeBalancePercentageToOpenOrderInFiat / entry;
            const factor = 10 ** decimalPlaces;
            const amountBalanceQuantityInCoinsEntry = Math.floor(amountBalanceQuantityInCoins * factor) / factor;

            if (amountBalanceQuantityInCoinsEntry < minQuantityInCoinsEntry) {
                console.error(`Insufficient balance for user: ${exchange.userBotDb.username}. Minimum quantity required to open order is: ${minQuantityInCoinsEntry}. User balance quantity is: ${amountBalanceQuantityInCoinsEntry}.`);
                return null;
            }

            try {
                const createMarketPositions = await executeBinanceTargetOrder(exchange, pair, 'market', side, amountBalanceQuantityInCoinsEntry, isPriceProtect, stop, target);
                // console.log("🚀 ~ file: binance.js:597 ~ exchanges.map ~ stop, target:", stop, target)
                // console.log("🚀 ~ file: binance.js:514 ~ exchanges.map ~ createMarketPositions:", createMarketPositions)
                return createMarketPositions;

                //////////////////////////////////
                // const marketPosition = createMarketPositions.find(position => position.type === 'market');
                // console.log("🚀 ~ file: binance.js:669 ~ exchanges.map ~ marketPosition:", marketPosition)
                // if (marketPosition && marketPosition.info && marketPosition.user && marketPosition.user.userId) {
                //     return createMarketPositions;
                // } else {
                //     return null;
                // }
                //////////////////////////////////

            } catch (error) {
                console.error(error);
                return null;
            }
        })
    );
    return orders;
};
const createOrderTargetIndicator = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, signalTradeType, isPriceProtect, stop, target } = req.body;
        console.log("🚀 ~ file: binance.js:215 ~ createOrderSignalIndicator= ~ req.body:", { reqbody: req.body });

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) { // !stop || !target
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }
        if (typeof strategyName !== 'string' || typeof pair !== 'string' || typeof chartTimeframe !== 'object' || typeof chartTimeframe.chronoAmount !== 'string' || typeof chartTimeframe.chronoUnit !== 'string' || typeof side !== 'string' || typeof entry !== 'number' || typeof signalTradeType !== 'string') {
            console.error('Invalid parameters types.');
            return res.status(400).json({ message: 'Invalid parameters types.' });
        }
        if (chartTimeframe.chronoUnit !== 'SECOND' && chartTimeframe.chronoUnit !== 'MINUTE' && chartTimeframe.chronoUnit !== 'HOUR' && chartTimeframe.chronoUnit !== 'DAY' && chartTimeframe.chronoUnit !== 'WEEK' && chartTimeframe.chronoUnit !== 'MONTH' && chartTimeframe.chronoUnit !== 'YEAR') {
            console.error(`Invalid parameter for chartTimeframe.chronoUnit: ${chartTimeframe.chronoUnit}.`);
            return res.status(400).json({ message: `Invalid parameter for chartTimeframe.chronoUnit: ${chartTimeframe.chronoUnit}.` });
        }
        if (side !== 'buy' && side !== 'sell' && side !== 'long' && side !== 'short' && side !== 'both') {
            console.error(`Invalid parameter for side: ${side}.`);
            return res.status(400).json({ message: `Invalid parameter for side: ${side}.` });
        }
        if (signalTradeType !== 'INDICATOR' && signalTradeType !== 'TARGET') {
            console.error(`Invalid parameter for signalTradeType: ${signalTradeType}.`);
            return res.status(400).json({ message: `Invalid parameter for signalTradeType: ${signalTradeType}.` });
        }

        if (!pairReplaceCache[pair]) {
            pairReplaceCache[pair] = pair.replace('/', '');
        }
        // console.log("🚀 ~ file: binance.js:359 ~ createOrderTargetIndicator ~ pairReplaceCache[pair]:", pairReplaceCache[pair])
        const marketSymbol = await Market.findOne({ id: pairReplaceCache[pair] });
        // console.log("🚀 ~ file: binance.js:361 ~ createOrderTargetIndicator ~ marketSymbol:", marketSymbol)
        if (!marketSymbol) {
            console.error(`Market symbol ${pair} not found.`);
            return res.status(400).json({ message: `Market symbol params needed is not found.` });
        }

        const minNotional = marketSymbol.limits.cost.min;
        // console.log("🚀 ~ file: binance.js:368 ~ createOrderTargetIndicator ~ minNotional:", minNotional)
        const decimalPlaces = marketSymbol.precision.price;
        // console.log("🚀 ~ file: binance.js:370 ~ createOrderTargetIndicator ~ decimalPlaces:", decimalPlaces)
        const lotSize = marketSymbol.info.filters.find(filter => filter.filterType === 'LOT_SIZE');
        // console.log("🚀 ~ file: binance.js:372 ~ createOrderTargetIndicator ~ lotSize:", lotSize)
        const minOrderSize = Number(lotSize.minQty);
        // console.log("🚀 ~ file: binance.js:374 ~ createOrderTargetIndicator ~ minOrderSize:", minOrderSize)
        const minQuantityInCoins = minNotional / entry;
        // console.log("🚀 ~ file: binance.js:376 ~ createOrderTargetIndicator ~ minQuantityInCoins:", minQuantityInCoins)
        const minQuantityInCoinsCeil = Math.ceil(minQuantityInCoins / minOrderSize) * minOrderSize;
        // console.log("🚀 ~ file: binance.js:378 ~ createOrderTargetIndicator ~ minQuantityInCoinsCeil:", minQuantityInCoinsCeil)
        const minQuantityInCoinsEntry = Number(minQuantityInCoinsCeil.toFixed(decimalPlaces));
        // console.log("🚀 ~ file: binance.js:380 ~ createOrderTargetIndicator ~ minQuantityInCoinsEntry:", minQuantityInCoinsEntry)

        let stopLoss = 0
        if (stop) {
            stopLoss = Number(stop.toFixed(decimalPlaces));
        }
        let takeProfit = 0
        if (target) {
            takeProfit = Number(target.toFixed(decimalPlaces));
        }

        const users = await User.find({ username: 'suun' });
        // console.log("🚀 ~ file: binance.js:382 ~ createOrderTargetIndicator ~ users:", users);
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'Users not found.' });
        }

        const exchanges = await prepareRequestsBinanceExchange(users, pair);
        if (!exchanges || exchanges.length === 0) {
            return res.status(404).json({ message: 'Exchanges not found.' });
        }

        // return res.status(201).json('OK');

        const positions = await verifyToOpenTargetOrders(exchanges, entry, decimalPlaces, minQuantityInCoinsEntry, pair, side, isPriceProtect, stopLoss, takeProfit);

        console.log("🚀 ~ file: binance.js:761 ~ createOrderTargetIndicator ~ positions:", positions)

        if (!positions || positions.length === 0) {
            return res.status(404).json({ message: 'Orders not found.' });
        }

        // return res.status(201).json(positions);

        const signal = new Tradingview({
            strategyName: strategyName,
            pair: pair,
            chartTimeframe: chartTimeframe,
            side: side,
            entry: entry,
            signalTradeType: signalTradeType
        });

        const usersOrdersIds = [];
        if (positions) {
            for (const position of positions) {
                console.log("🚀 ~ file: binance.js:779 ~ createOrderTargetIndicator ~ position:", position)

                try {
                    if (!position) {
                        continue;
                    }
                }
                catch (error) {
                    console.error(error);
                    return error;
                }

                const marketPosition = position.find(position => position.type === 'market');
                console.log("🚀 ~ file: binance.js:786 ~ createOrderTargetIndicator ~ marketPosition:", marketPosition)

                try {
                    if (!marketPosition) {
                        continue;
                    }
                    if (marketPosition.info && marketPosition.id && marketPosition.user && marketPosition.user.userId) {
                        const saveUserOrder = await saveExecutedUserOrder(marketPosition, marketPosition.user, signal);
                        console.log("🚀 ~ file: binance.js:798 ~ createOrderTargetIndicator ~ saveUserOrder:", saveUserOrder)
                        usersOrdersIds.push(saveUserOrder._id);

                        const marketTakeProfitPosition = position.find(position => position.type === 'TAKE_PROFIT_MARKET');
                        console.log("🚀 ~ file: binance.js:799 ~ createOrderTargetIndicator ~ marketTakeProfitPosition:", marketTakeProfitPosition)
                        const marketStopLossPosition = position.find(position => position.type === 'STOP_MARKET');
                        console.log("🚀 ~ file: binance.js:801 ~ createOrderTargetIndicator ~ marketStopLossPosition:", marketStopLossPosition)

                        if (marketTakeProfitPosition) {
                            const saveUserTargetTakeProfit = await saveExecutedTargetUserOrder(marketTakeProfitPosition, saveUserOrder);
                            console.log("🚀 ~ file: binance.js:804 ~ createOrderTargetIndicator ~ saveUserTargetTakeProfit:", saveUserTargetTakeProfit)
                        }

                        if (marketStopLossPosition) {
                            const saveUserTargetStopLoss = await saveExecutedTargetUserOrder(marketStopLossPosition, saveUserOrder);
                            console.log("🚀 ~ file: binance.js:809 ~ createOrderTargetIndicator ~ saveUserTargetStopLoss:", saveUserTargetStopLoss)
                        }

                    }
                } catch (error) {
                    console.error(error);
                    return error;
                }
            }
        }

        if (!usersOrdersIds || usersOrdersIds.length === 0) {
            return res.status(404).json({ message: 'No orders and/or siganl to be saved.' });
        }
        
        signal.orders = usersOrdersIds;
        const savedSignal = await signal.save();

        console.log("🚀 ~ file: binance.js:484 ~ createOrderTargetIndicator ~ savedSignal:", savedSignal)

        return res.status(201).json({ orders: positions, savedSignal: savedSignal });

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
    createOrderTargetIndicator,
    fetchUserBinanceOrders
};

module.exports = binanceController;