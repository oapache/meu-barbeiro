require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const whatsappRoutes = require('./routes/whatsapp');
const barbeariasRoutes = require('./routes/barbearias');
const usuariosRoutes = require('./routes/usuarios');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/barbearias', barbeariasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);

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
