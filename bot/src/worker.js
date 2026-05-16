require('dotenv').config();

const { Worker } = require('bullmq');
const config = require('./config');
const { getRedisConnection } = require('./config/redis');
const { QUEUE_NAMES } = require('./queues/whatsappQueues');
const {
  processInboundMessage,
  processOutboundMessage,
  processSessionJob,
  getRuntimeStats,
} = require('./services/baileysRuntime');

function createWorker(queueName, processor, concurrency) {
  const worker = new Worker(queueName, processor, {
    connection: getRedisConnection(),
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`[BOT_WORKER] Job concluido ${queueName}/${job.name}`, {
      id: job.id,
    });
  });

  worker.on('failed', (job, error) => {
    console.error(`[BOT_WORKER] Job falhou ${queueName}/${job?.name}`, {
      id: job?.id,
      message: error?.message,
    }, error);
  });

  worker.on('error', (error) => {
    console.error(`[BOT_WORKER] Erro no worker ${queueName}`, {
      message: error?.message,
    }, error);
  });

  return worker;
}

const workers = [
  createWorker(QUEUE_NAMES.session, processSessionJob, config.bot.sessionConcurrency),
  createWorker(QUEUE_NAMES.inbound, processInboundMessage, config.bot.inboundConcurrency),
  createWorker(QUEUE_NAMES.outbound, processOutboundMessage, config.bot.outboundConcurrency),
];

console.log('[BOT_WORKER] Workers iniciados', {
  workerId: config.bot.workerId,
  sessionConcurrency: config.bot.sessionConcurrency,
  inboundConcurrency: config.bot.inboundConcurrency,
  outboundConcurrency: config.bot.outboundConcurrency,
});

setInterval(() => {
  console.log('[BOT_WORKER] Runtime', getRuntimeStats());
}, 60000).unref();

async function shutdown(signal) {
  console.log(`[BOT_WORKER] Encerrando por ${signal}...`);
  await Promise.all(workers.map((worker) => worker.close().catch(() => undefined)));
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
