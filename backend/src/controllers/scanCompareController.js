import mongoose from 'mongoose';

import DeliveryNoteItem from '../models/DeliveryNoteItem.js';
import WarehouseShipment from '../models/WarehouseShipment.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import {
  findShipmentByBoxNo,
  getBatchQuantitySummary,
  getPrimaryItemWithNote
} from '../services/warehouseService.js';
import {
  normalizeBoxNo,
  normalizeProductionBatchNo,
  resolveBatchKey
} from '../utils/warehouse/boxCodeParser.js';

function throwBoxAlreadyShipped (boxNo, shipment) {
  throw conflict(
    '该箱单已出货，不能重复扫描',
    {
      boxNo,
      shippedAt: shipment?.createdAt ?? null,
      quantityPcs: shipment?.quantityPcs ?? null,
      operatorId: shipment?.operatorId ?? null
    },
    'BOX_ALREADY_SHIPPED'
  );
}

function isBoxNoDuplicateKeyError (err) {
  const items = [
    err,
    err?.cause,
    ...(Array.isArray(err?.writeErrors) ? err.writeErrors : [])
  ].filter(Boolean);
  for (const item of items) {
    if (item.code !== 11000) continue;
    const keyPattern = item.keyPattern || {};
    const keyValue = item.keyValue || {};
    if (Object.prototype.hasOwnProperty.call(keyPattern, 'boxNo')) return true;
    if (Object.prototype.hasOwnProperty.call(keyValue, 'boxNo')) return true;
    const msg = String(item.message || item.errmsg || '');
    if (/boxNo|uk_warehouse_shipments_box_no/i.test(msg)) return true;
  }
  return false;
}

export async function lookupScanCompare (req, res) {
  const { boxNo, batchKey: batchKeyParam } = req.query ?? {};
  if (!boxNo && !batchKeyParam) {
    throw badRequest('请提供 boxNo 或 batchKey');
  }

  const normalizedBoxNo = normalizeBoxNo(boxNo);
  const batchKey = resolveBatchKey({
    boxNo: normalizedBoxNo || boxNo,
    batchKey: batchKeyParam
  });
  if (!batchKey) {
    return res.json({
      matched: false,
      message: '箱单号或批次码格式不正确，无法解析'
    });
  }

  const primary = await getPrimaryItemWithNote(batchKey);
  if (!primary) {
    return res.json({
      matched: false,
      message: '该箱单对应批次未在送货单中登记，不允许出货'
    });
  }

  const { item, note } = primary;
  const { totalQuantityPcs, shippedQuantityPcs, remainingQuantityPcs } =
    await getBatchQuantitySummary(batchKey);

  const payload = {
    matched: true,
    batchKey,
    productionBatchNo: normalizeProductionBatchNo(batchKey) || item.productionBatchNo,
    customerName: note?.customerName ?? '',
    shippingDate: note?.shippingDate ?? '',
    customerOrderNo: item.customerOrderNo,
    salesModel: item.salesModel,
    productCode: item.productCode,
    deliveryNoteNo: item.deliveryNoteNo,
    totalQuantityPcs,
    shippedQuantityPcs,
    remainingQuantityPcs
  };

  if (normalizedBoxNo) {
    const existingBox = await findShipmentByBoxNo(normalizedBoxNo);
    payload.boxAlreadyShipped = Boolean(existingBox);
    if (existingBox) {
      payload.boxShippedAt = existingBox.createdAt;
    }
  }

  res.json(payload);
}

export async function confirmShip (req, res) {
  const { boxNo, batchKey: batchKeyParam, productionBatchNo, quantityPcs } = req.body ?? {};

  const normalizedBoxNo = normalizeBoxNo(boxNo);
  const batchKey = resolveBatchKey({
    boxNo: normalizedBoxNo || boxNo,
    batchKey: batchKeyParam,
    productionBatchNo
  });
  if (!batchKey) {
    throw badRequest('无法解析 batchKey，请检查 boxNo / batchKey / productionBatchNo');
  }

  const qty = Number(quantityPcs);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw badRequest('quantityPcs 须为正数');
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (normalizedBoxNo) {
      const existingBox = await findShipmentByBoxNo(normalizedBoxNo, session);
      if (existingBox) {
        throwBoxAlreadyShipped(normalizedBoxNo, existingBox);
      }
    }

    const items = await DeliveryNoteItem.find({ batchKey }).session(session);
    if (!items.length) {
      throw notFound('该批次未在送货单中登记，不允许出货');
    }

    const totalQuantityPcs = items.reduce((s, i) => s + (i.quantityPcs || 0), 0);
    const existingShipped = await WarehouseShipment.aggregate([
      { $match: { batchKey } },
      { $group: { _id: null, sum: { $sum: '$quantityPcs' } } }
    ]).session(session);
    const shippedQuantityPcs = existingShipped[0]?.sum ?? 0;
    const remainingQuantityPcs = totalQuantityPcs - shippedQuantityPcs;

    if (qty > remainingQuantityPcs) {
      throw badRequest(`出货数量不能超过剩余数量（剩余 ${remainingQuantityPcs} PCS）`);
    }

    const primaryItem = items[0];
    await WarehouseShipment.create(
      [
        {
          boxNo: normalizedBoxNo,
          batchKey,
          productionBatchNo:
            productionBatchNo != null
              ? String(productionBatchNo).trim()
              : normalizeProductionBatchNo(batchKey) || primaryItem.productionBatchNo,
          quantityPcs: qty,
          deliveryNoteItemId: primaryItem.itemId,
          operatorId: req.user?.userId ?? null
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const newShipped = shippedQuantityPcs + qty;
    res.json({
      success: true,
      shippedQuantityPcs: newShipped,
      remainingQuantityPcs: totalQuantityPcs - newShipped
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (normalizedBoxNo && isBoxNoDuplicateKeyError(err)) {
      const existingBox = await findShipmentByBoxNo(normalizedBoxNo);
      throwBoxAlreadyShipped(normalizedBoxNo, existingBox);
    }
    throw err;
  } finally {
    session.endSession();
  }
}
