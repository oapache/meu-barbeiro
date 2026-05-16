const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription');
const { authenticateRequired } = require('../middleware/auth');

router.use(authenticateRequired);
router.post('/checkout-session', subscriptionController.createCheckoutSession);
router.get('/current', subscriptionController.getCurrentSubscription);
router.post('/customer-portal', subscriptionController.createCustomerPortal);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/sync-bot', subscriptionController.syncBotSubscriptionData);

module.exports = router;
