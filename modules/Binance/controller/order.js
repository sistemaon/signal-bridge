
const Order = require('../model/order');


const executedUserOrder = async (order, user, signal, targets) => {
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
            signal: signal._id,
            targets: targets ? targets : []
        });
        return saveUserOrder;
    } catch (error) {
        console.error({ error });
        return error;
    }
};

const saveExecutedUserOrder = async (order, user, signal, targets) => {
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
            signal: signal._id,
            targets: targets ? targets : []
        });
        return await saveUserOrder.save();
    } catch (error) {
        console.error({ error });
        return error;
    }
};

const updateTargetsUserOrder = async (orderId, targets) => {
    try {
        const updateOrder = await Order.findByIdAndUpdate(orderId,
            { $push: { targets: targets } },
            { new: true }
        );
        return updateOrder;
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
    executedUserOrder,
    saveExecutedUserOrder,
    updateTargetsUserOrder,
    fetchUserOrders
};

module.exports = orderController;