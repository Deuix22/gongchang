import DeliveryNote from '../models/DeliveryNote.js';
import DeliveryNoteItem from '../models/DeliveryNoteItem.js';
import WarehouseShipment from '../models/WarehouseShipment.js';
import {
  extractBatchKeyFromProductionBatchNo,
  normalizeBoxNo,
  preserveProductionBatchNo
} from '../utils/warehouse/boxCodeParser.js';

export async function getBatchQuantitySummary (batchKey) {
  const items = await DeliveryNoteItem.find({ batchKey }).lean();
  const totalQuantityPcs = items.reduce((sum, row) => sum + (row.quantityPcs || 0), 0);
  const shipments = await WarehouseShipment.find({ batchKey }).lean();
  const shippedQuantityPcs = shipments.reduce((sum, row) => sum + (row.quantityPcs || 0), 0);
  const remainingQuantityPcs = Math.max(0, totalQuantityPcs - shippedQuantityPcs);
  return { items, totalQuantityPcs, shippedQuantityPcs, remainingQuantityPcs };
}

export async function getPrimaryItemWithNote (batchKey) {
  const item = await DeliveryNoteItem.findOne({ batchKey }).sort({ createdAt: 1 }).lean();
  if (!item) return null;
  const note = await DeliveryNote.findOne({ noteId: item.deliveryNoteId }).lean();
  return { item, note };
}

/**
 * 按规范化后的完整箱单号查找已出货记录；空箱单号返回 null（不做唯一校验）
 */
export async function findShipmentByBoxNo (boxNo, session = null) {
  const normalized = normalizeBoxNo(boxNo);
  if (!normalized) return null;
  const q = WarehouseShipment.findOne({ boxNo: normalized });
  if (session) q.session(session);
  return q.lean();
}

/**
 * 解析生产批号：batchKey=前8位；productionBatchNo 保留完整原文（含后缀）
 */
export function buildItemBatchFields (productionBatchNo) {
  const raw = String(productionBatchNo ?? '').trim();
  if (!raw) return null;
  const batchKey = extractBatchKeyFromProductionBatchNo(raw);
  if (!batchKey) {
    // 兜底：至少 8 位数字
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8) return null;
    const key = digits.slice(0, 8);
    return {
      batchKey: key,
      productionBatchNo: preserveProductionBatchNo(raw) || raw.toUpperCase()
    };
  }
  return {
    batchKey,
    productionBatchNo: preserveProductionBatchNo(raw) || raw.toUpperCase()
  };
}

export function getBusinessDayRange () {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * 按 batchKey 汇总已出货量
 * @returns {Map<string, number>}
 */
export async function getShippedQuantityMap (batchKeys, session = null) {
  const keys = [...new Set((batchKeys || []).filter(Boolean))];
  const map = new Map(keys.map(k => [k, 0]));
  if (!keys.length) return map;

  let query = WarehouseShipment.aggregate([
    { $match: { batchKey: { $in: keys } } },
    { $group: { _id: '$batchKey', sum: { $sum: '$quantityPcs' } } }
  ]);
  if (session) query = query.session(session);
  const rows = await query;
  for (const row of rows) {
    map.set(row._id, row.sum || 0);
  }
  return map;
}

/**
 * 是否存在任一 batchKey 的出货记录（删除策略 A）
 */
export async function hasShipmentsForBatchKeys (batchKeys, session = null) {
  const keys = [...new Set((batchKeys || []).filter(Boolean))];
  if (!keys.length) return false;
  const q = WarehouseShipment.findOne({ batchKey: { $in: keys } }).select('_id');
  if (session) q.session(session);
  const found = await q.lean();
  return Boolean(found);
}

/**
 * 汇总「排除某送货单后」各 batchKey 的登记量
 * @returns {Map<string, number>}
 */
export async function getInboundQuantityMapExcludingNote (batchKeys, excludeNoteId, session = null) {
  const keys = [...new Set((batchKeys || []).filter(Boolean))];
  const map = new Map(keys.map(k => [k, 0]));
  if (!keys.length) return map;

  const match = {
    batchKey: { $in: keys },
    ...(excludeNoteId ? { deliveryNoteId: { $ne: excludeNoteId } } : {})
  };
  let query = DeliveryNoteItem.aggregate([
    { $match: match },
    { $group: { _id: '$batchKey', sum: { $sum: '$quantityPcs' } } }
  ]);
  if (session) query = query.session(session);
  const rows = await query;
  for (const row of rows) {
    map.set(row._id, row.sum || 0);
  }
  return map;
}

/**
 * 校验变更后各批次：登记总量 >= 已出货量
 * @param {Array<{batchKey:string, quantityPcs:number}>} nextItems 本单即将写入的明细
 * @param {string} noteId 当前送货单 ID
 * @param {string[]} [extraBatchKeys] 旧明细中可能被移除的批次，也需校验
 */
export async function assertBatchInboundNotBelowShipped (
  nextItems,
  noteId,
  session = null,
  extraBatchKeys = []
) {
  const batchKeys = [
    ...new Set([
      ...nextItems.map(i => i.batchKey).filter(Boolean),
      ...(extraBatchKeys || []).filter(Boolean)
    ])
  ];
  if (!batchKeys.length) return;

  const [inboundMap, shippedMap] = await Promise.all([
    getInboundQuantityMapExcludingNote(batchKeys, noteId, session),
    getShippedQuantityMap(batchKeys, session)
  ]);

  for (const item of nextItems) {
    inboundMap.set(
      item.batchKey,
      (inboundMap.get(item.batchKey) || 0) + (item.quantityPcs || 0)
    );
  }

  for (const batchKey of batchKeys) {
    const inbound = inboundMap.get(batchKey) || 0;
    const shipped = shippedMap.get(batchKey) || 0;
    if (inbound < shipped) {
      const err = new Error(
        `修改后登记数量小于已出货数量，无法保存（批次 ${batchKey}：登记 ${inbound} < 已出 ${shipped}）`
      );
      err.code = 'INVALID_PARAMS';
      err.status = 400;
      throw err;
    }
  }
}
