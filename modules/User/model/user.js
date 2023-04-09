
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conn = require('../../../configs/db.config');

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    exchange: {
        binance: {
            apiKey: {
                type: String,
                required: true,
                unique: true
            },
            apiSecret: {
                type: String,
                required: true,
                unique: true
            }
        }
    }
});

const userModel = conn.model('User', userSchema);

module.exports = userModel;