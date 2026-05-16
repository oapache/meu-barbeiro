const { Queue, QueueEvents } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const QUEUE_NAMES = {
  inbound: 'whatsapp-inbound',
  outbound: 'whatsapp-outbound',
  session: 'whatsapp-session',
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 60 * 60,
    count: 1000,
  },
  removeOnFail: {
    age: 60 * 60 * 24,
    count: 1000,
  },
};

let queues = null;
const queueEvents = new Map();

function getQueues() {
  if (!queues) {
    const connection = getRedisConnection();
    queues = {
      inbound: new Queue(QUEUE_NAMES.inbound, { connection, defaultJobOptions }),
      outbound: new Queue(QUEUE_NAMES.outbound, { connection, defaultJobOptions }),
      session: new Queue(QUEUE_NAMES.session, { connection, defaultJobOptions }),
    };
  }

  return queues;
}

function getQueueEvents(queueName) {
  if (!queueEvents.has(queueName)) {
    queueEvents.set(queueName, new QueueEvents(queueName, {
      connection: getRedisConnection(),
    }));
  }

  return queueEvents.get(queueName);
}

function buildJobId(parts = []) {
  return parts
    .map((part) => String(part || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_'))
    .filter(Boolean)
    .join(':');
}

async function getQueueDepths() {
  const q = getQueues();
  const [inbound, outbound, session] = await Promise.all([
    q.inbound.count(),
    q.outbound.count(),
    q.session.count(),
  ]);

  return { inbound, outbound, session };
}

module.exports = {
  QUEUE_NAMES,
  getQueues,
  getQueueEvents,
  getQueueDepths,
  buildJobId,
};
