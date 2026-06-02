require('dotenv').config();

const { validateRuntimeSecurity } = require('./runtimeSecurity');

function parseList(value, fallback = []) {
  const items = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

const appUrl = process.env.APP_URL || 'https://ocortecerto.com';
const apiUrl = process.env.API_PUBLIC_URL || 'https://api.ocortecerto.com';

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl,
  apiUrl,
  cors: {
    origins: parseList(process.env.CORS_ORIGIN, [
      appUrl,
      'https://www.ocortecerto.com',
      apiUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ]),
  },
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  
  // JWT
  jwt: {
    secret: String(process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : '')).trim(),
    expiresIn: '7d'
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    appUrl,
    prices: {
      professionals_1: process.env.STRIPE_PRICE_ID_1_PRO || '',
      professionals_2_5: process.env.STRIPE_PRICE_ID_2_5_PRO || '',
      professionals_6_15: process.env.STRIPE_PRICE_ID_6_15_PRO || '',
      professionals_15_plus: process.env.STRIPE_PRICE_ID_15_PLUS_PRO || '',
    },
    promoCoupons: {
      professionals_1: process.env.STRIPE_PROMO_COUPON_1_PRO || '',
      professionals_2_5: process.env.STRIPE_PROMO_COUPON_2_5_PRO || '',
      professionals_6_15: process.env.STRIPE_PROMO_COUPON_6_15_PRO || '',
      professionals_15_plus: process.env.STRIPE_PROMO_COUPON_15_PLUS_PRO || '',
    }
  },

  bot: {
    serviceUrl: process.env.BOT_SERVICE_URL || '',
    serviceToken: String(process.env.BOT_SERVICE_TOKEN || '').trim(),
  }
};

validateRuntimeSecurity({
  serviceName: 'backend',
  nodeEnv: config.nodeEnv,
  jwtSecret: config.jwt.secret,
});

module.exports = config;
