const express = require('express');
const router = express.Router();
const { register, login, getWholesalers, getRetailers } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/wholesalers', getWholesalers);
router.get('/retailers', getRetailers);

module.exports = router;
