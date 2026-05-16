const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const { bootstrapBarbershop } = require('./syncBridge');

let running = false;

function resolveStatePath() {
  const configured = String(config.backendSync.statePath || '.bot_sync_state.json').trim();
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

async function readState() {
  try {
    const raw = await fs.readFile(resolveStatePath(), 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      lastSuccessAt: parsed.lastSuccessAt || null,
      lastRunAt: parsed.lastRunAt || null,
      lastCount: Number(parsed.lastCount || 0),
    };
  } catch {
    return {
      lastSuccessAt: null,
      lastRunAt: null,
      lastCount: 0,
    };
  }
}

async function writeState(state = {}) {
  const target = resolveStatePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(state, null, 2), 'utf8');
}

function withOverlap(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  date.setMinutes(date.getMinutes() - Number(config.backendSync.overlapMinutes || 0));
  return date.toISOString();
}

function buildUrl(state) {
  const url = new URL(`${config.backendSync.apiUrl}/internal/bot/sync/changes`);
  const since = withOverlap(state.lastSuccessAt);

  if (since) {
    url.searchParams.set('since', since);
  }

  url.searchParams.set('limit', String(config.backendSync.limit || 200));
  return url.toString();
}

async function fetchChanges(state) {
  if (!config.backendSync.enabled) {
    return { skipped: true, reason: 'BACKEND_SYNC_DISABLED' };
  }

  if (!config.botServiceToken) {
    return { skipped: true, reason: 'BOT_SERVICE_TOKEN_NOT_CONFIGURED' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.backendSync.timeoutMs);

  try {
    const response = await fetch(buildUrl(state), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.botServiceToken}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error || 'Falha ao buscar mudanças da API principal.');
      error.status = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function reconcileFromBackend() {
  if (running) {
    return { skipped: true, reason: 'BACKEND_SYNC_ALREADY_RUNNING' };
  }

  running = true;
  const state = await readState();

  try {
    const payload = await fetchChanges(state);
    if (payload?.skipped) return payload;

    const items = Array.isArray(payload.items) ? payload.items : [];
    let synced = 0;

    for (const item of items) {
      await bootstrapBarbershop(item);
      synced += 1;
    }

    const nextState = {
      lastSuccessAt: payload.next_since || new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
      lastCount: synced,
    };
    await writeState(nextState);

    return {
      ok: true,
      synced,
      since: payload.since || null,
      nextSince: nextState.lastSuccessAt,
    };
  } finally {
    running = false;
  }
}

module.exports = {
  reconcileFromBackend,
};
