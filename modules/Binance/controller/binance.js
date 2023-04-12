
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Tradingview = require('../../Tradingview/model/tradingview');
const Market = require('../model/market');
const Order = require('../model/order');

const prepareRequestsBinanceExchange = async (users) => {
    try {
      const promises = users.map(async user => {
        const defaultOptions = {
            defaultType: 'future'
        };
        const binance = new ccxt.binance({
            apiKey: user.exchange.binance.apiKey,
            secret: user.exchange.binance.apiSecret,
            enableRateLimit: true,
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

const executeOrder = async (symbol, type, side, amount) => {
    try {
        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users);
        const orders = await Promise.all(
            exchanges.map(async (exchange) => {
                const user = exchange.userBotDb;
                
                console.log("🚀 ~ file: binance.js:41 ~ exchanges.map ~ symbol:", {symbol});
                const userLastPositionSymbol = await exchange.fetchAccountPositions([symbol]);
                console.log("🚀 ~ file: binance.js:41 ~ exchanges.map ~ userLastPositionSymbol:", userLastPositionSymbol[0]);
                
                const positionAmount = Number(userLastPositionSymbol[0].info['positionAmt']);
                console.log("🚀 ~ file: binance.js:45 ~ exchanges.map ~ positionAmount:", positionAmount);
                
                if (positionAmount === 0) {
                    const order = await exchange.createOrder(symbol, type, side, amount);
                    console.log("🚀 ~ file: binance.js:50 ~ exchanges.map ~ order:", order);
                    return order;
                }
                
                console.log("🚀 ~ file: binance.js:33 ~ executeOrder ~ side:", {side})
                const positionSide = userLastPositionSymbol[0]['side'];
                console.log("🚀 ~ file: binance.js:54 ~ exchanges.map ~ positionSide:", {positionSide})
                if (side === 'buy' && positionSide === 'long') {
                    return `Long/Buy position on ${symbol} already exists.`;
                }
                if (side === 'sell' && positionSide === 'short') {
                    return `Short/Sell position on ${symbol} already exists.`;
                }

                if (positionSide === 'long' && side === 'sell') {
                    const order = await exchange.createOrder(symbol, type, side, positionAmount);
                    console.log("🚀 ~ file: binance.js:65 ~ exchanges.map ~ order:", order)
                    return order;
                }
                if (positionSide === 'short' && side === 'buy') {
                    const order = await exchange.createOrder(symbol, type, side, positionAmount);
                    console.log("🚀 ~ file: binance.js:65 ~ exchanges.map ~ order:", order)
                    return order;
                }

                


                // const fetchUserTrades = await exchange.fetchMyTrades(symbol);
                // const userLastTrade = fetchUserTrades[fetchUserTrades.length - 1];
                // const userLastPositionSymbol = await exchange.fetchAccountPositions([userLastTrade.symbol]); // userLastTrade.symbol
                // // return userLastTrade;

                // DONE READY TO OPEN ORDERS
                // // console.log("🚀 ~ file: binance.js:38 ~ exchanges.map ~ user:", user);
                // const order = await exchange.createOrder(symbol, type, side, amount);
                // console.log("🚀 ~ file: binance.js:53 ~ exchanges.map ~ order:", order);
                // const saveUserOrder = new Order({
                //     info: order.info,
                //     id: order.id,
                //     clientOrderId: order.clientOrderId,
                //     timestamp: order.timestamp,
                //     datetime: order.datetime,
                //     lastTradeTimestamp: order.lastTradeTimestamp,
                //     symbol: order.symbol,
                //     type: order.type,
                //     timeInForce: order.timeInForce,
                //     postOnly: order.postOnly,
                //     reduceOnly: order.reduceOnly,
                //     side: order.side,
                //     price: order.price,
                //     triggerPrice: order.triggerPrice,
                //     amount: order.amount,
                //     cost: order.cost,
                //     average: order.average,
                //     filled: order.filled,
                //     remaining: order.remaining,
                //     status: order.status,
                //     fee: order.fee,
                //     trades: order.trades,
                //     fees: order.fees,
                //     stopPrice: order.stopPrice,
                //     user: user.userId
                // });
                // const userOrder = await saveUserOrder.save();
                // // console.log("🚀 ~ file: binance.js:70 ~ exchanges.map ~ userOrder:", userOrder)
                // return order;
                // DONE READY TO OPEN ORDERS
            })
        );
        // console.log("🚀 ~ file: binance.js:57 ~ executeMarketOrder ~ orders:", orders);
        return orders;
    } catch (error) {
        console.error(error);
        return error;
    }
};

// minNotional / current price = amount in coins (to open order)
// amount in coins * current price = amount in USDT (to open order)

createOrderSignalIndicator = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, targets, stop, signalTradeType } = req.body;

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) {
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }

        const marketSymbol = await Market.findOne({ id: pair.replace('/', '') });
        if (!marketSymbol || !marketSymbol.limits.cost.min || !marketSymbol.precision.amount) {
            console.error(`Market symbol ${pair} not found.`);
            return res.status(400).json({ message: `Market symbol params needed is not found.` });
        }

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
            // console.log("🚀 ~ file: binance.js:83 ~ verifyToOpenOrders ~ balanceToOpenOrder:", balanceToOpenOrder);

            if (balanceToOpenOrder < minNotional) {
                console.error(`Insufficient balance for user with API key ${exchange.apiKey}`);
                return null;
            }
            const amountBalanceToOpenOrder = balanceToOpenOrder / entry;
            // console.log("🚀 ~ file: binance.js:90 ~ verifyToOpenOrders ~ amountToOpenOrder:", amountBalanceToOpenOrder);
            const factor = 10 ** decimalPlaces;
            const amountToOpenOrder = 0.003 // Math.trunc(amountBalanceToOpenOrder * factor) / factor;

            // DONE CREATE ORDER (IT IS COMMENT BECAUSE I DON'T WANT TO OPEN ORDERS)
            try {
                const createMarketOrder = await executeOrder(pair, 'market', side, amountToOpenOrder);           
                // console.log("🚀 ~ file: binance.js:158 ~ verifyToOpenOrders ~ createMarketOrder:", createMarketOrder);
            } catch (error) {
                console.error(error);
                return null;
            }
            // DONE CREATE ORDER (IT IS COMMENT BECAUSE I DON'T WANT TO OPEN ORDERS)

            return { minNotional: minNotional, decimalPlaces: decimalPlaces, currentPrice: entry, amountToOpenOrder: amountToOpenOrder };
            // return { amountT: amountT, roundedAmountT: roundedAmountT, freeBalance: freeBalance, balanceToOpenOrder: balanceToOpenOrder, amountBalanceToOpenOrder: amountBalanceToOpenOrder, amountToOpenOrder: amountToOpenOrder, user: user };
        });

        const orders = await Promise.all(verifyToOpenOrders);
        console.log("🚀 ~ file: binance.js:95 ~ createOrderSignalIndicator= ~ orders:", orders);

        // const newSignal = new Tradingview({
        //     strategyName,
        //     pair,
        //     chartTimeframe,
        //     side,
        //     entry,
        //     targets,
        //     stop,
        //     signalTradeType
        // });
        // const savedSignal = await newSignal.save();

        return res.status(201).json({ data: req.body, orders: orders, minNotional: minNotional, decimalPlaces: decimalPlaces });

    } catch (error) {
        console.log("🚀 ~ file: tradingview.js: ~ createSignal ~ error:", error);
        return res.status(500).json({ error: error });
    }
};


const binanceController = {
    createOrderSignalIndicator
};

module.exports = binanceController;