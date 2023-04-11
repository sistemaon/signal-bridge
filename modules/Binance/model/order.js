
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const binanceOrderSchema = new Schema({
    
});

const binanceOrderModel = conn.model('Binanceorder', binanceOrderSchema);

module.exports = binanceOrderModel;