const Stripe = require('stripe');
const config = require('../config');

let stripeClient = null;

function getStripeClient() {
  if (!config.stripe.secretKey) {
    throw new Error('Stripe não configurado. Defina STRIPE_SECRET_KEY no backend/.env.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey);
  }

  return stripeClient;
}

module.exports = {
  getStripeClient,
};
