/**
 * ISO 8601 形式の日時を MySQL の DATETIME 形式に変換する
 * @param {string} from ISODateTime 形式の文字列
 * @returns {string} MySQL DATETIME 形式の文字列
 */
export function toMySQLDateTime(from) {
  const pad = (num) => String(num).padStart(2, '0');
  
  const date = new Date(from);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${from}`);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default {
  toMySQLDateTime,
}
