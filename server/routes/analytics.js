const express = require('express');
const router = express.Router();
const { 
    getVelocityReport, 
    getFinancials, 
    getForecast, 
    getRecommendations, 
    getPriceSuggestion 
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/velocity', auth, getVelocityReport);
router.get('/financials', auth, getFinancials);

// New Mock AI Routes
router.get('/forecast/:id', auth, getForecast);
router.get('/recommendations/:id', auth, getRecommendations);
router.get('/price-suggestion/:id', auth, getPriceSuggestion);

module.exports = router;
