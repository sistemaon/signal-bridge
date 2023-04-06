
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
        console.log("🚀 ~ file: tradingview.js:7 ~ createSignal ~ req.body:", req.body);

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
        console.log("🚀 ~ file: tradingview.js:19 ~ createSignal ~ newSignal:", newSignal);

        const marketSymbol = await Market.findOne({ symbol: pair });
        if (!marketSymbol || !marketSymbol.limits.cost.min) {
            console.error(`Market symbol ${pair} not found.`);
            return;
        }

        // Get the minimum notional value
        const minNotional = marketSymbol.limits.cost.min;

        const users = await User.find();
        const exchanges = await prepareRequestsBinanceExchange(users);

        const verifyToOpenOrders = exchanges.map(async (exchange) => {
            const balance = await exchange.fetchBalance();
            const freeBalance = balance.free.USDT;

            // if (freeBalance < minNotional) {
            //     console.error(`Insufficient balance for user with API key ${exchange.apiKey}`);
            //     return null;
            // }

            // TODO: Place an order using the exchange instance
            // return order;
            
            return freeBalance;
        });

        const orders = await Promise.all(verifyToOpenOrders);
        console.log("🚀 ~ file: binance.js:95 ~ createOrderSignalIndicator= ~ orders:", orders);


        // const createMarketOrder = await executeOrder(pair, 'market', side, 0.001);
        // console.log("🚀 ~ file: binance.js:83 ~ createOrderSignalIndicator= ~ createOrder:", createMarketOrder);

        // const savedSignal = await newSignal.save();

        // return res.status(201).json({ savedSignal });
        return res.status(201).json({ data: req.body });
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