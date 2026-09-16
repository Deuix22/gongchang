/**
 * Reel ID：用 @ 分隔恰好 7 段
 * 例：260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52
 */

export function normalizeRawCode (rawCode) {
  if (rawCode == null) return '';
  return String(rawCode).trim().replace(/\s+/g, '');
}

/**
 * 解析并校验 Reel ID。成功返回各段；失败返回 { error }。
 */
export function parseReelId (rawCode) {
  const raw = normalizeRawCode(rawCode);
  if (!raw) {
    return { error: 'rawCode 必填' };
  }

  const parts = raw.split('@');
  if (parts.length !== 7) {
    return { error: `Reel ID 须恰好 7 段（用 @ 分隔），当前 ${parts.length} 段` };
  }

  const [
    materialBaseCode,
    partNumber,
    versionCode,
    versionDesc,
    designCode,
    lotNumber,
    qtyRaw
  ] = parts.map(p => String(p ?? '').trim());

  if (!materialBaseCode) return { error: 'materialBaseCode（段1）不能为空' };
  if (!partNumber) return { error: 'partNumber（段2）不能为空' };
  if (!versionCode) return { error: 'versionCode（段3）不能为空' };
  if (!versionDesc) return { error: 'versionDesc（段4）不能为空' };
  if (!designCode) return { error: 'designCode（段5）不能为空' };
  if (!lotNumber) return { error: 'lotNumber（段6）不能为空' };

  if (!/^\d+$/.test(qtyRaw)) {
    return { error: 'quantityPcs（段7）须为正整数' };
  }
  const quantityPcs = Number(qtyRaw);
  if (!Number.isInteger(quantityPcs) || quantityPcs <= 0) {
    return { error: 'quantityPcs（段7）须为正整数' };
  }

  return {
    rawCode: raw,
    materialBaseCode,
    partNumber,
    versionCode,
    versionDesc,
    designCode,
    lotNumber,
    quantityPcs
  };
}

/**
 * 校验请求体字段与 rawCode 解析结果一致（防客户端篡改）。
 * 返回规范化后的入库载荷，或 { error }。
 */
export function validateInboundPayload (body = {}) {
  if (body.quantityPcs != null && body.quantityPcs !== '') {
    const qty = Number(body.quantityPcs);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { error: 'quantityPcs 须为正整数' };
    }
  }

  const parsed = parseReelId(body.rawCode);
  if (parsed.error) return parsed;

  const ensureMatch = (field, expected) => {
    if (body[field] == null || String(body[field]).trim() === '') {
      return `${field} 必填`;
    }
    const actual = field === 'quantityPcs'
      ? Number(body[field])
      : String(body[field]).trim();
    if (actual !== expected) {
      return `${field} 与 rawCode 解析结果不一致`;
    }
    return null;
  };

  for (const field of [
    'materialBaseCode',
    'partNumber',
    'versionCode',
    'versionDesc',
    'designCode',
    'lotNumber',
    'quantityPcs'
  ]) {
    const err = ensureMatch(field, parsed[field]);
    if (err) return { error: err };
  }

  return parsed;
}
