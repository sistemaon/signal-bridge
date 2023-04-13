
const Order = require('../model/order');


const saveExecutedOrder = async (order, user) => {
    const saveUserOrder = new Order({
        info: order.info,
        id: order.id,
        clientOrderId: order.clientOrderId,
        timestamp: order.timestamp,
        datetime: order.datetime,
        lastTradeTimestamp: order.lastTradeTimestamp,
        symbol: order.symbol,
        type: order.type,
        timeInForce: order.timeInForce,
        postOnly: order.postOnly,
        reduceOnly: order.reduceOnly,
        side: order.side,
        price: order.price,
        triggerPrice: order.triggerPrice,
        amount: order.amount,
        cost: order.cost,
        average: order.average,
        filled: order.filled,
        remaining: order.remaining,
        status: order.status,
        fee: order.fee,
        trades: order.trades,
        fees: order.fees,
        stopPrice: order.stopPrice,
        user: user.userId
    });
    return await saveUserOrder.save();
};

const orderController = {
    saveExecutedOrder
};

module.exports = orderController;