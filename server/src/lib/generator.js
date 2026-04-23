import crypto from 'crypto';

/**
 * ハイフンのない UUIDv4 を生成
 * @returns {string} ハイフンのない UUIDv4
 */
export function uuid() {
  const uuid = crypto.randomUUID().replace(/-/g, ''); // ハイフンを削除して短縮
  return uuid;
}

export default { uuid };
