require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');

const app = express();

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.cors?.origins?.includes('*')) return true;
  return config.cors?.origins?.includes(origin);
}

// Stripe webhook must receive raw body for signature validation.
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Middlewares
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem não permitida pela API.'));
  },
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const whatsappRoutes = require('./routes/whatsapp');
const barbeariasRoutes = require('./routes/barbearias');
const usuariosRoutes = require('./routes/usuarios');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');
const clientesRoutes = require('./routes/clientes');
const estoqueRoutes = require('./routes/estoque');
const uploadRoutes = require('./routes/upload');
const subscriptionsRoutes = require('./routes/subscriptions');
const internalBotSyncRoutes = require('./routes/internalBotSync');

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/barbearias', barbeariasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/internal/bot', internalBotSyncRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
