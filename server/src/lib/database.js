import mysql from 'mysql2/promise';

const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT) || 10;
const DB_QUEUE_LIMIT = Number(process.env.DB_QUEUE_LIMIT) || 0;
const DB_ENABLE_KEEP_ALIVE = process.env.DB_ENABLE_KEEP_ALIVE === 'true';
const DB_KEEP_ALIVE_INITIAL_DELAY = Number(process.env.DB_KEEP_ALIVE_INITIAL_DELAY) || 0;
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_NAME = process.env.DB_NAME || 'app_database';

let defaultPool;

export function getPool() {
  if (!defaultPool) {
    defaultPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: DB_CONNECTION_LIMIT,
      queueLimit: DB_QUEUE_LIMIT,
      enableKeepAlive: DB_ENABLE_KEEP_ALIVE,
      keepAliveInitialDelay: DB_KEEP_ALIVE_INITIAL_DELAY,
      waitForConnections: true,
      namedPlaceholders: true,
    });
  }

  return defaultPool;
}

export async function getConnection() {
  const pool = getPool();
  return await pool.getConnection();
}

/**
 * SQL をそのまま実行する（プリペアードステートメントなし）
 * @param {string} query SQL クエリ
 * @param {Array|object} params プレースホルダに対応する値の配列
 * @returns 結果の行の配列
 */
export async function query(query, params = []) {
  console.log('=> Executing Query:', query, '\n-> With Params:     ', params);
  const [rows] = await getPool().query(query, params);
  return rows;
}

/**
 * SQL を安全に実行する（プリペアードステートメントあり）
 * @param {string} query SQL クエリ
 * @param {Array|object} params プレースホルダに対応する値の配列
 * @returns 結果の行の配列
 */
export async function execute(query, params = []) {
  console.log('=> Executing Query:', query, '\n-> With Params:     ', params);
  const [rows] = await getPool().execute(query, params);
  return rows;
}

export async function closePool() {
  if (!defaultPool) {
    return;
  }

  await defaultPool.end();
  defaultPool = undefined;
}

export default {
  getPool,
  getConnection,
  query,
  execute,
  closePool,
};
