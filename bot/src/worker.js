require('dotenv').config();

const { Worker } = require('bullmq');
const config = require('./config');
const { getRedisConnection } = require('./config/redis');
const { QUEUE_NAMES, getQueues, buildJobId } = require('./queues/whatsappQueues');
const { listActiveSessionIds, readBotState } = require('./services/botStateStore');
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

const RECOVERABLE_SESSION_STATUSES = new Set([
  'ready',
  'authenticated',
  'starting',
  'qr_ready',
  'disconnected',
]);

async function enqueueSessionRecoveryOnStartup() {
  const activeSessionIds = await listActiveSessionIds().catch(() => []);
  if (!activeSessionIds.length) return;

  const queues = getQueues();
  let queued = 0;

  for (const barbeariaId of activeSessionIds) {
    const state = await readBotState(barbeariaId).catch(() => null);
    if (!state?.requestedPhoneNumber || !RECOVERABLE_SESSION_STATUSES.has(state.status)) {
      continue;
    }

    await queues.session.add('reconnect', { barbeariaId }, {
      jobId: buildJobId(['startup-reconnect', barbeariaId, Date.now(), Math.random().toString(36).slice(2, 8)]),
    });
    queued += 1;
  }

  console.log('[BOT_WORKER] Recuperacao de sessoes enfileirada', {
    activeSessionIds: activeSessionIds.length,
    queued,
  });
}

console.log('[BOT_WORKER] Workers iniciados', {
  workerId: config.bot.workerId,
  sessionConcurrency: config.bot.sessionConcurrency,
  inboundConcurrency: config.bot.inboundConcurrency,
  outboundConcurrency: config.bot.outboundConcurrency,
});

enqueueSessionRecoveryOnStartup().catch((error) => {
  console.error('[BOT_WORKER] Falha ao enfileirar recuperacao de sessoes', {
    message: error?.message,
  }, error);
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
