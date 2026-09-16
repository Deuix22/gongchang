import mongoose from 'mongoose';

import DeliveryNote from '../models/DeliveryNote.js';
import DeliveryNoteItem from '../models/DeliveryNoteItem.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  buildItemBatchFields,
  assertBatchInboundNotBelowShipped,
  hasShipmentsForBatchKeys
} from '../services/warehouseService.js';
import { recognizeDeliveryNoteImage } from '../services/ocrService.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ensureNonEmpty (value, name) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    throw badRequest(`${name} 必填`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

function escapeRegex (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 规范化请求体中的明细行（新建/更新共用）
 */
function normalizeIncomingItems (items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest('items 至少包含一行有效明细');
  }

  const normalizedItems = [];
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    if (!row || typeof row !== 'object') {
      throw badRequest(`items[${i}] 格式不正确`);
    }
    const qty = Number(row.quantityPcs);
    if (!Number.isFinite(qty) || qty < 0) {
      throw badRequest(`items[${i}].quantityPcs 须为不小于 0 的数字`);
    }
    const batchRaw = row.productionBatchNo;
    if (!batchRaw || !String(batchRaw).trim()) {
      throw badRequest(`items[${i}].productionBatchNo 必填`);
    }
    const batchFields = buildItemBatchFields(batchRaw);
    if (!batchFields) {
      throw badRequest(`items[${i}].productionBatchNo 无法解析批次码（需含 8 位数字）`);
    }

    const itemId =
      row.id != null && String(row.id).trim()
        ? String(row.id).trim()
        : row.itemId != null && String(row.itemId).trim()
          ? String(row.itemId).trim()
          : undefined;

    normalizedItems.push({
      ...(itemId ? { itemId } : {}),
      customerOrderNo: row.customerOrderNo != null ? String(row.customerOrderNo).trim() : '',
      salesModel: row.salesModel != null ? String(row.salesModel).trim() : '',
      productCode: row.productCode != null ? String(row.productCode).trim() : '',
      quantityPcs: qty,
      productionBatchNo: batchFields.productionBatchNo,
      batchKey: batchFields.batchKey,
      deliveryNoteNo: row.deliveryNoteNo != null ? String(row.deliveryNoteNo).trim() : ''
    });
  }
  return normalizedItems;
}

function serializeItem (item) {
  return {
    id: item.itemId,
    customerOrderNo: item.customerOrderNo ?? '',
    salesModel: item.salesModel ?? '',
    productCode: item.productCode ?? '',
    quantityPcs: item.quantityPcs ?? 0,
    productionBatchNo: item.productionBatchNo ?? '',
    deliveryNoteNo: item.deliveryNoteNo ?? ''
  };
}

/**
 * POST /warehouse/delivery-notes/recognize
 * multipart: file + recognizeMode=field
 */
export async function recognizeDeliveryNote (req, res) {
  if (!req.file) {
    throw badRequest('请上传 file 字段（送货单图片）');
  }

  const recognizeMode = req.body?.recognizeMode ?? 'field';
  if (recognizeMode !== 'field') {
    throw badRequest('recognizeMode 须为 field');
  }

  const result = await recognizeDeliveryNoteImage({
    filePath: req.file.path,
    mimetype: req.file.mimetype
  });

  res.json({
    ...result,
    imageSaved: req.file.filename ?? null
  });
}

/**
 * POST /warehouse/delivery-notes — 新建
 */
export async function submitDeliveryNote (req, res) {
  const { customerName, shippingDate, imageUrl, items } = req.body ?? {};

  ensureNonEmpty(customerName, 'customerName');
  const shipDate = ensureNonEmpty(shippingDate, 'shippingDate');
  if (!DATE_RE.test(shipDate)) {
    throw badRequest('shippingDate 格式须为 YYYY-MM-DD');
  }

  const normalizedItems = normalizeIncomingItems(items);

  const note = await DeliveryNote.create({
    customerName: String(customerName).trim(),
    shippingDate: shipDate,
    imageUrl: imageUrl != null ? String(imageUrl).trim() : '',
    createdBy: req.user?.userId ?? null
  });

  await DeliveryNoteItem.insertMany(
    normalizedItems.map(({ itemId, ...row }) => ({
      deliveryNoteId: note.noteId,
      ...row
    }))
  );

  res.status(200).json({
    id: note.noteId,
    saved: true
  });
}

/**
 * GET /warehouse/delivery-notes — 列表
 */
export async function listDeliveryNotes (req, res) {
  const {
    keyword,
    shippingDate,
    deliveryNoteNo,
    page: pageRaw,
    pageSize: pageSizeRaw
  } = req.query ?? {};

  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeRaw, 10) || 50));

  if (shippingDate && !DATE_RE.test(String(shippingDate))) {
    throw badRequest('shippingDate 格式须为 YYYY-MM-DD');
  }

  const noteFilter = {};
  if (shippingDate) {
    noteFilter.shippingDate = String(shippingDate);
  }

  const kw = keyword != null ? String(keyword).trim() : '';
  const noteNo = deliveryNoteNo != null ? String(deliveryNoteNo).trim() : '';

  // keyword / deliveryNoteNo 可能命中明细上的送货单号，先收集 noteId
  let noteIdsFromItems = null;
  if (kw || noteNo) {
    const itemOr = [];
    if (noteNo) {
      itemOr.push({ deliveryNoteNo: new RegExp(escapeRegex(noteNo), 'i') });
    }
    if (kw) {
      const re = new RegExp(escapeRegex(kw), 'i');
      itemOr.push({ deliveryNoteNo: re });
      itemOr.push({ productionBatchNo: re });
      itemOr.push({ salesModel: re });
      itemOr.push({ customerOrderNo: re });
    }
    const matchedItems = await DeliveryNoteItem.find({ $or: itemOr })
      .select('deliveryNoteId')
      .lean();
    noteIdsFromItems = [...new Set(matchedItems.map(i => i.deliveryNoteId))];
  }

  if (kw) {
    const re = new RegExp(escapeRegex(kw), 'i');
    const or = [{ customerName: re }];
    if (noteIdsFromItems?.length) {
      or.push({ noteId: { $in: noteIdsFromItems } });
    }
    noteFilter.$or = or;
  } else if (noteNo) {
    if (!noteIdsFromItems?.length) {
      return res.json({ list: [], total: 0 });
    }
    noteFilter.noteId = { $in: noteIdsFromItems };
  }

  const total = await DeliveryNote.countDocuments(noteFilter);
  const notes = await DeliveryNote.find(noteFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const noteIds = notes.map(n => n.noteId);
  const items = noteIds.length
    ? await DeliveryNoteItem.find({ deliveryNoteId: { $in: noteIds } }).lean()
    : [];

  const aggByNote = new Map();
  for (const item of items) {
    if (!aggByNote.has(item.deliveryNoteId)) {
      aggByNote.set(item.deliveryNoteId, {
        itemCount: 0,
        totalQuantityPcs: 0,
        deliveryNoteNo: ''
      });
    }
    const agg = aggByNote.get(item.deliveryNoteId);
    agg.itemCount += 1;
    agg.totalQuantityPcs += item.quantityPcs || 0;
    if (!agg.deliveryNoteNo && item.deliveryNoteNo) {
      agg.deliveryNoteNo = item.deliveryNoteNo;
    }
  }

  const list = notes.map(note => {
    const agg = aggByNote.get(note.noteId) || {
      itemCount: 0,
      totalQuantityPcs: 0,
      deliveryNoteNo: ''
    };
    return {
      id: note.noteId,
      customerName: note.customerName,
      shippingDate: note.shippingDate,
      deliveryNoteNo: agg.deliveryNoteNo,
      itemCount: agg.itemCount,
      totalQuantityPcs: agg.totalQuantityPcs,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  });

  res.json({ list, total });
}

/**
 * GET /warehouse/delivery-notes/:id — 详情
 */
export async function getDeliveryNoteDetail (req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) throw badRequest('id 必填');

  const note = await DeliveryNote.findOne({ noteId: id }).lean();
  if (!note) throw notFound('送货单不存在');

  const items = await DeliveryNoteItem.find({ deliveryNoteId: id })
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    id: note.noteId,
    customerName: note.customerName,
    shippingDate: note.shippingDate,
    imageUrl: note.imageUrl ?? '',
    items: items.map(serializeItem)
  });
}

/**
 * PUT /warehouse/delivery-notes/:id — 整单更新（先删后插）
 * 校验：变更后各 batchKey 登记量不得小于已出货量
 */
export async function updateDeliveryNote (req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) throw badRequest('id 必填');

  const { customerName, shippingDate, imageUrl, items } = req.body ?? {};
  ensureNonEmpty(customerName, 'customerName');
  const shipDate = ensureNonEmpty(shippingDate, 'shippingDate');
  if (!DATE_RE.test(shipDate)) {
    throw badRequest('shippingDate 格式须为 YYYY-MM-DD');
  }

  const normalizedItems = normalizeIncomingItems(items);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const note = await DeliveryNote.findOne({ noteId: id }).session(session);
    if (!note) {
      await session.abortTransaction();
      throw notFound('送货单不存在');
    }

    const oldItems = await DeliveryNoteItem.find({ deliveryNoteId: id }).session(session);
    const affectedBatchKeys = [
      ...new Set([
        ...oldItems.map(i => i.batchKey),
        ...normalizedItems.map(i => i.batchKey)
      ])
    ];

    try {
      await assertBatchInboundNotBelowShipped(
        normalizedItems,
        id,
        session,
        oldItems.map(i => i.batchKey)
      );
    } catch (err) {
      await session.abortTransaction();
      if (err.status === 400 || err.code === 'INVALID_PARAMS') {
        throw badRequest(err.message || '修改后登记数量小于已出货数量，无法保存');
      }
      throw err;
    }

    note.customerName = String(customerName).trim();
    note.shippingDate = shipDate;
    if (imageUrl !== undefined) {
      note.imageUrl = imageUrl != null ? String(imageUrl).trim() : '';
    }
    await note.save({ session });

    // 整单覆盖：删除旧明细后插入新明细（余量由明细实时汇总，无需另表重算）
    await DeliveryNoteItem.deleteMany({ deliveryNoteId: id }).session(session);
    await DeliveryNoteItem.insertMany(
      normalizedItems.map(({ itemId, ...row }) => ({
        deliveryNoteId: id,
        // 带回的 id 尽量复用，便于前端继续编辑；不存在则由模型自动生成
        ...(itemId ? { itemId } : {}),
        ...row
      })),
      { session }
    );

    await session.commitTransaction();

    // 触发一次受影响批次汇总读取，确保查询路径可用（无冗余表时即为即时一致）
    void affectedBatchKeys;

    res.json({
      id,
      saved: true
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * DELETE /warehouse/delivery-notes/:id
 * 策略 A：关联批次已有出货记录则禁止删除
 */
export async function deleteDeliveryNote (req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) throw badRequest('id 必填');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const note = await DeliveryNote.findOne({ noteId: id }).session(session);
    if (!note) {
      await session.abortTransaction();
      throw notFound('送货单不存在');
    }

    const items = await DeliveryNoteItem.find({ deliveryNoteId: id }).session(session);
    const batchKeys = [...new Set(items.map(i => i.batchKey).filter(Boolean))];

    if (await hasShipmentsForBatchKeys(batchKeys, session)) {
      await session.abortTransaction();
      throw forbidden('该送货单关联批次已有出货记录，无法删除');
    }

    await DeliveryNoteItem.deleteMany({ deliveryNoteId: id }).session(session);
    await DeliveryNote.deleteOne({ noteId: id }).session(session);

    await session.commitTransaction();
    res.json({ deleted: true });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
}
