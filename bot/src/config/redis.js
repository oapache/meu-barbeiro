const IORedis = require('ioredis');
const config = require('./index');

let sharedConnection = null;

function buildRedisOptions() {
  const base = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  };

  if (config.redis.url) {
    return {
      url: config.redis.url,
      options: base,
    };
  }

  return {
    options: {
      ...base,
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
      password: config.redis.password || undefined,
    },
  };
}

function createRedisConnection() {
  const redisOptions = buildRedisOptions();
  const client = redisOptions.url
    ? new IORedis(redisOptions.url, redisOptions.options)
    : new IORedis(redisOptions.options);

  client.on('error', (error) => {
    console.error('[REDIS] Falha na conexao', {
      code: error?.code,
      message: error?.message,
    });
  });

  return client;
}

function getRedisConnection() {
  if (!sharedConnection) {
    sharedConnection = createRedisConnection();
  }

  return sharedConnection;
}

async function checkRedisHealth() {
  try {
    const client = getRedisConnection();
    if (client.status === 'wait') {
      await client.connect();
    }

    const pong = await client.ping();
    return {
      ok: pong === 'PONG',
      status: client.status,
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      error: error?.message || 'Redis indisponivel.',
    };
  }
}

module.exports = {
  createRedisConnection,
  getRedisConnection,
  checkRedisHealth,
};
