require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { checkRedisHealth } = require('./config/redis');
const { getQueueDepths } = require('./queues/whatsappQueues');
const { getSessionStats } = require('./services/whatsappBot');
const chatbotRoutes = require('./routes/chatbot');
const internalRoutes = require('./routes/internal');

const app = express();

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (config.cors.origins.includes('*')) return true;
  return config.cors.origins.includes(origin);
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origem não permitida pelo serviço do bot.'));
  },
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  const [redis, queueDepths, sessions] = await Promise.all([
    checkRedisHealth(),
    getQueueDepths().catch((error) => ({ error: error?.message || 'Nao foi possivel consultar filas.' })),
    getSessionStats().catch((error) => ({ error: error?.message || 'Nao foi possivel consultar sessoes.' })),
  ]);

  res.json({
    status: 'ok',
    service: 'bot',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    redis,
    queueDepths,
    sessions,
  });
});

app.use('/api/chatbot/internal', internalRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no serviço do bot.' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Bot service running on port ${config.port}`);
  });
}

module.exports = app;
