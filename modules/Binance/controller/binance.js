
const ccxt = require('ccxt');

const User = require('../../User/model/user');
const Tradingview = require('../../Tradingview/model/tradingview');
const Market = require('../model/market');

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
        binance.userBotDb = { username: user.username };
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
                const order = await exchange.createOrder(symbol, type, side, amount);
                console.log("🚀 ~ file: binance.js:53 ~ exchanges.map ~ order:", order);
                return order;
            })
        );
        console.log("🚀 ~ file: binance.js:57 ~ executeMarketOrder ~ orders:", orders);
        return orders;
    } catch (error) {
        console.error(error);
        return error;
    }
};

createOrderSignalIndicator = async (req, res, next) => {
    try {
        const { strategyName, pair, chartTimeframe, side, entry, targets, stop, signalTradeType } = req.body;

        const newSignal = new Tradingview({
            strategyName,
            pair,
            chartTimeframe,
            side,
            entry,
            targets,
            stop,
            signalTradeType
        });

        if (!strategyName || !pair || !chartTimeframe || !chartTimeframe.chronoAmount || !chartTimeframe.chronoUnit || !side || !entry || !signalTradeType) {
            console.error('Missing parameters.');
            return res.status(400).json({ message: 'Missing parameters.' });
        }

        const marketSymbol = await Market.findOne({ symbol: pair });
        if (!marketSymbol || !marketSymbol.limits.cost.min || !marketSymbol.precision.amount) {
            console.error(`Market symbol ${pair} not found.`);
            return res.status(400).json({ message: `Market symbol ${pair} not found.` });
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
            const percentageToOpenOrder = 0.02;
            const balanceToOpenOrder = Math.trunc(freeBalance * percentageToOpenOrder);
            console.log("🚀 ~ file: binance.js:83 ~ verifyToOpenOrders ~ balanceToOpenOrder:", balanceToOpenOrder)

            if (balanceToOpenOrder < minNotional) {
                console.error(`Insufficient balance for user with API key ${exchange.apiKey}`);
                return null;
            }
            const amountBalanceToOpenOrder = balanceToOpenOrder / entry;
            console.log("🚀 ~ file: binance.js:90 ~ verifyToOpenOrders ~ amountToOpenOrder:", amountBalanceToOpenOrder)
            const factor = 10 ** decimalPlaces;
            const amountToOpenOrder = Math.trunc(amountBalanceToOpenOrder * factor) / factor;
            
            // DONE CREATE ORDER (IT IS COMMENT BECAUSE I DON'T WANT TO OPEN ORDERS)
            // try {
            //     const createMarketOrder = await executeOrder(pair, 'market', side, amountToOpenOrder);           
            //     console.log("🚀 ~ file: binance.js:99 ~ verifyToOpenOrders ~ createMarketOrder:", createMarketOrder)
            // } catch (error) {
            //     console.error(error);
            //     return null;
            // }
            // DONE CREATE ORDER (IT IS COMMENT BECAUSE I DON'T WANT TO OPEN ORDERS)
            
            return { freeBalance: freeBalance, balanceToOpenOrder: balanceToOpenOrder, amountBalanceToOpenOrder: amountBalanceToOpenOrder, amountToOpenOrder: amountToOpenOrder, user: user };
        });

        const orders = await Promise.all(verifyToOpenOrders);
        console.log("🚀 ~ file: binance.js:95 ~ createOrderSignalIndicator= ~ orders:", orders);


        // const createMarketOrder = await executeOrder(pair, 'market', side, 0.001);
        // console.log("🚀 ~ file: binance.js:83 ~ createOrderSignalIndicator= ~ createOrder:", createMarketOrder);

        // const savedSignal = await newSignal.save();

        // return res.status(201).json({ savedSignal });
        // return res.status(201).json({ data: req.body, signal: savedSignal });
        return res.status(201).json({ data: req.body, orders: orders, minNotional: minNotional, decimalPlaces: decimalPlaces });
        // return res.status(201).json({ data: req.body, order: createMarketOrder });

    } catch (error) {
        console.log("🚀 ~ file: tradingview.js: ~ createSignal ~ error:", error);
        return res.status(500).json({ error: error });
    }
};

const getBalance = async (req, res, next) => {
    try {
        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users);
        const balances = await Promise.all(
            exchanges.map(async (exchange) => {
                const balance = await exchange.fetchBalance();
                return balance.total;
            })
        );
        return res.status(200).json(balances);
    } catch (error) {
        console.error(error);
        return error;
    }
};


const binanceController = {
    getBalance,
    createOrderSignalIndicator
};

module.exports = binanceController;