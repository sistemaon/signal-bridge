
const user = require('../model/user');

const createUser = async (req, res, next) => {
    try {
        const { username, exchange } = req.body;
        if (!username || !exchange) {
            return res.status(400).json({ message: 'Missing required fields, please check again.' });
        }
        
        const newUser = new user({
            username,
            exchange
        });

        const userSaved = await newUser.save();

        return res.status(201).json(userSaved);

    } catch (error) {
        console.log("🚀 ~ file: user.js:9 ~ createUser ~ error:", error);
        return res.status(500).json({ error: error });
    }
};

const userController = {
    createUser
};

module.exports = userController;