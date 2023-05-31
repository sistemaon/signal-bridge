
const Target = require('../model/target');


const saveExecutedTargetUserOrder = async (target, order) => {
    try {
        const saveTargetUserOrder = new Target({
            orderId: target.orderId,
            symbol: target.symbol,
            status: target.status,
            clientOrderId: target.clientOrderId,
            price: target.price,
            avgPrice: target.avgPrice,
            origQty: target.origQty,
            executedQty: target.executedQty,
            cumQty: target.cumQty,
            cumQuote: target.cumQuote,
            timeInForce: target.timeInForce,
            type: target.type,
            reduceOnly: target.reduceOnly,
            closePosition: target.closePosition,
            side: target.side,
            positionSide: target.positionSide,
            stopPrice: target.stopPrice,
            workingType: target.workingType,
            priceProtect: target.priceProtect,
            origType: target.origType,
            updateTime: target.updateTime,
            order: order.orderId
        });

        const targetUserOrder = await saveTargetUserOrder.save();
        return targetUserOrder;

    } catch (error) {
        console.error({ error });
        return error;
    }
};

const fetchTargetUserOrders = async (orderId) => {
    try {
        const userTargetOrder = await Target.find({ order: orderId })
        .populate({
            path: 'order',
        });
        return userTargetOrder;
    } catch (error) {
        console.error({ error });
        return error;
    }
};

const targetController = {
    saveExecutedTargetUserOrder,
    fetchTargetUserOrders
};

module.exports = targetController;