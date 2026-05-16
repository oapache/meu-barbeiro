require('dotenv').config();

const config = require('./config');
const { checkRedisHealth } = require('./config/redis');
const { getQueueDepths } = require('./queues/whatsappQueues');
const { runSchedulerTick } = require('./services/baileysRuntime');
const { markStaleChatbotSessionsAsAbandoned } = require('./services/chatbotTraining');
const { listActiveSessionIds } = require('./services/botStateStore');

let running = false;

async function tick() {
  if (running) return;
  running = true;

  try {
    const redis = await checkRedisHealth();
    const queueDepths = await getQueueDepths().catch(() => null);
    const scheduler = await runSchedulerTick();
    const activeSessionIds = await listActiveSessionIds().catch(() => []);

    for (const barbeariaId of activeSessionIds) {
      await markStaleChatbotSessionsAsAbandoned(barbeariaId, config.bot.staleSessionMinutes)
        .catch((error) => {
          console.warn('[BOT_SCHEDULER] Falha ao marcar sessoes antigas', {
            barbeariaId,
            message: error?.message,
          });
        });
    }

    console.log('[BOT_SCHEDULER] Tick concluido', {
      redis,
      queueDepths,
      activeSessions: scheduler.activeSessions,
      localRuntimeSessions: scheduler.localRuntimeSessions,
    });
  } catch (error) {
    console.error('[BOT_SCHEDULER] Falha no tick', {
      message: error?.message,
    }, error);
  } finally {
    running = false;
  }
}

console.log('[BOT_SCHEDULER] Scheduler iniciado', {
  intervalMs: config.bot.schedulerIntervalMs,
  staleSessionMinutes: config.bot.staleSessionMinutes,
});

tick();
const interval = setInterval(tick, config.bot.schedulerIntervalMs);

function shutdown(signal) {
  console.log(`[BOT_SCHEDULER] Encerrando por ${signal}...`);
  clearInterval(interval);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
