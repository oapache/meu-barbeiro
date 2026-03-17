const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription');

router.post('/stripe', subscriptionController.stripeWebhook);

module.exports = router;
