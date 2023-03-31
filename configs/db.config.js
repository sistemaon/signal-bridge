
const mongoose = require('mongoose');

const dbIp = process.env.DB_IP;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;

const uri = `mongodb://${dbIp}:${dbPort}/${dbName}`;

const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  // DeprecationWarning: The option `autoReconnect` is incompatible with the unified topology, please read more by visiting http://bit.ly/2D8WfT6
  // autoReconnect: true,
  // useUnifiedTopology: true,
  // useCreateIndex: true,
  // poolSize: 15,
  keepAlive: true,
  keepAliveInitialDelay: 270000,
  maxPoolSize: 10
  // DeprecationWarning: Mongoose: `findOneAndUpdate()` and `findOneAndDelete()` without the `useFindAndModify` option set to false are deprecated. See: https://mongoosejs.com/docs/deprecations.html#findandmodify
  // useFindAndModify: false,
};


const conn = mongoose.createConnection(uri, options);

module.exports = conn;