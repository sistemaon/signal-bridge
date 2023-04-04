
const express = require('express');
const router = express.Router();

const user = require('../controller/user');

router.post('/create', user.createUser);

module.exports = router;