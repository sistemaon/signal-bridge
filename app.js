
const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const envs = require('./env');
// Set environment variables
for (const env in envs) {
  process.env[env] = envs[env];
}

const tradingviewRouter = require('./modules/Tradingview/route/tradingview');
const binanceRouter = require('./modules/Binance/route/binance');
const userRouter = require('./modules/User/route/user');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(helmet());

app.use('/api/tradingview', tradingviewRouter);
app.use('/api/binance', binanceRouter);
app.use('/api/user', userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
