require('dotenv').config();

const crypto = require('crypto');
const mysql = require('mysql2/promise');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return {};

  const url = new URL(databaseUrl);
  if (!url.protocol.startsWith('mysql')) {
    return {};
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    ssl: parseBoolean(url.searchParams.get('ssl'), false),
  };
}

function buildConfig() {
  const urlConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const sslEnabled = parseBoolean(process.env.MYSQL_SSL, urlConfig.ssl);

  return {
    host: process.env.MYSQL_HOST || urlConfig.host || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || urlConfig.port || 3306),
    user: process.env.MYSQL_USER || urlConfig.user || 'root',
    password: process.env.MYSQL_PASSWORD || urlConfig.password || '',
    database: process.env.MYSQL_DATABASE || urlConfig.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
    queueLimit: Number(process.env.MYSQL_QUEUE_LIMIT || 100),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    decimalNumbers: true,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    typeCast(field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
        if (value === null) return null;
        return value === '1';
      }

      return next();
    },
  };
}

const config = buildConfig();
const mysqlPool = mysql.createPool(config);

if (typeof mysqlPool.on === 'function') {
  mysqlPool.on('error', (error) => {
    console.error('[DATABASE.pool] Erro no cliente ocioso', {
      code: error?.code,
      message: error?.message,
    }, error);
  });
}

function normalizeJsonDefaults(sql) {
  return sql
    .replace(/DEFAULT\s+'\{\}'\s*::\s*jsonb/gi, 'DEFAULT (JSON_OBJECT())')
    .replace(/DEFAULT\s+'\[\]'\s*::\s*jsonb/gi, 'DEFAULT (JSON_ARRAY())');
}

function stripPostgresCasts(sql) {
  return sql.replace(
    /::\s*(jsonb|json|text|uuid|int|integer|bigint|numeric(?:\s*\([^)]*\))?|decimal(?:\s*\([^)]*\))?|float|real|double\s+precision|boolean|bool|date|time|timestamp|timestamptz|interval)(?:\[\])?(?=\W|$)/gi,
    ''
  );
}

function normalizePostgresSyntax(sql) {
  return stripPostgresCasts(normalizeJsonDefaults(sql))
    .replace(/\bUUID\b(?!\s*\()/gi, 'CHAR(36)')
    .replace(/\bJSONB\b/gi, 'JSON')
    .replace(/\bTIMESTAMP\s+WITH\s+TIME\s+ZONE\b/gi, 'DATETIME')
    .replace(/\bBOOLEAN\b/gi, 'TINYINT(1)')
    .replace(/\bINTEGER\b/gi, 'INT')
    .replace(/\bTEXT\s+DEFAULT\s+'([^']*)'/gi, "VARCHAR(255) DEFAULT '$1'")
    .replace(/NOW\(\)\s*-\s*\(\s*(\$\d+)\s*\|\|\s*' minutes'\s*\)(?:\s*::interval)?/gi, 'DATE_SUB(NOW(), INTERVAL $1 MINUTE)')
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/DEFAULT\s+gen_random_uuid\(\)/gi, 'DEFAULT (UUID())')
    .replace(/ON\s+CONFLICT\s*\(([^)]+)\)\s+DO\s+NOTHING/gi, (_, columns) => {
      const firstColumn = normalizeIdentifier(columns.split(',')[0]);
      return `ON DUPLICATE KEY UPDATE ${firstColumn} = ${firstColumn}`;
    })
    .replace(/ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+SET\s+([\s\S]*?)(?=\s+RETURNING\b|$)/gi, (_, assignments) => (
      `ON DUPLICATE KEY UPDATE ${assignments.replace(/\bEXCLUDED\.([a-zA-Z0-9_]+)/g, 'VALUES($1)')}`
    ))
    .replace(/COUNT\(\*\)\s+FILTER\s*\(\s*WHERE\s+([^()]+?)\s*\)/gi, 'SUM(CASE WHEN $1 THEN 1 ELSE 0 END)')
    .replace(/REGEXP_REPLACE\(([^,]+),\s*'\\\\?D',\s*''\s*,\s*'g'\)/gi, "REGEXP_REPLACE($1, '[^0-9]', '')");
}

function normalizeParams(params = []) {
  return params.map((value) => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (Buffer.isBuffer(value)) return value;
    if (Array.isArray(value) || typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  });
}

function normalizeTransactionSql(sql) {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (upper === 'BEGIN') return 'START TRANSACTION';
  if (upper === 'COMMIT') return 'COMMIT';
  if (upper === 'ROLLBACK') return 'ROLLBACK';

  return sql;
}

function convertPlaceholders(sql, params = []) {
  const normalizedParams = normalizeParams(params);
  const values = [];
  const convertedSql = sql.replace(/=\s*ANY\(\$(\d+)(?:::\w+(?:\[\])?)?\)|\$(\d+)/gi, (match, anyIndex, index) => {
    if (anyIndex) {
      const items = Array.isArray(params[Number(anyIndex) - 1]) ? params[Number(anyIndex) - 1] : [];
      if (items.length === 0) {
        return 'IN (NULL)';
      }

      values.push(...normalizeParams(items));
      return `IN (${items.map(() => '?').join(', ')})`;
    }

    values.push(normalizedParams[Number(index) - 1]);
    return '?';
  });

  return {
    sql: convertedSql,
    params: values.length > 0 ? values : normalizedParams,
  };
}

function prepareQuery(sql, params = []) {
  const normalizedSql = normalizePostgresSyntax(normalizeTransactionSql(sql));
  return convertPlaceholders(normalizedSql, params);
}

function splitReturning(sql) {
  const match = sql.match(/\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i);
  if (!match) return null;

  return {
    sql: sql.slice(0, match.index).trim(),
    returning: match[1].trim(),
  };
}

function countPlaceholders(sql) {
  return (sql.match(/\?/g) || []).length;
}

function findIdParamIndex(sql) {
  const whereMatch = sql.match(/\bWHERE\b[\s\S]*?\bid\s*=\s*\?/i);
  if (!whereMatch) return -1;

  const questionPosition = whereMatch.index + whereMatch[0].lastIndexOf('?');
  return countPlaceholders(sql.slice(0, questionPosition));
}

function parseInsert(sql) {
  return sql.match(
    /^\s*INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)\s*$/i
  );
}

function normalizeIdentifier(identifier) {
  return identifier.replace(/`/g, '').trim();
}

function selectByIdSql(table, returning) {
  const columns = returning === '*' ? '*' : returning;
  return `SELECT ${columns} FROM ${table} WHERE id = ? LIMIT 1`;
}

async function executePrepared(executor, sql, params = []) {
  const [rows] = await executor.execute(sql, params);
  return toQueryResult(rows);
}

async function runInsertReturning(executor, sql, params, returning) {
  const insertMatch = parseInsert(sql);
  if (!insertMatch) {
    const result = await executePrepared(executor, sql, params);
    return result.rowCount > 0 ? result : { rows: [], rowCount: 0 };
  }

  const [, table, rawColumns, rawValues] = insertMatch;
  const columns = rawColumns.split(',').map(normalizeIdentifier);
  const idColumnIndex = columns.findIndex((column) => column.toLowerCase() === 'id');
  let nextSql = sql;
  let nextParams = params;
  let id = idColumnIndex >= 0 ? params[idColumnIndex] : crypto.randomUUID();

  if (idColumnIndex < 0) {
    nextSql = `INSERT INTO ${table} (id, ${rawColumns.trim()}) VALUES (?, ${rawValues.trim()})`;
    nextParams = [id, ...params];
  }

  const mutation = await executePrepared(executor, nextSql, nextParams);
  if (mutation.rowCount === 0) {
    return { rows: [], rowCount: 0 };
  }

  return executePrepared(executor, selectByIdSql(table, returning), [id]);
}

async function runUpdateReturning(executor, sql, params, returning) {
  const tableMatch = sql.match(/^\s*UPDATE\s+`?([a-zA-Z0-9_]+)`?/i);
  const idParamIndex = findIdParamIndex(sql);

  if (!tableMatch || idParamIndex < 0) {
    return executePrepared(executor, sql, params);
  }

  const id = params[idParamIndex];
  const mutation = await executePrepared(executor, sql, params);
  if (mutation.rowCount === 0) {
    return { rows: [], rowCount: 0 };
  }

  return executePrepared(executor, selectByIdSql(tableMatch[1], returning), [id]);
}

async function runDeleteReturning(executor, sql, params, returning) {
  const tableMatch = sql.match(/^\s*DELETE\s+FROM\s+`?([a-zA-Z0-9_]+)`?/i);
  const idParamIndex = findIdParamIndex(sql);

  if (!tableMatch || idParamIndex < 0) {
    return executePrepared(executor, sql, params);
  }

  const id = params[idParamIndex];
  const selected = await executePrepared(executor, selectByIdSql(tableMatch[1], returning), [id]);
  await executePrepared(executor, sql, params);
  return selected;
}

async function runReturningQuery(executor, sql, params, returning) {
  if (/^\s*INSERT\s+/i.test(sql)) {
    return runInsertReturning(executor, sql, params, returning);
  }

  if (/^\s*UPDATE\s+/i.test(sql)) {
    return runUpdateReturning(executor, sql, params, returning);
  }

  if (/^\s*DELETE\s+/i.test(sql)) {
    return runDeleteReturning(executor, sql, params, returning);
  }

  return executePrepared(executor, sql, params);
}

function splitAddColumnDefinitions(sql) {
  const match = sql.match(/^\s*ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+([\s\S]+)$/i);
  if (!match || !/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(match[2])) {
    return null;
  }

  const definitions = match[2]
    .split(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+/i)
    .slice(1)
    .map((definition) => definition.replace(/,\s*$/g, '').trim())
    .filter(Boolean);

  return {
    table: match[1],
    definitions,
  };
}

function getColumnName(columnDefinition) {
  const match = columnDefinition.match(/^`?([a-zA-Z0-9_]+)`?\s+/);
  return match?.[1];
}

async function columnExists(executor, table, column) {
  const [rows] = await executor.execute(
    'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function runEnsureColumns(executor, sql) {
  const parsed = splitAddColumnDefinitions(sql);
  if (!parsed) return null;

  let rowCount = 0;

  for (const definition of parsed.definitions) {
    const column = getColumnName(definition);
    if (!column) continue;

    if (await columnExists(executor, parsed.table, column)) {
      continue;
    }

    await executor.execute(`ALTER TABLE ${parsed.table} ADD COLUMN ${definition}`, []);
    rowCount += 1;
  }

  return { rows: [], rowCount };
}

function parseCreateIndex(sql) {
  return sql.match(
    /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?\s+ON\s+`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]+)\)\s*;?\s*$/i
  );
}

async function indexExists(executor, table, indexName) {
  const [rows] = await executor.execute(
    'SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
    [table, indexName]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function runEnsureIndex(executor, sql) {
  const match = parseCreateIndex(sql);
  if (!match) return null;

  const [, unique = '', indexName, table, columns] = match;
  if (await indexExists(executor, table, indexName)) {
    return { rows: [], rowCount: 0 };
  }

  await executor.execute(`CREATE ${unique || ''}INDEX ${indexName} ON ${table} (${columns.trim()})`, []);
  return { rows: [], rowCount: 1 };
}

function toQueryResult(mysqlRows) {
  if (Array.isArray(mysqlRows)) {
    return {
      rows: mysqlRows,
      rowCount: mysqlRows.length,
    };
  }

  return {
    rows: [],
    rowCount: mysqlRows?.affectedRows ?? mysqlRows?.changedRows ?? 0,
  };
}

async function runQuery(executor, sql, params = []) {
  const prepared = prepareQuery(sql, params);
  const ensureColumnsResult = await runEnsureColumns(executor, prepared.sql);
  if (ensureColumnsResult) return ensureColumnsResult;

  const ensureIndexResult = await runEnsureIndex(executor, prepared.sql);
  if (ensureIndexResult) return ensureIndexResult;

  const returning = splitReturning(prepared.sql);
  if (returning) {
    return runReturningQuery(executor, returning.sql, prepared.params, returning.returning);
  }

  return executePrepared(executor, prepared.sql, prepared.params);
}

const pool = {
  query(sql, params = []) {
    return runQuery(mysqlPool, sql, params);
  },

  async connect() {
    const connection = await mysqlPool.getConnection();

    return {
      query(sql, params = []) {
        return runQuery(connection, sql, params);
      },
      release() {
        connection.release();
      },
      connection,
    };
  },

  end() {
    return mysqlPool.end();
  },

  _mysqlPool: mysqlPool,
  _prepareQuery: prepareQuery,
};

async function logConnectionCheck() {
  if (!config.database) {
    console.error('[DATABASE.init] MYSQL_DATABASE ausente no ambiente');
    return;
  }

  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.info('[DATABASE.init] Conexão MySQL OK', {
      host: config.host,
      port: config.port,
      database: config.database,
      sslEnabled: Boolean(config.ssl),
      timestamp: result.rows[0]?.now,
    });
  } catch (error) {
    console.error('[DATABASE.init] Falha ao conectar no MySQL', {
      code: error?.code,
      message: error?.message,
    }, error);
  }
}

if (process.env.DATABASE_SKIP_INIT !== 'true') {
  logConnectionCheck();
}

module.exports = pool;
