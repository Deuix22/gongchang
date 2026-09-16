/** 生产批号前缀 GR-HFYZBU + 8 位数字 + 可选后缀(01H/02B 等) */
const PRODUCTION_BATCH_PREFIX = 'GR-HFYZBU';

/** 箱单号前缀 HFSYHFYZBU + 8 位批次 + 6 位流水 */
const BOX_NO_PREFIX = 'HFSYHFYZBU';

/**
 * 规范化完整箱单号：去空格、转大写、去掉连字符。
 * 空输入返回空串（调用方据此跳过箱单唯一校验）。
 */
export function normalizeBoxNo (boxNo) {
  if (boxNo == null) return '';
  const s = String(boxNo).trim();
  if (!s) return '';
  return s.toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * 从箱单号解析 8 位 batchKey
 * 格式：HFSYHFYZBU + 8位数字 + 可选后缀 + 6位流水号
 */
export function extractBatchKeyFromBoxNo (boxNo) {
  const s = normalizeBoxNo(boxNo);
  if (!s) return null;
  const strict = s.match(new RegExp(`^${BOX_NO_PREFIX}(\\d{8})\\d{6}$`));
  if (strict) return strict[1];
  const loose = s.match(new RegExp(`${BOX_NO_PREFIX}(\\d{8})`));
  if (loose) return loose[1];
  return null;
}

/**
 * 从生产批号解析 8 位 batchKey
 * 支持：GR-HFYZBU26070236、GR-HFYZBU2603014502B（后缀不影响前 8 位）
 */
export function extractBatchKeyFromProductionBatchNo (productionBatchNo) {
  if (!productionBatchNo) return null;
  const s = String(productionBatchNo).trim().toUpperCase();
  // 优先：前缀后的前 8 位数字（不要用末尾 8 位，后缀里可能含数字）
  const withPrefix = s.match(new RegExp(`^${PRODUCTION_BATCH_PREFIX}(\\d{8})`));
  if (withPrefix) return withPrefix[1];
  // 无前缀：取首次出现的 8 位数字
  const any = s.match(/(\d{8})/);
  return any ? any[1] : null;
}

/**
 * 规范化为 GR-HFYZBU{batchKey}（不含后缀；仅用于需要标准批号键的场景）
 */
export function normalizeProductionBatchNo (batchKeyOrBatchNo) {
  if (!batchKeyOrBatchNo) return null;
  const key = extractBatchKeyFromProductionBatchNo(batchKeyOrBatchNo) || (() => {
    const digits = String(batchKeyOrBatchNo).replace(/\D/g, '');
    return digits.length >= 8 ? digits.slice(0, 8) : null;
  })();
  if (!key || !/^\d{8}$/.test(key)) return null;
  return `${PRODUCTION_BATCH_PREFIX}${key}`;
}

/**
 * 保留完整生产批号（含 01H/02B 等后缀）；仅补全缺失前缀
 */
export function preserveProductionBatchNo (raw) {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (s.startsWith(PRODUCTION_BATCH_PREFIX)) return s;
  const key = extractBatchKeyFromProductionBatchNo(s);
  if (!key) return s;
  // 尝试保留 8 位后的后缀
  const idx = s.indexOf(key);
  const suffix = idx >= 0 ? s.slice(idx + 8) : '';
  return `${PRODUCTION_BATCH_PREFIX}${key}${suffix}`;
}

/**
 * 解析 lookup 用的 batchKey（优先 boxNo，其次 batchKey 参数，再次 productionBatchNo）
 */
export function resolveBatchKey ({ boxNo, batchKey, productionBatchNo }) {
  if (boxNo) {
    const fromBox = extractBatchKeyFromBoxNo(boxNo);
    if (fromBox) return fromBox;
  }
  if (batchKey) {
    const digits = String(batchKey).replace(/\D/g, '');
    if (digits.length >= 8) return digits.slice(0, 8);
  }
  if (productionBatchNo) {
    return extractBatchKeyFromProductionBatchNo(productionBatchNo);
  }
  return null;
}

export { PRODUCTION_BATCH_PREFIX, BOX_NO_PREFIX };
