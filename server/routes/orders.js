const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  processCustomerOrder, // Added
  getOrders, 
  updateOrderStatus,
  createB2BOrder,
  getB2BOrders,
  confirmWholesaleOrder, // Renamed from fulfillB2BOrder
  updateB2BOrderStatus,
  getStarredReorders, // Added
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.post('/', auth, processCustomerOrder); // Using the enhanced B2C logic
router.post('/razorpay', auth, createRazorpayOrder);
router.post('/verify', auth, verifyRazorpayPayment);
router.get('/', auth, getOrders);
router.get('/starred-reorders', auth, getStarredReorders);
router.put('/:id/status', auth, updateOrderStatus);

// B2B Routes
router.post('/b2b', auth, createB2BOrder);
router.get('/b2b', auth, getB2BOrders);
router.put('/b2b/:id/status', auth, updateB2BOrderStatus);
router.put('/b2b/:id/confirm', auth, confirmWholesaleOrder);

module.exports = router;
