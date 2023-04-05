
const ccxt = require('ccxt');

const User = require('../../User/model/user');

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
    getBalance
};

module.exports = binanceController;