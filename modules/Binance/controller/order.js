
const Order = require('../model/order');


const saveExecutedOrder = async (order, user, signal) => {
    try {
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
            user: user.userId,
            signal: signal._id
        });
        return await saveUserOrder.save();
    } catch (error) {
        console.error({ error });
        return error;
    }
};

const fetchUserOrders = async (userId) => {
    try {
        const userOrders = await Order.find({ user: userId })
        .populate({
            path: 'signal',
            select: 'chartTimeframe strategyName pair side buy entry signalTradeType signalTradeDate'
        })
        .populate({
            path: 'user',
            select: 'username'
        });
        return userOrders;
    } catch (error) {
        console.error({ error });
        return error;
    }
};

const orderController = {
    saveExecutedOrder,
    fetchUserOrders
};

module.exports = orderController;