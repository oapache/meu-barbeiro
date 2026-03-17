require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'meubarbeiro-secret-key',
    expiresIn: '7d'
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
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
  }
};
