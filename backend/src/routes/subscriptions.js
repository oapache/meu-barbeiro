const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription');

router.post('/checkout-session', subscriptionController.createCheckoutSession);
router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/customer-portal', subscriptionController.createCustomerPortal);
router.post('/cancel', subscriptionController.cancelSubscription);

module.exports = router;
